# Alongamento: instruções pro Claude

App de alongamento e respiração baseado nos 7 segmentos de Reich. HTML, CSS e JavaScript puros, sem build nem npm, publicado pelo GitHub Pages a partir da `main` (raiz). O Juan usa só celular e tablet, então o teste final é sempre no celular.

## Estrutura
- `index.html`: página única com todas as telas.
- `css/estilo.css`: visual (cores por segmento, tipografia).
- `js/rotina.js`: só dados: segmentos, exercícios, textos, tempos e a rota Curta.
- `js/app.js`: lógica da sessão, guia de respiração, contadores, voz do aparelho, Aterrar, Ficar e PWA.
- `js/falas.js`: voz gravada: tocador, legenda, pré-carregamento e "Baixar todos os áudios".
- `js/checkin.js`: "Antes de começar", check-in de tensão, histórico e feedback.
- `js/inicio.js`: liga o app.
- `sw.js`: service worker (cache offline). `manifest.webmanifest`: instalação na tela inicial.
- Telas e funcionamento em detalhe: `README.md`.

## Ids
- **Exercício:** o `id` em `js/rotina.js` (39 ao todo, ex.: `soltar-o-ar`, `bascula`).
- **Imagem:** `img/<id>.webp` (nova, quadrada, fundo branco). Se não existir, o app usa `img/<id>.svg`. Imagem nova subida em `img/` aparece sozinha, sem mudar código.
- **Áudio:** `audio/<id>.mp3`, listados em `audio/falas.json` como `{id, bloco, tipo, segmento, texto, duracao}`.
  - Exercício: `<id>` e, em alguns, `<id>-meio`.
  - Segmento: `<segmento>-intro` e `<segmento>-fim` (ocular, oral, cervical, toracico, diafragmatico, abdominal, pelvico).
  - Gerais: `abertura`, `chegar-intro`, `soltar-o-ar-som`, `seguir-o-ponto-lados`, `ficar`, `ficar-fim`, `fim`, `sinais-normais`, `pausa-aterrar`, `pausa-aterrar-meio`, `pausa-aterrar-fim`.
  - Deixas: `entra-1` a `entra-3`, `solta-1` a `solta-3`, `espera-1` a `espera-3`, `outro-lado-1`, `outro-lado-2`, `ultima`.

## Regras
- Não mudar textos, exercícios, ordem nem tempos da rotina sem o Juan pedir.
- A ordem dos segmentos é fixa: ocular, oral, cervical, torácico, diafragmático, abdominal, pélvico. A pelve é sempre a última.
- Commits pequenos, com mensagem em português.
- Testar a 360 px de largura, inclusive em tela baixa (360×640), antes de dar como pronto.
- Mudou arquivo do app (HTML, CSS, JS ou SVG): sobe a `VERSAO` no `sw.js`. Trocou um mp3: muda o nome do cache `AUDIO` no `sw.js`.
- Falar com o Juan em português simples e direto: ele não é programador e usa só celular e tablet.
