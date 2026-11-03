/* =========================================================
   Alongamento — app.js
   Toda a lógica. Os dados ficam em rotina.js.

   Blocos, nesta ordem:
     1. utilidades
     2. ajustes (estado + localStorage)
     3. telas
     4. montagem da rota e durações
     5. início e folha de ajustes
     6. som (Web Audio)
     7. voz (Web Speech)
     8. guia, ilustração e ponto ocular
     9. motor da sessão (relógio, contadores, eventos)
    10. aterrar
    11. ficar
    12. wake lock e PWA
    13. arranque
   ========================================================= */
'use strict';

const R = window.ROTINA;
const $ = (id) => document.getElementById(id);
const aoIniciar = []; // cada bloco registra aqui o que precisa rodar no arranque

/* ---------- 1. utilidades ---------- */

const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
const suave = (p) => 0.5 - 0.5 * Math.cos(Math.PI * limitar(p, 0, 1));
const agora = () => performance.now();
const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function formatarMinutos(segundos) {
  const m = Math.max(1, Math.round(segundos / 60));
  return `~${m} min`;
}

function guardar(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch (e) { /* sem armazenamento: segue sem salvar */ }
}

function ler(chave) {
  try { return localStorage.getItem(chave); } catch (e) { return null; }
}

/* ---------- 2. ajustes ---------- */

const CHAVE_AJUSTES = 'alongamento.ajustes';
const CHAVE_SINAIS = 'alongamento.sinaisVistos';

const Ajustes = {
  dados: Object.assign({}, R.ajustesPadrao),
  ouvintes: [],

  carregar() {
    const salvo = ler(CHAVE_AJUSTES);
    if (salvo) {
      try { Object.assign(this.dados, JSON.parse(salvo)); } catch (e) { /* ignora ajuste corrompido */ }
    }
    this.normalizar();
  },

  salvar() { guardar(CHAVE_AJUSTES, JSON.stringify(this.dados)); },

  normalizar() {
    const d = this.dados;
    d.entra = limitar(Math.round(Number(d.entra) || 4), 2, 10);
    d.sai = limitar(Math.round(Number(d.sai) || 6), 2, 12);
    d.pausa = limitar(Math.round(Number(d.pausa) || 0), 0, 8);
    d.velocidadeVoz = limitar(Number(d.velocidadeVoz) || 0.95, 0.7, 1.3);
    d.volume = limitar(Number(d.volume), 0, 1);
    if (Number.isNaN(d.volume)) d.volume = 0.6;
    d.voz = !!d.voz;
    d.sons = !!d.sons;
    d.telaLigada = !!d.telaLigada;
    if (!R.pontoOcular[d.velocidadePonto]) d.velocidadePonto = 'medio';
    if (typeof d.vozNome !== 'string') d.vozNome = '';
  },

  definir(chave, valor) {
    this.dados[chave] = valor;
    this.normalizar();
    this.salvar();
    this.ouvintes.forEach((f) => f(chave, this.dados[chave]));
  },

  aoMudar(f) { this.ouvintes.push(f); }
};

/* ---------- 3. telas ---------- */

const Telas = {
  atual: null,
  mostrar(id) {
    if (this.atual === id) return;
    document.querySelectorAll('.tela').forEach((tela) => {
      const ativa = tela.id === id;
      tela.hidden = !ativa;
      tela.classList.toggle('ativa', ativa);
    });
    this.atual = id;
    window.scrollTo(0, 0);
  }
};

/* ---------- 4. rota ---------- */

const Rota = {
  segmentoPorId(id) {
    if (id === 'chegar') return R.chegar;
    if (id === 'ficar') return R.ficar;
    return R.segmentos.find((s) => s.id === id) || null;
  },

  passoExercicio(segmento, exercicio, contagem) {
    return { tipo: 'exercicio', segmento, exercicio, contagem: contagem || exercicio.contagem };
  },

  passoIntro(segmento) {
    return { tipo: 'intro', segmento, duracao: R.duracaoIntro };
  },

  // comIntro: só na Completa e no Um segmento
  passosDoSegmento(segmento, comIntro) {
    const passos = [];
    if (comIntro && segmento.intro) passos.push(this.passoIntro(segmento));
    segmento.exercicios.forEach((ex) => passos.push(this.passoExercicio(segmento, ex)));
    return passos;
  },

  montar(tipo, segmentoId) {
    let passos = [];
    if (tipo === 'completa') {
      passos = passos.concat(this.passosDoSegmento(R.chegar, false));
      R.segmentos.forEach((s) => { passos = passos.concat(this.passosDoSegmento(s, true)); });
      passos = passos.concat(this.passosDoSegmento(R.ficar, false));
    } else if (tipo === 'curta') {
      R.rotaCurta.forEach((item) => {
        const seg = this.segmentoPorId(item.segmento);
        const ex = seg && seg.exercicios.find((e) => e.id === item.exercicio);
        if (ex) passos.push(this.passoExercicio(seg, ex, item.contagem));
      });
    } else if (tipo === 'segmento') {
      const seg = this.segmentoPorId(segmentoId);
      passos = passos.concat(this.passosDoSegmento(R.chegar, false));
      if (seg.id === 'pelvico') {
        passos = passos.concat(this.passosDoSegmento(this.segmentoPorId('diafragmatico'), true));
      }
      passos = passos.concat(this.passosDoSegmento(seg, true));
      passos = passos.concat(this.passosDoSegmento(R.ficar, false));
    }
    const duracao = passos.reduce((total, p) => total + this.duracaoPasso(p), 0);
    return { tipo, segmentoId: segmentoId || null, passos, duracao };
  },

  // duração de um passo em segundos, com o ritmo de respiração atual
  duracaoPasso(passo) {
    if (passo.tipo === 'intro') return passo.duracao;
    const c = passo.contagem;
    const a = Ajustes.dados;
    if (c.tipo === 'respiracoes') return c.valor * (a.entra + a.sai + a.pausa);
    if (c.tipo === 'vezes') return c.valor * (c.intervalo || R.intervaloVezPadrao);
    if (c.tipo === 'segundos') return c.valor * (c.cadaLado ? 2 : 1);
    return 0;
  }
};

