/* Alongamento — checkin.js
   O caminho em volta da sessão. */
'use strict';

const Fluxo = {
  iniciarRota(tipo, segmentoId) {
    Sessao.iniciar(tipo, segmentoId);
  },

  depoisDaSessao() {
    Telas.mostrar('tela-inicio');
  }
};
