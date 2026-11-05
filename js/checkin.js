/* =========================================================
   Alongamento — checkin.js
   O caminho em volta da sessão:

     Antes de começar (só Completa) → check-in "antes" → sessão
     → check-in "depois" → antes 7 → agora 3 → convite pro feedback

     Historico  os check-ins guardados no aparelho; os 5 últimos no início
     Fluxo      a ordem das telas
     Checkin    a pergunta de 0 a 10
   ========================================================= */
'use strict';

const CHAVE_CHECKINS = 'alongamento.checkins';

const dois = (n) => String(n).padStart(2, '0');
function dataCurta(iso) { const d = new Date(iso); return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`; }
function dataLonga(iso) { const d = new Date(iso); return `${dataCurta(iso)}/${d.getFullYear()}`; }
const ouTraco = (v) => (v === null || v === undefined || v === '' ? '–' : String(v));

function nomeDaRota(tipo, segmentoId) {
  if (tipo === 'completa') return 'Completa';
  if (tipo === 'curta') return 'Curta';
  const seg = Rota.segmentoPorId(segmentoId);
  return seg ? seg.nome : 'Um segmento';
}

/* ---------- histórico ---------- */

const Historico = {
  lista() {
    try {
      const l = JSON.parse(ler(CHAVE_CHECKINS) || '[]');
      return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
  },

  // um registro por sessão: { id, data, rota, antes, depois }
  salvar(r) {
    const l = this.lista();
    const item = { id: r.id, data: r.data, rota: r.rota, antes: r.antes, depois: r.depois };
    const i = l.findIndex((x) => x.id === r.id);
    if (i >= 0) l[i] = item;
    else l.push(item);
    guardar(CHAVE_CHECKINS, JSON.stringify(l.slice(-100)));
    this.mostrar();
  },

  mostrar() {
    const ultimos = this.lista().slice(-5).reverse();
    $('historico').hidden = ultimos.length === 0;
    const ol = $('historico-lista');
    ol.innerHTML = '';
    ultimos.forEach((r) => {
      const li = document.createElement('li');
      const quando = document.createElement('span');
      quando.className = 'historico-quando';
      quando.textContent = `${dataCurta(r.data)} · ${r.rota}`;
      const valores = document.createElement('span');
      valores.className = 'historico-valores';
      valores.textContent = `${ouTraco(r.antes)} → ${ouTraco(r.depois)}`;
      li.append(quando, valores);
      ol.appendChild(li);
    });
  }
};

/* ---------- fluxo ---------- */

const Fluxo = {
  registro: null,  // { id, data, rota, antes, depois } da sessão atual
  pendente: null,  // { tipo, segmentoId } da rota escolhida

  iniciarRota(tipo, segmentoId) {
    Fala.parar();
    this.pendente = { tipo, segmentoId: segmentoId || null };
    this.registro = {
      id: Date.now().toString(36),
      data: new Date().toISOString(),
      rota: nomeDaRota(tipo, segmentoId),
      antes: null,
      depois: null
    };
    if (tipo === 'completa') {
      const minutos = Math.max(1, Math.round(Rota.montar('completa').duracao / 60));
      $('antes-texto').textContent = 'Você vai precisar de um tapete ou colchonete, uma toalha enrolada, ' +
        `uns ${minutos} minutos e o celular apoiado onde dê pra ver deitado.`;
      Telas.mostrar('tela-antes');
    } else {
      Checkin.perguntar('antes');
    }
  },

  comecar() {
    Sessao.iniciar(this.pendente.tipo, this.pendente.segmentoId);
  },

  // check-in final: sempre que a rota chegou ao fim; se encerrou antes, só se respondeu o de antes
  depoisDaSessao(chegouAoFim) {
    const r = this.registro;
    if (r && (chegouAoFim || r.antes !== null)) Checkin.perguntar('depois');
    else this.voltarAoInicio();
  },

  respondeu(momento, valor) {
    const r = this.registro;
    if (!r) { this.voltarAoInicio(); return; }
    if (momento === 'antes') {
      r.antes = valor;
      if (valor !== null) Historico.salvar(r);
      this.comecar();
      return;
    }
    r.depois = valor;
    if (r.antes !== null || valor !== null) Historico.salvar(r);
    if (valor !== null) Resultado.mostrar(r);
    else Feedback.convidar(r);
  },

  voltarAoInicio() {
    this.registro = null;
    this.pendente = null;
    Historico.mostrar();
    Telas.mostrar('tela-inicio');
  }
};

/* ---------- check-in: 0 a 10 ---------- */

const Checkin = {
  momento: 'antes',

  montar() {
    const caixa = $('checkin-botoes');
    for (let n = 0; n <= 10; n++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'escala-num';
      b.textContent = String(n);
      b.setAttribute('aria-label', n === 0 ? '0, nada tenso' : n === 10 ? '10, o mais tenso possível' : String(n));
      b.addEventListener('click', () => Fluxo.respondeu(this.momento, n));
      caixa.appendChild(b);
    }
    $('btn-checkin-pular').addEventListener('click', () => Fluxo.respondeu(this.momento, null));
    $('btn-checkin-voltar').addEventListener('click', () => Fluxo.voltarAoInicio());
    $('btn-pronto').addEventListener('click', () => this.perguntar('antes'));
    $('btn-antes-voltar').addEventListener('click', () => Fluxo.voltarAoInicio());
    $('btn-resultado-seguir').addEventListener('click', () => Feedback.convidar(Fluxo.registro));
  },

  perguntar(momento) {
    this.momento = momento;
    $('checkin-rotulo').textContent = momento === 'antes' ? 'Antes' : 'Depois';
    $('btn-checkin-voltar').hidden = momento !== 'antes';
    Telas.mostrar('tela-checkin');
  }
};

const Resultado = {
  mostrar(r) {
    const caixa = $('resultado-texto');
    caixa.innerHTML = '';
    const par = (rotulo, valor) => {
      const s = document.createElement('span');
      s.className = 'resultado-par';
      const a = document.createElement('span');
      a.className = 'resultado-rotulo';
      a.textContent = rotulo;
      const b = document.createElement('span');
      b.className = 'resultado-num';
      b.textContent = String(valor);
      s.append(a, b);
      return s;
    };
    if (r.antes !== null) {
      const seta = document.createElement('span');
      seta.className = 'resultado-seta';
      seta.textContent = '→';
      caixa.append(par('antes', r.antes), seta);
    }
    caixa.append(par('agora', r.depois));
    Telas.mostrar('tela-resultado');
  }
};

/* ---------- feedback (opcional) ----------
   Uma pergunta por tela, um toque por resposta. Nada é enviado sozinho:
   no fim a pessoa escolhe mandar pelo WhatsApp ou copiar. */

const DISCORDO = ['Discordo totalmente', 'Concordo totalmente'];

const PERGUNTAS = [
  { chave: 'gostou', tipo: 'escala', texto: 'O quanto você gostou de fazer a sessão?', pontas: ['Não gostei nada', 'Gostei muito'] },
  { chave: 'esforco', tipo: 'escala', texto: 'Quanto esforço foi preciso pra seguir a sessão?', pontas: ['Nenhum esforço', 'Muito esforço'] },
  { chave: 'ajudou', tipo: 'escala', texto: 'A sessão me ajudou a soltar a tensão.', pontas: DISCORDO },
  { chave: 'claro', tipo: 'escala', texto: 'Ficou claro pra mim como esses exercícios ajudam a soltar a tensão.', pontas: DISCORDO },
  { chave: 'confianca', tipo: 'escala', texto: 'Quão confiante você se sente pra fazer a sessão de novo, sozinho?', pontas: ['Nada confiante', 'Muito confiante'] },
  { chave: 'geral', tipo: 'escala', texto: 'No geral, quão aceitável foi essa sessão pra você?', pontas: ['Nada aceitável', 'Totalmente aceitável'] },
  { chave: 'facil', tipo: 'escala', texto: 'O app foi fácil de usar.', pontas: DISCORDO },
  { chave: 'denovo', tipo: 'opcoes', texto: 'Você faria de novo?', opcoes: ['Sim', 'Talvez', 'Não'] },
  {
    chave: 'desconforto', tipo: 'opcoes', detalhe: ['Um pouco', 'Sim'],
    texto: 'Sentiu algo desagradável durante ou depois, como tontura, ansiedade forte ou uma tristeza que não passou?',
    opcoes: ['Não', 'Um pouco', 'Sim']
  },
  { chave: 'confuso', tipo: 'texto', texto: 'O que ficou confuso?' },
  { chave: 'mudaria', tipo: 'texto', texto: 'O que você mudaria?' },
  { chave: 'nome', tipo: 'nome', texto: 'Seu nome' }
];

// cria um elemento com classe e texto, sem innerHTML (as respostas são texto livre)
function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function botao(classe, texto, aoTocar) {
  const b = el('button', classe, texto);
  b.type = 'button';
  b.addEventListener('click', aoTocar);
  return b;
}

const Feedback = {
  reg: null,
  r: {},
  i: 0,

  tela() { return $('tela-feedback'); },

  mostrar(...filhos) {
    const t = this.tela();
    t.innerHTML = '';
    t.append(...filhos);
    Telas.mostrar('tela-feedback');
    window.scrollTo(0, 0);
  },

  convidar(reg) {
    this.reg = reg;
    this.r = {};
    this.i = 0;
    const miolo = el('div', 'tela-miolo');
    miolo.append(
      el('p', 'rotulo', 'Antes de ir'),
      el('h1', 'titulo-grande', 'Me ajuda a melhorar o app?'),
      el('p', 'texto-grande', 'Leva uns 2 minutos.')
    );
    const pe = el('footer', 'tela-pe pe-coluna');
    pe.append(
      botao('btn btn-contorno btn-largo', 'Responder', () => this.pergunta(0)),
      botao('btn btn-texto', 'Agora não', () => Fluxo.voltarAoInicio())
    );
    this.mostrar(miolo, pe);
  },

  // topo de cada pergunta: barra de progresso, "3 de 12" e Pular
  topo(i) {
    const topo = el('header', 'fb-topo');
    const barra = el('div', 'progresso');
    const cheia = el('div', 'progresso-cheio');
    cheia.style.width = `${(i / PERGUNTAS.length) * 100}%`;
    barra.appendChild(cheia);
    const linha = el('div', 'fb-topo-linha');
    linha.append(
      el('span', 'rotulo', `${i + 1} de ${PERGUNTAS.length}`),
      botao('btn btn-texto fb-pular', 'Pular', () => this.responder(PERGUNTAS[i].chave, null))
    );
    topo.append(barra, linha);
    return topo;
  },

  pergunta(i) {
    this.i = i;
    if (i >= PERGUNTAS.length) { this.final(); return; }
    const p = PERGUNTAS[i];
    const miolo = el('div', 'tela-miolo fb-miolo');
    miolo.appendChild(el('h1', 'fb-pergunta', p.texto));

    if (p.tipo === 'escala') {
      const escala = el('div', 'fb-escala');
      escala.setAttribute('role', 'group');
      escala.setAttribute('aria-label', `de 1, ${p.pontas[0]}, a 5, ${p.pontas[1]}`);
      [1, 2, 3, 4, 5].forEach((n) => escala.appendChild(botao('fb-num', String(n), () => this.responder(p.chave, n))));
      const pontas = el('p', 'escala-pontas');
      pontas.append(el('span', '', `1 · ${p.pontas[0]}`), el('span', '', `5 · ${p.pontas[1]}`));
      miolo.append(escala, pontas);
    } else if (p.tipo === 'opcoes') {
      const opcoes = el('div', 'fb-opcoes');
      p.opcoes.forEach((o) => opcoes.appendChild(botao('btn btn-contorno btn-largo', o, () => {
        if (p.detalhe && p.detalhe.includes(o)) { this.r[p.chave] = o; this.detalhe(i); }
        else this.responder(p.chave, o);
      })));
      miolo.appendChild(opcoes);
    } else {
      const nome = p.tipo === 'nome';
      const campo = nome ? el('input', 'fb-campo') : el('textarea', 'fb-campo');
      if (nome) { campo.type = 'text'; campo.autocomplete = 'name'; campo.placeholder = 'opcional'; }
      else { campo.rows = 4; campo.placeholder = 'opcional'; }
      campo.setAttribute('aria-label', p.texto);
      const seguir = botao('btn btn-contorno btn-largo', nome ? 'Concluir' : 'Próxima', () => this.responder(p.chave, campo.value.trim()));
      miolo.append(campo, seguir);
    }
    this.mostrar(this.topo(i), miolo);
  },

  // "Um pouco" ou "Sim" no desconforto: campo opcional e a frase de cuidado
  detalhe(i) {
    const p = PERGUNTAS[i];
    const miolo = el('div', 'tela-miolo fb-miolo');
    const campo = el('textarea', 'fb-campo');
    campo.rows = 3;
    campo.placeholder = 'opcional';
    campo.setAttribute('aria-label', 'Se quiser, conta o que foi');
    miolo.append(
      el('h1', 'fb-pergunta', p.texto),
      el('p', 'fb-escolha', this.r[p.chave]),
      el('label', 'fb-rotulo-campo', 'Se quiser, conta o que foi'),
      campo,
      el('p', 'fb-cuidado', 'Se isso continuar, vale conversar com alguém de confiança ou com um profissional.'),
      botao('btn btn-contorno btn-largo', 'Próxima', () => {
        this.r[`${p.chave}Detalhe`] = campo.value.trim();
        this.pergunta(i + 1);
      })
    );
    const topo = this.topo(i);
    // Pular aqui mantém a resposta já dada e só pula o campo
    topo.querySelector('.fb-pular').onclick = (e) => { e.stopImmediatePropagation(); this.pergunta(i + 1); };
    this.mostrar(topo, miolo);
  },

  responder(chave, valor) {
    this.r[chave] = valor;
    this.pergunta(this.i + 1);
  },

  mensagem() {
    const r = this.r;
    const reg = this.reg || { data: new Date().toISOString(), rota: '–', antes: null, depois: null };
    const v = (x) => (x === null || x === undefined || x === '' ? '–' : x);
    const c = (x) => (x === null || x === undefined ? '–' : `${x}/5`);
    const desconforto = v(r.desconforto) + (r.desconfortoDetalhe ? ` (${r.desconfortoDetalhe})` : '');
    return [
      'Feedback do app de alongamento',
      `Nome: ${v(r.nome)}`,
      `Data: ${dataLonga(reg.data)} · Rota: ${reg.rota}`,
      `Tensão: antes ${v(reg.antes)} → depois ${v(reg.depois)}`,
      `Gostou: ${c(r.gostou)} · Esforço: ${c(r.esforco)}`,
      `Ajudou a soltar: ${c(r.ajudou)} · Ficou claro: ${c(r.claro)}`,
      `Confiança pra repetir: ${c(r.confianca)} · Geral: ${c(r.geral)}`,
      `Fácil de usar: ${c(r.facil)} · Faria de novo: ${v(r.denovo)}`,
      `Desconforto: ${desconforto}`,
      `Confuso: ${v(r.confuso)}`,
      `Mudaria: ${v(r.mudaria)}`
    ].join('\n');
  },

  final() {
    const texto = this.mensagem();
    const miolo = el('div', 'tela-miolo fb-miolo');
    const zap = el('a', 'btn btn-contorno btn-largo', 'Mandar pro Juan pelo WhatsApp');
    zap.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    zap.target = '_blank';
    zap.rel = 'noopener';
    const copiar = botao('btn btn-texto', 'Copiar respostas', () => this.copiar(texto, copiar));
    const acoes = el('div', 'pe-coluna');
    acoes.append(zap, copiar);
    miolo.append(
      el('p', 'rotulo', 'Obrigado'),
      el('p', 'fb-nota', 'Suas respostas ficaram assim. Nada foi enviado: você escolhe se manda.'),
      el('pre', 'fb-resumo', texto),
      acoes
    );
    const pe = el('footer', 'tela-pe pe-coluna');
    pe.appendChild(botao('btn btn-texto', 'voltar ao início', () => Fluxo.voltarAoInicio()));
    this.mostrar(miolo, pe);
  },

  async copiar(texto, b) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(texto);
      ok = true;
    } catch (e) {
      const area = el('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      area.remove();
    }
    b.textContent = ok ? 'Copiado' : 'Não deu pra copiar: seleciona o texto acima';
  }
};

aoIniciar.push(() => {
  Checkin.montar();
  Historico.mostrar();
});