/* ---------- 5. início e folha de ajustes ---------- */

const UIInicio = {
  montar() {
    const lista = $('lista-segmentos');
    lista.innerHTML = '';
    R.segmentos.forEach((seg) => {
      const li = document.createElement('li');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'segmento';
      botao.dataset.segmento = seg.id;
      botao.style.setProperty('--cor-seg', seg.cor);

      const ponto = document.createElement('span');
      ponto.className = 'ponto-seg';
      ponto.setAttribute('aria-hidden', 'true');

      const texto = document.createElement('span');
      const nome = document.createElement('span');
      nome.className = 'segmento-nome';
      nome.textContent = seg.nome;
      const partes = document.createElement('span');
      partes.className = 'segmento-partes';
      partes.textContent = seg.partes;
      texto.append(nome, partes);

      const duracao = document.createElement('span');
      duracao.className = 'segmento-duracao';
      duracao.dataset.duracaoSegmento = seg.id;

      botao.append(ponto, texto, duracao);
      botao.addEventListener('click', () => Sessao.iniciar('segmento', seg.id));
      li.appendChild(botao);
      lista.appendChild(li);
    });

    document.querySelectorAll('.rota[data-rota]').forEach((botao) => {
      botao.addEventListener('click', () => Sessao.iniciar(botao.dataset.rota));
    });

    $('btn-ajustes').addEventListener('click', () => UIAjustes.abrir());
    $('btn-entendi').addEventListener('click', () => {
      guardar(CHAVE_SINAIS, '1');
      Telas.mostrar('tela-inicio');
    });

    this.atualizarDuracoes();
    Ajustes.aoMudar(() => this.atualizarDuracoes());
  },

  atualizarDuracoes() {
    document.querySelector('[data-duracao="completa"]').textContent = formatarMinutos(Rota.montar('completa').duracao);
    document.querySelector('[data-duracao="curta"]').textContent = formatarMinutos(Rota.montar('curta').duracao);
    R.segmentos.forEach((seg) => {
      const el = document.querySelector(`[data-duracao-segmento="${seg.id}"]`);
      if (el) el.textContent = formatarMinutos(Rota.montar('segmento', seg.id).duracao);
    });
  }
};

