/* =========================================================
   Alongamento — service worker
   Guarda os arquivos do app pra instalar na tela inicial e abrir
   sem internet. Quando mudar qualquer arquivo (textos, desenhos,
   código), troca o número da VERSAO pra forçar a atualização.
   ========================================================= */

const VERSAO = 'alongamento-v2';
const FONTES = 'alongamento-fontes';
// áudios num cache à parte: não somem quando a VERSAO muda (são ~7 MB)
const AUDIO = 'alongamento-audio-v1';

const ARQUIVOS = [
  './',
  './index.html',
  './css/estilo.css',
  './js/rotina.js',
  './js/app.js',
  './js/falas.js',
  './js/checkin.js',
  './js/inicio.js',
  './audio/falas.json',
  './manifest.webmanifest',
  './img/icone.svg',
  './img/icone-180.png',
  './img/icone-192.png',
  './img/icone-512.png',
  './img/icone-512-maskable.png',
  './img/abrir-o-peito.svg',
  './img/alcancar.svg',
  './img/arregalar-e-soltar.svg',
  './img/aterrar.svg',
  './img/barriga-mole.svg',
  './img/barriga-primeiro.svg',
  './img/bascula.svg',
  './img/base-do-cranio.svg',
  './img/bocejo-fundo.svg',
  './img/bocejo.svg',
  './img/borboleta.svg',
  './img/cabeca-pesada.svg',
  './img/cara-de-choro.svg',
  './img/circulos-de-ombro.svg',
  './img/crianca.svg',
  './img/ficar.svg',
  './img/flexor-do-quadril.svg',
  './img/franzir-e-soltar.svg',
  './img/gato-camelo-lento.svg',
  './img/haaa.svg',
  './img/lateral.svg',
  './img/longe-e-perto.svg',
  './img/mandibula-pesada.svg',
  './img/maos-na-barriga.svg',
  './img/maos.svg',
  './img/masseter.svg',
  './img/morder-o-ar.svg',
  './img/ombros.svg',
  './img/orelha-no-ombro.svg',
  './img/palmas-nos-olhos.svg',
  './img/ponte.svg',
  './img/rotacao-lenta.svg',
  './img/seguir-o-ponto.svg',
  './img/soltar-o-ar-todo.svg',
  './img/soltar-o-ar.svg',
  './img/sugar-e-soltar.svg',
  './img/suspiro-com-som.svg',
  './img/torcao-deitada.svg',
  './img/varredura.svg'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO)
      .then((cache) => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((c) => c !== VERSAO && c !== FONTES && c !== AUDIO).map((c) => caches.delete(c))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);

  // áudios gravados: guarda cada um na primeira vez que toca
  if (url.origin === self.location.origin && /\/audio\/[^/]+\.mp3$/.test(url.pathname)) {
    evento.respondWith(
      caches.open(AUDIO).then(async (cache) => {
        const guardado = await cache.match(url.href);
        if (guardado) return guardado;
        const resposta = await fetch(url.href);
        if (resposta.ok) cache.put(url.href, resposta.clone());
        return resposta;
      }).catch(() => Response.error())
    );
    return;
  }

  // arquivos do app: cache primeiro, rede como reserva, index.html pra navegação offline
  if (url.origin === self.location.origin) {
    evento.respondWith(
      caches.match(pedido, { ignoreSearch: true }).then((guardado) => {
        if (guardado) return guardado;
        return fetch(pedido).then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone();
            caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
          }
          return resposta;
        }).catch(() => (pedido.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
      })
    );
    return;
  }

  // Google Fonts: usa o que já tem e atualiza por trás
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    evento.respondWith(
      caches.open(FONTES).then(async (cache) => {
        const guardado = await cache.match(pedido);
        const daRede = fetch(pedido).then((resposta) => {
          if (resposta.ok || resposta.type === 'opaque') cache.put(pedido, resposta.clone());
          return resposta;
        }).catch(() => guardado || Response.error());
        return guardado || daRede;
      })
    );
  }
});
