/* =========================================================
   Alongamento — falas.js
   Voz gravada: audio/<id>.mp3, com o texto em audio/falas.json.

     Falas   a lista do falas.json (texto e duração de cada id)
     Fala    o tocador: uma fala por vez, legenda, pausa,
             pré-carregamento e reserva na voz do aparelho
     Baixar  guarda todos os áudios no aparelho pra usar sem internet

   Regras do tocador:
     tipo 'fala'   corta o que estiver tocando
     tipo 'extra'  espera a fala atual acabar (até 6 s); se demorar, desiste
     tipo 'deixa'  se já tem fala tocando, não toca
   ========================================================= */
'use strict';

const CACHE_AUDIO = 'alongamento-audio-v1';
const urlAudio = (id) => `audio/${encodeURIComponent(id)}.mp3`;

/* ---------- Falas: os dados ---------- */

const Falas = {
  lista: [],
  porId: new Map(),
  carregado: false,
  ultimoSorteio: {},

  async carregar() {
    try {
      const resposta = await fetch('audio/falas.json');
      if (!resposta.ok) throw new Error('sem falas.json');
      const lista = await resposta.json();
      this.lista = Array.isArray(lista) ? lista : [];
      this.porId = new Map(this.lista.map((f) => [f.id, f]));
      this.carregado = true;
    } catch (e) {
      this.carregado = false; // segue com a voz do aparelho lendo os textos da rotina
    }
    UIInicio.atualizarDuracoes();
  },

  tem(id) { return !!id && this.porId.has(id); },
  texto(id) { const f = this.porId.get(id); return f ? f.texto : ''; },
  duracao(id) { const f = this.porId.get(id); return f ? Number(f.duracao) || 0 : 0; },

  // uma das versões de uma deixa (entra-1..3), sem repetir a última
  sortear(base) {
    const opcoes = [1, 2, 3].map((n) => `${base}-${n}`).filter((id) => this.tem(id));
    if (!opcoes.length) return this.tem(base) ? base : null;
    const livres = opcoes.length > 1 ? opcoes.filter((id) => id !== this.ultimoSorteio[base]) : opcoes;
    const id = livres[Math.floor(Math.random() * livres.length)];
    this.ultimoSorteio[base] = id;
    return id;
  },

  idsDeixas() {
    return this.lista.filter((f) => f.tipo === 'deixa').map((f) => f.id);
  }
};

/* ---------- legenda: um pedaço do texto por vez, no ritmo da fala ---------- */

const Legenda = {
  pedacos: [],
  marcos: [],
  atual: -1,

  // quebra nas pausas ("...", ponto, interrogação) e junta pedaços curtos
  preparar(texto) {
    const brutos = (texto || '').replace(/([.!?…])\s+/g, '$1\n').split('\n').map((s) => s.trim()).filter(Boolean);
    const pedacos = [];
    brutos.forEach((p) => {
      const ultimo = pedacos[pedacos.length - 1];
      if (ultimo && (ultimo.length < 28 || p.length < 14) && ultimo.length + p.length < 90) {
        pedacos[pedacos.length - 1] = `${ultimo} ${p}`;
      } else {
        pedacos.push(p);
      }
    });
    const total = pedacos.reduce((s, p) => s + p.length, 0) || 1;
    let soma = 0;
    this.marcos = pedacos.map((p) => { const ini = soma / total; soma += p.length; return ini; });
    this.pedacos = pedacos;
    this.atual = -1;
  },

  // p = fração já falada (0 a 1)
  mostrar(p) {
    let i = 0;
    while (i + 1 < this.marcos.length && p >= this.marcos[i + 1]) i++;
    if (i === this.atual) return;
    this.atual = i;
    this.escrever(this.pedacos[i] || '');
  },

  escrever(texto) {
    document.querySelectorAll('.legenda').forEach((el) => { el.textContent = texto; });
  },

  limpar() {
    this.pedacos = [];
    this.marcos = [];
    this.atual = -1;
    this.escrever('');
  }
};

/* ---------- Fala: o tocador ---------- */