const UIAjustes = {
  aberta: false,

  montar() {
    const folha = $('folha-ajustes');
    const fundo = $('folha-fundo');

    // passos − / +
    folha.querySelectorAll('.passo-btn').forEach((botao) => {
      botao.addEventListener('click', () => {
        const chave = botao.dataset.ajuste;
        const delta = Number(botao.dataset.delta);
        Ajustes.definir(chave, Ajustes.dados[chave] + delta);
        this.refletir();
      });
    });

    $('aj-voz').addEventListener('change', (e) => Ajustes.definir('voz', e.target.checked));
    $('aj-voz-nome').addEventListener('change', (e) => Ajustes.definir('vozNome', e.target.value));
    $('aj-velocidade-voz').addEventListener('input', (e) => {
      Ajustes.definir('velocidadeVoz', Number(e.target.value));
      this.refletirValores();
    });
    $('aj-testar-voz').addEventListener('click', () => {
      Som.preparar();
      Voz.preparar();
      Voz.falar('Entra. Solta. Espera.', { tipo: 'texto', forcar: true });
    });

    $('aj-sons').addEventListener('change', (e) => {
      Ajustes.definir('sons', e.target.checked);
      if (e.target.checked) { Som.preparar(); Som.sino(); }
    });
    $('aj-volume').addEventListener('input', (e) => {
      Ajustes.definir('volume', Number(e.target.value));
      this.refletirValores();
    });
    $('aj-volume').addEventListener('change', () => { Som.preparar(); Som.tique(); });

    $('aj-tela-ligada').addEventListener('change', (e) => Ajustes.definir('telaLigada', e.target.checked));

    folha.querySelectorAll('input[name="velocidadePonto"]').forEach((radio) => {
      radio.addEventListener('change', () => { if (radio.checked) Ajustes.definir('velocidadePonto', radio.value); });
    });

    $('aj-rever-sinais').addEventListener('click', () => {
      this.fechar();
      Telas.mostrar('tela-sinais');
    });
    $('aj-fechar').addEventListener('click', () => this.fechar());
    fundo.addEventListener('click', () => this.fechar());

    this.refletir();
  },

  abrir() {
    this.refletir();
    $('folha-ajustes').classList.add('aberta');
    $('folha-ajustes').setAttribute('aria-hidden', 'false');
    $('folha-fundo').classList.add('aberta');
    this.aberta = true;
  },

  fechar() {
    $('folha-ajustes').classList.remove('aberta');
    $('folha-ajustes').setAttribute('aria-hidden', 'true');
    $('folha-fundo').classList.remove('aberta');
    this.aberta = false;
  },

  // escreve os valores atuais nos controles
  refletir() {
    const d = Ajustes.dados;
    $('aj-entra').textContent = `${d.entra} s`;
    $('aj-sai').textContent = `${d.sai} s`;
    $('aj-pausa').textContent = `${d.pausa} s`;
    $('aj-voz').checked = d.voz;
    $('aj-velocidade-voz').value = d.velocidadeVoz;
    $('aj-sons').checked = d.sons;
    $('aj-volume').value = d.volume;
    $('aj-tela-ligada').checked = d.telaLigada;
    const radio = document.querySelector(`input[name="velocidadePonto"][value="${d.velocidadePonto}"]`);
    if (radio) radio.checked = true;
    const seletor = $('aj-voz-nome');
    if (seletor.options.length) seletor.value = d.vozNome;
    this.refletirValores();
  },

  refletirValores() {
    const d = Ajustes.dados;
    $('aj-velocidade-voz-valor').textContent = `${d.velocidadeVoz.toFixed(2).replace('.', ',')}×`;
    $('aj-volume-valor').textContent = `${Math.round(d.volume * 100)}%`;
    const ciclo = d.entra + d.sai + d.pausa;
    $('aj-ritmo-nota').textContent = `Uma respiração dura ${ciclo} s.`;
  },

  // chamada pela Voz quando a lista de vozes muda
  preencherVozes(vozes) {
    const seletor = $('aj-voz-nome');
    seletor.innerHTML = '';
    const padrao = document.createElement('option');
    padrao.value = '';
    padrao.textContent = vozes.length ? 'automática' : 'nenhuma voz em português';
    seletor.appendChild(padrao);
    vozes.forEach((v) => {
      const opcao = document.createElement('option');
      opcao.value = v.name;
      opcao.textContent = `${v.name} (${v.lang})`;
      seletor.appendChild(opcao);
    });
    seletor.disabled = vozes.length === 0;
    seletor.value = vozes.some((v) => v.name === Ajustes.dados.vozNome) ? Ajustes.dados.vozNome : '';
    $('aviso-voz-ajustes').hidden = vozes.length > 0 || !Voz.disponivel();
  }
};

/* ---------- 6. som (Web Audio, sem arquivos) ---------- */

const Som = {
  ctx: null,
  ganho: null,

  // no iOS o AudioContext só nasce depois de um toque: chamar dentro de um clique
  preparar() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.ganho = this.ctx.createGain();
      this.ganho.connect(this.ctx.destination);
      this.ajustarVolume();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },

  ajustarVolume() {
    if (this.ganho) this.ganho.gain.value = Ajustes.dados.volume;
  },

  pode() {
    return !!this.ctx && Ajustes.dados.sons && Ajustes.dados.volume > 0;
  },

  nota(freq, inicio, duracao, tipo, volume) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = tipo || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(volume || 0.3, inicio + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
    o.connect(g);
    g.connect(this.ganho);
    o.start(inicio);
    o.stop(inicio + duracao + 0.05);
  },

  // tique curto: 3 últimos segundos de cada exercício
  tique() {
    if (!this.pode()) return;
    this.nota(1046.5, this.ctx.currentTime, 0.09, 'sine', 0.25);
  },

  // marca de repetição no modo "vezes"
  marca() {
    if (!this.pode()) return;
    this.nota(659.3, this.ctx.currentTime, 0.16, 'triangle', 0.22);
  },

  // sino de duas notas: troca de exercício e troca de lado
  sino() {
    if (!this.pode()) return;
    const t = this.ctx.currentTime;
    this.nota(659.3, t, 1.4, 'triangle', 0.3);
    this.nota(987.8, t + 0.24, 1.8, 'triangle', 0.24);
  },

  // acorde de quatro notas subindo: fim da rota
  acorde() {
    if (!this.pode()) return;
    const t = this.ctx.currentTime;
    [261.6, 329.6, 392.0, 493.9].forEach((f, i) => {
      this.nota(f, t + i * 0.3, 3.2 - i * 0.3, 'sine', 0.26);
    });
  }
};

Ajustes.aoMudar((chave) => { if (chave === 'volume') Som.ajustarVolume(); });

/* ---------- 7. voz (Web Speech, pt-BR) ---------- */

