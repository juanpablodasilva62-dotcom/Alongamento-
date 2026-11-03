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