// meio segundo de silêncio em WAV, pra destravar o <audio> no primeiro toque (iPhone)
function wavSilencio() {
  const n = 4000;
  const bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const escrever = (pos, txt) => { for (let i = 0; i < txt.length; i++) bytes[pos + i] = txt.charCodeAt(i); };
  escrever(0, 'RIFF'); v.setUint32(4, 36 + n, true); escrever(8, 'WAVE');
  escrever(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  escrever(36, 'data'); v.setUint32(40, n, true);
  bytes.fill(128, 44);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return `data:audio/wav;base64,${btoa(bin)}`;
}

const Fala = {
  el: null,
  atual: null,     // { id, tipo, texto, modo: 'audio'|'tts'|'mudo', ativo, pausado, aoAcabar, ... }
  fila: [],        // 'extras' esperando a vez
  blobs: new Map(), // id -> Promise<url de objeto | null>, do mais velho pro mais novo
  fixos: new Set(), // ids que não saem do pré-carregamento (deixas, aterrar)
  destravado: false,
  relogioId: 0,
  volumeFixo: false, // iPhone: o volume do <audio> não muda por código

  modo() { return Ajustes.dados.modoVoz; },

  criarElemento() {
    if (this.el) return this.el;
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.setAttribute('playsinline', '');
    this.el.volume = Ajustes.dados.volumeVoz;
    return this.el;
  },

  // chamar dentro de um toque: o iPhone só deixa o <audio> tocar sozinho depois disso
  destravar() {
    if (this.destravado || (this.atual && this.atual.ativo)) return;
    const el = this.criarElemento();
    try {
      el.src = wavSilencio();
      el.muted = true;
      const p = el.play();
      const ok = () => {
        if (this.atual && this.atual.ativo) return;
        el.pause();
        el.muted = false;
        this.destravado = true;
      };
      if (p && p.then) p.then(ok).catch(() => { el.muted = false; });
      else ok();
    } catch (e) { el.muted = false; }
  },

  // baixa o mp3 pra memória (passa pelo service worker, que guarda no aparelho)
  obter(id) {
    if (this.blobs.has(id)) {
      const p = this.blobs.get(id);
      this.blobs.delete(id); // reinsere no fim: mais novo
      this.blobs.set(id, p);
      return p;
    }
    const p = fetch(urlAudio(id))
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
      .then((b) => URL.createObjectURL(b))
      .catch(() => { this.blobs.delete(id); return null; });
    this.blobs.set(id, p);
    this.podar();
    return p;
  },

  // segura no máximo uns 24 áudios na memória
  podar() {
    if (this.blobs.size <= 24) return;
    for (const [id, p] of this.blobs) {
      if (this.blobs.size <= 24) break;
      if (this.fixos.has(id) || (this.atual && this.atual.id === id)) continue;
      this.blobs.delete(id);
      p.then((url) => { if (url) URL.revokeObjectURL(url); });
    }
  },

  // pré-carrega os próximos áudios, pra não ter silêncio entre uma fala e outra
  preparar(ids, fixar) {
    if (this.modo() !== 'gravada') return;
    ids.forEach((id) => {
      if (!Falas.tem(id)) return;
      if (fixar) this.fixos.add(id);
      this.obter(id);
    });
  },

  ocupado() { return !!(this.atual && this.atual.ativo); },

  /* toca uma fala pelo id do falas.json
     opcoes: tipo ('fala'|'extra'|'deixa'), aoAcabar, legenda (padrão true), forcar (toca mesmo em "sem voz")
     devolve o item tocando, ou null se não tocou */
  tocar(id, opcoes) {
    opcoes = opcoes || {};
    const tipo = opcoes.tipo || 'fala';
    let modo = this.modo();
    if (modo === 'nenhuma') {
      if (!opcoes.forcar) return null;
      modo = 'gravada';
    }
    const texto = opcoes.texto || Falas.texto(id);
    if (!texto && !Falas.tem(id)) return null;

    if (this.ocupado() && !this.atual.pausado) {
      if (tipo === 'deixa') return null;
      if (tipo === 'extra') {
        if (this.fila.length < 3) this.fila.push({ id, opcoes, ate: agora() + 6000 });
        return null;
      }
    }
    const fila = this.fila;
    this.parar();
    if (tipo === 'extra') this.fila = fila; // uma extra não apaga as outras da fila

    const item = {
      id, tipo, texto,
      aoAcabar: opcoes.aoAcabar || null,
      legenda: opcoes.legenda !== false,
      ativo: true,
      pausado: false,
      modo: 'carregando',
      // reserva se o 'ended' nunca chegar: duração conhecida, ou ~14 letras por segundo
      limite: (Falas.duracao(id) || texto.length / 14) * 1.6 + 4,
      decorrido: 0,
      marca: agora()
    };
    this.atual = item;
    if (item.legenda) Legenda.preparar(texto);
    this.ligarRelogio();

    if (modo === 'gravada' && Falas.tem(id)) this.tocarArquivo(item);
    else this.tocarTTS(item);
    return this.atual === item ? item : null;
  },

  tocarArquivo(item) {
    const el = this.criarElemento();
    this.obter(item.id).then((url) => {
      if (this.atual !== item || !item.ativo) return;
      if (!url) { this.tocarTTS(item); return; } // arquivo faltando ou sem internet
      item.modo = 'audio';
      el.onended = () => this.terminou(item);
      el.onerror = () => { if (this.atual === item && item.modo === 'audio') this.tocarTTS(item); };
      el.muted = false;
      el.volume = Ajustes.dados.volumeVoz;
      el.src = url;
      if (item.pausado) return;
      const p = el.play();
      if (p && p.catch) {
        p.catch(() => { if (this.atual === item && item.modo === 'audio' && !item.pausado) this.tocarTTS(item); });
      }
    });
  },

  // voz do aparelho lendo o mesmo texto
  tocarTTS(item) {
    if (this.el) { this.el.onended = null; this.el.onerror = null; this.el.pause(); }
    item.modo = 'tts';
    item.marca = agora();
    item.decorrido = 0;
    item.limite = (item.texto.length / 12) / Ajustes.dados.velocidadeVoz + 4;
    if (item.pausado) return;
    const falou = Voz.falar(item.texto, { aoAcabar: () => this.terminou(item) });
    if (!falou) {
      item.modo = 'mudo';
      this.terminou(item);
    }
  },

  terminou(item) {
    if (this.atual !== item || !item.ativo) return;
    item.ativo = false;
    this.atual = null;
    Legenda.limpar();
    this.desligarRelogio();
    if (item.aoAcabar) item.aoAcabar();
    while (!this.ocupado() && this.fila.length) {
      const p = this.fila.shift();
      if (agora() <= p.ate) this.tocar(p.id, p.opcoes);
    }
  },

  // a legenda acompanha o tempo; e uma reserva caso o fim nunca seja avisado
  ligarRelogio() {
    if (this.relogioId) return;
    this.relogioId = setInterval(() => this.tique(), 200);
  },

  desligarRelogio() {
    clearInterval(this.relogioId);
    this.relogioId = 0;
  },

  tique() {
    const item = this.atual;
    if (!item || !item.ativo) { this.desligarRelogio(); return; }
    if (item.pausado) return;
    const t = agora();
    item.decorrido += (t - item.marca) / 1000;
    item.marca = t;
    if (item.legenda) {
      let p;
      if (item.modo === 'audio' && this.el && this.el.duration > 0 && Number.isFinite(this.el.duration)) {
        p = this.el.currentTime / this.el.duration;
      } else {
        const est = item.modo === 'tts' ? item.limite - 4 : (Falas.duracao(item.id) || item.limite);
        p = item.decorrido / Math.max(1, est);
      }
      Legenda.mostrar(limitar(p, 0, 1));
    }
    if (item.decorrido > item.limite) this.terminou(item);
  },

  pausar() {
    this.fila = [];
    const item = this.atual;
    if (!item || !item.ativo || item.pausado) return;
    if (item.tipo === 'deixa') { this.parar(); return; }
    this.tique();
    item.pausado = true;
    if (item.modo === 'audio' && this.el) this.el.pause();
    else if (item.modo === 'tts') { item.cortada = true; Voz.silenciar(); }
  },

  retomar() {
    const item = this.atual;
    if (!item || !item.ativo || !item.pausado) return false;
    item.pausado = false;
    item.marca = agora();
    if (item.modo === 'audio' && this.el) {
      const p = this.el.play();
      if (p && p.catch) p.catch(() => this.tocarTTS(item));
    } else if (item.modo === 'tts' || item.modo === 'mudo') {
      this.tocarTTS(item); // a voz do aparelho não retoma do meio: lê de novo
    }
    // 'carregando': o tocarArquivo dá o play quando o arquivo chegar
    return true;
  },

  parar() {
    this.fila = [];
    const item = this.atual;
    this.atual = null;
    if (item) { item.ativo = false; item.interrompida = true; }
    if (this.el) {
      this.el.onended = null;
      this.el.onerror = null;
      try { this.el.pause(); } catch (e) { /* nada tocando */ }
    }
    Voz.silenciar();
    Legenda.limpar();
    this.desligarRelogio();
  },

  ajustarVolume() {
    if (this.el) this.el.volume = Ajustes.dados.volumeVoz;
  },

  // o iPhone ignora el.volume: testa uma vez pra avisar nos Ajustes
  testarVolume() {
    try {
      const a = new Audio();
      a.volume = 0.5;
      this.volumeFixo = a.volume !== 0.5;
    } catch (e) { this.volumeFixo = false; }
  }
};

Ajustes.aoMudar((chave) => {
  if (chave === 'volumeVoz') Fala.ajustarVolume();
  if (chave === 'modoVoz') Fala.parar();
});

aoIniciar.push(() => {
  Fala.testarVolume();
  Falas.carregar();
  // primeiro toque em qualquer lugar destrava o áudio (iPhone) e o som
  const destravar = () => {
    Som.preparar();
    Fala.destravar();
    if (Fala.destravado) {
      document.removeEventListener('touchend', destravar, true);
      document.removeEventListener('click', destravar, true);
    }
  };
  document.addEventListener('touchend', destravar, true);
  document.addEventListener('click', destravar, true);
});

/* ---------- Baixar: todos os áudios pro aparelho ---------- */

const Baixar = {
  rodando: false,
  tamanho: 0, // bytes, somado dos cabeçalhos

  disponivel() { return 'caches' in window; },

  ids() { return Falas.lista.map((f) => f.id); },

  async guardados() {
    if (!this.disponivel() || !Falas.carregado) return 0;
    try {
      const cache = await caches.open(CACHE_AUDIO);
      const chaves = await cache.keys();
      const nomes = new Set(chaves.map((r) => decodeURIComponent(new URL(r.url).pathname.split('/').pop())));
      return this.ids().filter((id) => nomes.has(`${id}.mp3`)).length;
    } catch (e) { return 0; }
  },

  // pergunta o tamanho de cada arquivo ao servidor (sem baixar)
  async medir() {
    if (this.tamanho) return this.tamanho;
    let soma = 0;
    const ids = this.ids();
    const fila = ids.slice();
    const trabalhar = async () => {
      while (fila.length) {
        const id = fila.shift();
        try {
          const r = await fetch(urlAudio(id), { method: 'HEAD', cache: 'no-store' });
          soma += Number(r.headers.get('content-length')) || 0;
        } catch (e) { /* sem rede: fica sem tamanho */ }
      }
    };
    await Promise.all([1, 2, 3, 4, 5, 6].map(trabalhar));
    this.tamanho = soma;
    return soma;
  },

  // baixa o que falta, 4 de cada vez; aoAvancar(feitos, total)
  async tudo(aoAvancar) {
    if (this.rodando || !this.disponivel()) return false;
    this.rodando = true;
    const cache = await caches.open(CACHE_AUDIO);
    const ids = this.ids();
    const fila = ids.slice();
    let feitos = 0;
    let falhas = 0;
    const trabalhar = async () => {
      while (fila.length) {
        const id = fila.shift();
        const url = new URL(urlAudio(id), location.href).href;
        try {
          if (!(await cache.match(url))) {
            const r = await fetch(url, { cache: 'no-store' });
            if (!r.ok) throw new Error(String(r.status));
            await cache.put(url, r);
          }
        } catch (e) { falhas++; }
        feitos++;
        aoAvancar(feitos, ids.length);
      }
    };
    await Promise.all([1, 2, 3, 4].map(trabalhar));
    this.rodando = false;
    return falhas === 0;
  }
};

function formatarMB(bytes) {
  return `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`;
}