const Voz = {
  voz: null,
  temPt: false,
  pronta: false,
  falaAtual: null, // { tipo: 'texto' | 'deixa', u }

  disponivel() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  },

  iniciar() {
    if (!this.disponivel()) {
      UIAjustes.preencherVozes([]);
      this.avisar();
      return;
    }
    this.escolher();
    speechSynthesis.addEventListener('voiceschanged', () => this.escolher());
    // alguns Android só entregam a lista depois de um tempo
    setTimeout(() => this.escolher(), 1500);
  },

  listar() {
    if (!this.disponivel()) return [];
    return speechSynthesis.getVoices().filter((v) => /^pt([-_]|$)/i.test(v.lang));
  },

  escolher() {
    const vozes = this.listar();
    this.temPt = vozes.length > 0;
    const nome = Ajustes.dados.vozNome;
    this.voz = vozes.find((v) => v.name === nome)
      || vozes.find((v) => /br/i.test(v.lang) && /natural|neural|online|google|luciana|francisca/i.test(v.name))
      || vozes.find((v) => /br/i.test(v.lang))
      || vozes[0]
      || null;
    UIAjustes.preencherVozes(vozes);
    this.avisar();
  },

  // aviso na sessão quando a voz está ligada mas não há voz em português
  avisar() {
    $('aviso-voz').hidden = !(Ajustes.dados.voz && !this.temPt);
  },

  // no iOS a primeira fala precisa nascer dentro de um toque
  preparar() {
    if (!this.disponivel() || this.pronta) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
      this.pronta = true;
    } catch (e) { /* segue sem voz */ }
  },

  estaFalando() {
    return this.disponivel() && (speechSynthesis.speaking || speechSynthesis.pending);
  },

  falar(texto, opcoes) {
    opcoes = opcoes || {};
    if (!this.disponivel() || !texto) return;
    if (!Ajustes.dados.voz && !opcoes.forcar) return;
    if (!this.temPt) this.escolher();
    if (!this.temPt) return;

    const u = new SpeechSynthesisUtterance(texto);
    u.lang = (this.voz && this.voz.lang) || 'pt-BR';
    if (this.voz) u.voice = this.voz;
    u.rate = Ajustes.dados.velocidadeVoz;
    u.pitch = 0.95;
    u.volume = Ajustes.dados.volume;
    const registro = { tipo: opcoes.tipo || 'texto', u };
    u.onend = u.onerror = () => { if (this.falaAtual === registro) this.falaAtual = null; };
    this.falaAtual = registro;

    // o Chrome do Android às vezes engole um speak() logo depois de um cancel()
    const estavaFalando = this.estaFalando();
    speechSynthesis.cancel();
    if (estavaFalando) {
      setTimeout(() => { if (this.falaAtual === registro) speechSynthesis.speak(u); }, 60);
    } else {
      speechSynthesis.speak(u);
    }
  },

  // deixa curta ("entra", "solta", "espera"): não corta um texto longo no meio
  deixa(texto) {
    if (this.falaAtual && this.falaAtual.tipo === 'texto' && this.estaFalando()) return;
    this.falar(texto, { tipo: 'deixa' });
  },

  silenciar() {
    if (!this.disponivel()) return;
    this.falaAtual = null;
    speechSynthesis.cancel();
  }
};

aoIniciar.push(() => Voz.iniciar());
Ajustes.aoMudar((chave) => { if (chave === 'voz' || chave === 'vozNome') Voz.escolher(); });

/* ---------- 8. guia, ilustração e ponto ocular ---------- */

const DEIXAS = { entra: 'entra', sai: 'solta', pausa: 'espera' };

const Guia = {
  circunferencia: 2 * Math.PI * 98,
  ultimaEscala: -1,
  ultimoAnel: -1,

  escala(s) {
    if (Math.abs(s - this.ultimaEscala) < 0.0005) return;
    this.ultimaEscala = s;
    $('guia-forma').style.transform = `scale(${s.toFixed(4)})`;
  },

  // p = fração do tempo já passada; o anel esvazia conforme o tempo anda
  anel(p) {
    const v = Math.round(this.circunferencia * limitar(p, 0, 1) * 100) / 100;
    if (v === this.ultimoAnel) return;
    this.ultimoAnel = v;
    $('anel-cheio').style.strokeDashoffset = v;
  },

  zerar() {
    this.ultimaEscala = -1;
    this.ultimoAnel = -1;
  }
};

const Ilustracao = {
  cache: new Map(),
  pedido: 0,

  // injeta o SVG inline pra cor do segmento valer no traço
  async mostrar(id) {
    const el = $('ilustracao');
    const meuPedido = ++this.pedido;
    el.hidden = false;
    let svg = this.cache.get(id);
    if (svg === undefined) {
      try {
        const resposta = await fetch(`img/${encodeURIComponent(id)}.svg`);
        svg = resposta.ok ? await resposta.text() : '';
      } catch (e) {
        svg = '';
      }
      this.cache.set(id, svg);
    }
    if (meuPedido !== this.pedido) return; // já trocou de exercício
    el.innerHTML = svg;
  },

  esconder() {
    this.pedido++;
    const el = $('ilustracao');
    el.hidden = true;
    el.innerHTML = '';
  }
};

