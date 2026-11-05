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

/* ---------- feedback: chega no próximo commit ---------- */

const Feedback = {
  convidar() { Fluxo.voltarAoInicio(); }
};

aoIniciar.push(() => {
  Checkin.montar();
  Historico.mostrar();
});