const Ponto = {
  // posição relativa ao tamanho do guia: metade do tempo em círculos,
  // metade de um lado pro outro
  posicao(t, total) {
    const periodo = R.pontoOcular[Ajustes.dados.velocidadePonto] || R.pontoOcular.medio;
    const raio = 0.40;
    const metade = total / 2;
    const noCirculo = (tt) => {
      const ang = (2 * Math.PI * tt) / periodo - Math.PI / 2;
      return { x: raio * Math.cos(ang), y: raio * Math.sin(ang) };
    };
    if (t < metade) return noCirculo(t);
    const t2 = t - metade;
    const lado = { x: raio * Math.sin((2 * Math.PI * t2) / periodo), y: 0 };
    // nos primeiros 1,5 s desliza do fim do círculo pro vaivém, sem pulo
    const mistura = suave(t2 / 1.5);
    const fim = noCirculo(metade);
    return { x: fim.x + (lado.x - fim.x) * mistura, y: fim.y + (lado.y - fim.y) * mistura };
  },

  aplicar(pos) {
    const tam = $('guia').clientWidth;
    $('ponto-ocular').style.transform = `translate(${(pos.x * tam).toFixed(1)}px, ${(pos.y * tam).toFixed(1)}px)`;
  },

  mostrar(sim) {
    $('ponto-ocular').hidden = !sim;
  }
};

/* ---------- 9. motor da sessão ---------- */

// cálculo puro: o que mostrar no instante t (em s) de um passo
const Motor = {
  calcular(passo, t) {
    if (passo.tipo === 'intro') {
      const d = passo.duracao;
      return { escala: 0.62, anel: t / d, numero: '', rotulo: '', deixa: '', restante: d - t, fim: t >= d };
    }
    const c = passo.contagem;
    const a = Ajustes.dados;

    if (c.tipo === 'respiracoes') {
      const ciclo = a.entra + a.sai + a.pausa;
      const total = c.valor * ciclo;
      const n = Math.floor(t / ciclo);
      const tc = t - n * ciclo;
      let fase;
      let p;
      if (tc < a.entra) { fase = 'entra'; p = tc / a.entra; }
      else if (tc < a.entra + a.sai) { fase = 'sai'; p = (tc - a.entra) / a.sai; }
      else { fase = 'pausa'; p = a.pausa ? (tc - a.entra - a.sai) / a.pausa : 1; }
      const escala = fase === 'entra' ? 0.62 + 0.38 * suave(p)
        : fase === 'sai' ? 1 - 0.38 * suave(p)
        : 0.62;
      const faltam = Math.max(0, c.valor - n);
      return {
        escala, anel: t / total, numero: faltam, rotulo: faltam === 1 ? 'respiração' : 'respirações',
        deixa: DEIXAS[fase], fase, ciclo: n, restante: total - t, fim: t >= total
      };
    }

    if (c.tipo === 'vezes') {
      const intervalo = c.intervalo || R.intervaloVezPadrao;
      const total = c.valor * intervalo;
      const n = Math.floor(t / intervalo);
      const p = (t - n * intervalo) / intervalo;
      // cresce em 70% do intervalo (segura) e solta nos 30% finais
      const escala = p < 0.7 ? 0.62 + 0.38 * (p / 0.7) : 1 - 0.38 * suave((p - 0.7) / 0.3);
      const faltam = Math.max(0, c.valor - n);
      return {
        escala, anel: t / total, numero: faltam, rotulo: faltam === 1 ? 'vez' : 'vezes',
        deixa: '', vez: n, restante: total - t, fim: t >= total
      };
    }

    // segundos, com ou sem "cada lado"
    const lados = c.cadaLado ? 2 : 1;
    const total = c.valor * lados;
    const lado = c.cadaLado && t >= c.valor ? 2 : 1;
    const tLado = t - (lado - 1) * c.valor;
    const faltam = Math.max(0, Math.ceil(c.valor - tLado));
    const estado = {
      escala: 0.8, anel: tLado / c.valor, numero: faltam, rotulo: faltam === 1 ? 'segundo' : 'segundos',
      deixa: c.cadaLado ? (lado === 1 ? 'primeiro lado' : 'outro lado') : '',
      lado, restante: total - t, fim: t >= total
    };
    if (passo.exercicio.ponto) estado.ponto = Ponto.posicao(t, total);
    return estado;
  }
};

const Render = {
  ultimo: { numero: null, rotulo: null, deixa: null },

  montarPasso(passo) {
    const seg = passo.segmento;
    $('tela-sessao').style.setProperty('--cor-seg', seg.cor);
    $('sessao-segmento').textContent = seg.nome;
    $('sessao-partes').textContent = seg.partes || '';
    this.ultimo = { numero: null, rotulo: null, deixa: null };
    Guia.zerar();

    if (passo.tipo === 'intro') {
      $('sessao-exercicio').textContent = seg.nome;
      $('sessao-como').textContent = seg.intro;
      $('sessao-respiracao').textContent = '';
      $('contador').hidden = true;
      Ilustracao.esconder();
      Ponto.mostrar(false);
    } else {
      const ex = passo.exercicio;
      $('sessao-exercicio').textContent = ex.nome;
      $('sessao-como').textContent = ex.como;
      $('sessao-respiracao').textContent = ex.respiracao === 'livre' ? 'respiração livre' : (ex.respiracao || '');
      $('contador').hidden = false;
      if (ex.ponto) {
        Ilustracao.esconder();
        Ponto.mostrar(true);
      } else {
        Ponto.mostrar(false);
        Ilustracao.mostrar(ex.id);
      }
    }
    this.botaoTocar();
  },

  aplicar(estado) {
    Guia.escala(estado.escala);
    Guia.anel(estado.anel);
    const numero = String(estado.numero);
    if (numero !== this.ultimo.numero) {
      this.ultimo.numero = numero;
      $('contador-numero').textContent = numero;
    }
    if (estado.rotulo !== this.ultimo.rotulo) {
      this.ultimo.rotulo = estado.rotulo;
      $('contador-rotulo').textContent = estado.rotulo;
    }
    if (estado.deixa !== this.ultimo.deixa) {
      this.ultimo.deixa = estado.deixa;
      $('deixa').textContent = estado.deixa;
    }
    if (estado.ponto) Ponto.aplicar(estado.ponto);
  },

  barra(p) {
    $('barra-rota').style.width = `${(limitar(p, 0, 1) * 100).toFixed(2)}%`;
  },

  botaoTocar() {
    $('btn-tocar').textContent = Sessao.pausado ? 'tocar' : 'pausar';
  }
};

const Sessao = {
  rota: null,
  indice: -1,
  passo: null,
  ativa: false,
  pausado: true,
  inicio: 0,
  acumulado: 0,
  duracaoPasso: 0,
  antesDoPasso: 0,
  marcas: null,
  rafId: 0,
  intervaloId: 0,

  iniciar(tipo, segmentoId) {
    Som.preparar();
    Voz.preparar();
    this.rota = Rota.montar(tipo, segmentoId);
    if (!this.rota.passos.length) return;
    this.ativa = true;
    WakeLock.pedir();
    this.irPara(0);
    this.ligarRelogio();
  },

  // segundos decorridos no passo atual, descontando pausas
  tempo() {
    const ms = this.pausado ? this.acumulado : this.acumulado + (agora() - this.inicio);
    return ms / 1000;
  },

  irPara(i) {
    if (i < 0 || i >= this.rota.passos.length) return;
    this.indice = i;
    this.passo = this.rota.passos[i];
    this.acumulado = 0;
    this.inicio = agora();
    this.pausado = false;
    this.duracaoPasso = Rota.duracaoPasso(this.passo);
    this.antesDoPasso = this.rota.passos.slice(0, i).reduce((soma, p) => soma + Rota.duracaoPasso(p), 0);
    this.marcas = { fase: null, vez: -1, lado: 1, tiques: {} };
    Voz.silenciar();

    const ex = this.passo.exercicio;
    if (ex && ex.escurecer) {
      Ficar.iniciar(this.passo);
    } else {
      Ficar.parar();
      Render.montarPasso(this.passo);
      Telas.mostrar('tela-sessao');
    }

    const seg = this.passo.segmento;
    const texto = this.passo.tipo === 'intro' ? `${seg.nome}. ${seg.intro}` : `${ex.nome}. ${ex.como}`;
    Voz.falar(texto, { tipo: 'texto' });
    this.atualizar();
  },

  proximo() {
    if (!this.ativa) return;
    if (this.indice + 1 < this.rota.passos.length) this.irPara(this.indice + 1);
    else this.terminar();
  },

  // como num tocador: volta ao começo do passo; se já está no começo, vai pro anterior
  anterior() {
    if (!this.ativa) return;
    if (this.tempo() > 3 || this.indice === 0) this.irPara(this.indice);
    else this.irPara(this.indice - 1);
  },

  pausar() {
    if (this.pausado || !this.ativa) return;
    this.acumulado += agora() - this.inicio;
    this.pausado = true;
    Voz.silenciar();
    Render.botaoTocar();
  },

  retomar() {
    if (!this.pausado || !this.ativa) return;
    Som.preparar();
    this.inicio = agora();
    this.pausado = false;
    Render.botaoTocar();
  },

  alternar() {
    if (this.pausado) this.retomar();
    else this.pausar();
  },

  encerrar() {
    this.ativa = false;
    this.pausado = true;
    this.desligarRelogio();
    Voz.silenciar();
    WakeLock.soltar();
    Ficar.parar();
    Ilustracao.esconder();
    Telas.mostrar('tela-inicio');
  },

  // fim da rota: acorde e tela de fim, dentro do Ficar
  terminar() {
    this.pausado = true;
    this.desligarRelogio();
    Voz.silenciar();
    Som.acorde();
    Ficar.mostrarFim();
  },

  ligarRelogio() {
    this.desligarRelogio();
    const laco = () => {
      this.atualizar();
      this.rafId = requestAnimationFrame(laco);
    };
    this.rafId = requestAnimationFrame(laco);
    // reserva pra quando o rAF congela (aba em segundo plano)
    this.intervaloId = setInterval(() => this.atualizar(), 500);
  },

  desligarRelogio() {
    cancelAnimationFrame(this.rafId);
    clearInterval(this.intervaloId);
    this.rafId = 0;
    this.intervaloId = 0;
  },

  atualizar() {
    if (!this.ativa || !this.passo) return;
    const t = this.tempo();
    const estado = Motor.calcular(this.passo, t);
    if (!this.pausado) this.eventos(estado);
    if (!(this.passo.exercicio && this.passo.exercicio.escurecer)) {
      Render.aplicar(estado);
      Render.barra((this.antesDoPasso + Math.min(t, this.duracaoPasso)) / this.rota.duracao);
    }
    if (estado.fim && !this.pausado) this.concluirPasso();
  },

  // sons e deixas de voz nas viradas de fase, repetição e lado, e nos 3 últimos segundos
  eventos(estado) {
    const m = this.marcas;
    const passo = this.passo;
    if (passo.tipo === 'exercicio') {
      const c = passo.contagem;
      if (c.tipo === 'respiracoes' && estado.fase !== m.fase) {
        m.fase = estado.fase;
        const pausaZerada = estado.fase === 'pausa' && Ajustes.dados.pausa === 0;
        if (!estado.fim && !pausaZerada) Voz.deixa(DEIXAS[estado.fase]);
      }
      if (c.tipo === 'vezes' && estado.vez !== m.vez) {
        m.vez = estado.vez;
        if (!estado.fim) Som.marca();
      }
      if (c.tipo === 'segundos' && c.cadaLado && estado.lado !== m.lado) {
        m.lado = estado.lado;
        if (estado.lado === 2) {
          Som.sino();
          Voz.falar('troca de lado', { tipo: 'deixa' });
        }
      }
      if (passo.exercicio.escurecer) return; // o Ficar termina em silêncio
    }
    const r = Math.ceil(estado.restante);
    if (r >= 1 && r <= 3 && !m.tiques[r]) {
      m.tiques[r] = true;
      Som.tique();
    }
  },

  concluirPasso() {
    const ultimo = this.indice === this.rota.passos.length - 1;
    if (ultimo) {
      this.terminar();
      return;
    }
    // a intro espera a voz terminar de ler (até 8 s a mais)
    if (this.passo.tipo === 'intro' && Voz.estaFalando() && this.tempo() < this.duracaoPasso + 8) return;
    Som.sino();
    this.irPara(this.indice + 1);
  }
};

aoIniciar.push(() => {
  $('btn-tocar').addEventListener('click', () => Sessao.alternar());
  $('btn-anterior').addEventListener('click', () => Sessao.anterior());
  $('btn-proximo').addEventListener('click', () => Sessao.proximo());
  $('btn-forte').addEventListener('click', () => Aterrar.abrir());
});

/* ---------- 12. wake lock ---------- */

const WakeLock = {
  lock: null,
  suportado: 'wakeLock' in navigator,

  async pedir() {
    if (!this.suportado || !Ajustes.dados.telaLigada || this.lock) return;
    try {
      this.lock = await navigator.wakeLock.request('screen');
      this.lock.addEventListener('release', () => { this.lock = null; });
    } catch (e) {
      this.lock = null;
    }
  },

  async soltar() {
    if (!this.lock) return;
    try { await this.lock.release(); } catch (e) { /* já estava solto */ }
    this.lock = null;
  }
};

aoIniciar.push(() => {
  $('aj-tela-nota').hidden = WakeLock.suportado;
  // o sistema solta o lock quando a tela apaga ou o app vai pro fundo; pede de novo ao voltar
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Sessao.ativa) WakeLock.pedir();
  });
});

Ajustes.aoMudar((chave, valor) => {
  if (chave !== 'telaLigada') return;
  if (valor && Sessao.ativa) WakeLock.pedir();
  else if (!valor) WakeLock.soltar();
});

/* ---------- 10. aterrar ---------- */

const Aterrar = {
  ativo: false,
  inicio: 0,
  rafId: 0,
  ultimaFase: null,
  liberado: false,

  // pausa tudo e abre o guia só de expiração por 1 min
  abrir() {
    if (!Sessao.ativa) return;
    Sessao.pausar();
    this.ativo = true;
    this.inicio = agora();
    this.ultimaFase = null;
    this.liberado = false;
    $('btn-aterrar-voltar').hidden = true;
    $('aterrar-deixa').textContent = '';
    $('aterrar-forma').style.transform = 'scale(1)';
    Telas.mostrar('tela-aterrar');
    Voz.falar(R.textoAterrar, { tipo: 'texto' });
    cancelAnimationFrame(this.rafId);
    const laco = () => {
      if (!this.ativo) return;
      this.atualizar();
      this.rafId = requestAnimationFrame(laco);
    };
    this.rafId = requestAnimationFrame(laco);
  },

  // 6 s soltando com deixa, 3 s deixando o ar entrar em silêncio
  atualizar() {
    const t = (agora() - this.inicio) / 1000;
    const ciclo = 9;
    const tc = t - Math.floor(t / ciclo) * ciclo;
    let fase;
    let escala;
    if (tc < 6) {
      fase = 'solta';
      escala = 1 - 0.38 * suave(tc / 6);
    } else {
      fase = 'entra';
      escala = 0.62 + 0.38 * suave((tc - 6) / 3);
    }
    $('aterrar-forma').style.transform = `scale(${escala.toFixed(4)})`;
    if (fase !== this.ultimaFase) {
      this.ultimaFase = fase;
      $('aterrar-deixa').textContent = fase === 'solta' ? 'solta o ar devagar' : 'deixa o ar entrar';
      if (fase === 'solta') Voz.deixa('solta');
    }
    if (!this.liberado && t >= R.duracaoAterrar) {
      this.liberado = true;
      $('btn-aterrar-voltar').hidden = false;
    }
  },

  fechar() {
    this.ativo = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    Voz.silenciar();
  },

  // volta pra sessão, ainda pausada: a pessoa toca quando quiser
  voltar() {
    this.fechar();
    Telas.mostrar('tela-sessao');
    Render.botaoTocar();
  },

  encerrar() {
    this.fechar();
    Sessao.encerrar();
  }
};

aoIniciar.push(() => {
  $('btn-aterrar-voltar').addEventListener('click', () => Aterrar.voltar());
  $('btn-aterrar-encerrar').addEventListener('click', () => Aterrar.encerrar());
});

/* ---------- 11. ficar ---------- */

const Ficar = {
  ativo: false,
  aceso: false,
  terminado: false,
  nivel: 0, // opacidade atual do escuro, 0 a 0,97
  ultimoQuadro: 0,
  rafId: 0,

  iniciar(passo) {
    this.ativo = true;
    this.aceso = false;
    this.terminado = false;
    this.nivel = 0;
    this.ultimoQuadro = agora();
    $('ficar-titulo').textContent = passo.exercicio.nome;
    $('ficar-texto').textContent = passo.exercicio.como;
    $('ficar-acoes').hidden = true;
    $('btn-ficar-continuar').hidden = false;
    $('ficar-escuro').style.opacity = '0';
    $('ficar-miolo').style.opacity = '1';
    $('tela-ficar').classList.remove('escurecida');
    Telas.mostrar('tela-ficar');
    cancelAnimationFrame(this.rafId);
    const laco = () => {
      if (!this.ativo) return;
      this.animar();
      this.rafId = requestAnimationFrame(laco);
    };
    this.rafId = requestAnimationFrame(laco);
  },

  // escurece aos poucos; um toque acende um pouco; o texto some junto com a luz
  animar() {
    const t = agora();
    const dt = Math.min(0.1, (t - this.ultimoQuadro) / 1000);
    this.ultimoQuadro = t;
    const alvo = this.aceso ? 0.55 : 0.97;
    const rampa = reduzMovimento ? 8 : 40; // segundos até escurecer de vez
    let velocidade;
    if (alvo > this.nivel) velocidade = 0.97 / rampa; // escurecendo, devagar
    else velocidade = 1.2;                             // acendendo, rápido
    if (alvo > this.nivel) this.nivel = Math.min(alvo, this.nivel + velocidade * dt);
    else this.nivel = Math.max(alvo, this.nivel - velocidade * dt);

    $('ficar-escuro').style.opacity = this.nivel.toFixed(3);
    $('tela-ficar').classList.toggle('escurecida', this.nivel > 0.45);
    const textoVisivel = this.aceso || this.terminado ? 1 : limitar(1 - (this.nivel - 0.5) / 0.45, 0, 1);
    $('ficar-miolo').style.opacity = textoVisivel.toFixed(3);
  },

  tocar() {
    if (!this.ativo || this.terminado) return;
    this.aceso = true;
    $('ficar-acoes').hidden = false;
  },

  continuar() {
    this.aceso = false;
    $('ficar-acoes').hidden = true;
  },

  // fim da rota: acende um pouco e mostra só "encerrar"
  mostrarFim() {
    if (!this.ativo) this.iniciar({ exercicio: { nome: 'Pronto.', como: '' } });
    this.terminado = true;
    this.aceso = true;
    $('ficar-titulo').textContent = 'Pronto.';
    $('ficar-texto').textContent = 'Fica mais um pouco se quiser. Quando levantar, levanta devagar.';
    $('btn-ficar-continuar').hidden = true;
    $('ficar-acoes').hidden = false;
  },

  parar() {
    this.ativo = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    $('tela-ficar').classList.remove('escurecida');
  }
};

aoIniciar.push(() => {
  $('tela-ficar').addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    Ficar.tocar();
  });
  $('btn-ficar-continuar').addEventListener('click', () => Ficar.continuar());
  $('btn-ficar-encerrar').addEventListener('click', () => Sessao.encerrar());
});

/* ---------- 12. PWA ---------- */

aoIniciar.push(() => {
  if (!('serviceWorker' in navigator)) return;
  const registrar = () => navigator.serviceWorker.register('sw.js').catch(() => { /* sem PWA, o app segue igual */ });
  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar);
});
/* ---------- 13. arranque ---------- */

function iniciarApp() {
  Ajustes.carregar();
  $('texto-sinais').textContent = R.sinaisNormais;
  UIAjustes.montar();
  UIInicio.montar();
  aoIniciar.forEach((f) => f());
  Telas.mostrar(ler(CHAVE_SINAIS) === '1' ? 'tela-inicio' : 'tela-sinais');
}

iniciarApp();
