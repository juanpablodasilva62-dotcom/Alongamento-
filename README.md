# Alongamento

Rotina reichiana de alongamento e respiração, em português do Brasil, pra fazer deitado no chão com o celular do lado. Sem build, sem framework, sem npm: é só HTML, CSS e JavaScript servidos pelo GitHub Pages.

## Como abrir no celular

1. No GitHub, abre o repositório, vai em **Settings → Pages**, em *Build and deployment* escolhe **Deploy from a branch**, branch **main**, pasta **/ (root)**, e salva.
2. Em um ou dois minutos o app fica no ar em `https://juanpablodasilva62-dotcom.github.io/Alongamento-/`.
3. Pra instalar na tela inicial:
   - **Android (Chrome):** menu ⋮ → *Adicionar à tela inicial* (ou *Instalar app*).
   - **iPhone/iPad (Safari):** botão de compartilhar → *Adicionar à Tela de Início*.
4. Depois da primeira abertura com internet, o app funciona offline.

Na primeira vez aparece a tela "Sinais normais", que não volta mais. Dá pra rever pelos Ajustes.

## Telas

- **Início:** três rotas (Completa, Curta, Um segmento) e a lista dos sete segmentos. A duração mostrada é calculada a partir dos dados da rotina e do ritmo de respiração escolhido nos Ajustes.
- **Antes de começar:** só na Completa: o que vai precisar e quanto tempo leva (a mesma duração da tela inicial).
- **Check-in:** "Quão tenso você tá agora?", de 0 a 10, antes de qualquer rota e depois do Ficar. Depois mostra "antes 7 → agora 3". Fica guardado no aparelho; os 5 últimos aparecem discretos no início.
- **Sessão:** nome e cor do segmento, nome do exercício, a ilustração num card branco com o anel de respiração em volta (cresce no entra, encolhe no solta, para na espera), a palavra da fase embaixo, o contador, o "como", a legenda da fala e os controles. Tocar na imagem abre em tela cheia. "Ficou forte" fica sempre visível.
- **Feedback:** opcional, depois do check-in final. Doze perguntas curtas e uma tela com o resumo, pra mandar pelo WhatsApp ou copiar. Nada é enviado sozinho.
- **Aterrar:** abre pelo "ficou forte". Pausa tudo, um minuto de guia só de expiração, depois "voltar". "Encerrar" fica visível desde o começo.
- **Ficar:** a tela escurece aos poucos, sem contador. Um toque acende e mostra "continuar" ou "encerrar". No fim da rota toca um acorde e aparece "Pronto".
- **Ajustes:** folha que sobe de baixo. Ritmo da respiração, voz, sons, tela ligada e velocidade do ponto ocular. Tudo fica salvo no aparelho.

No modo **Um segmento** o app roda Chegar antes e Ficar depois, sempre. Se escolher Pélvico, roda o Diafragmático antes. A intro e o fim de cada segmento só aparecem na Completa e no Um segmento; na Curta só tocam o áudio de cada exercício e as deixas.

## Voz gravada

As falas ficam em `audio/<id>.mp3`, e `audio/falas.json` lista cada uma com `{id, bloco, tipo, segmento, texto, duracao}` (duração em segundos). O app usa o texto pra legenda e pra voz do aparelho, e a duração pra calcular os tempos.

- **Exercício:** `audio/<id-do-exercicio>.mp3` toca primeiro, com o guia parado; o contador começa quando ele acaba. `<id>-meio` toca na metade.
- **Segmento:** `<segmento>-intro` (a tela dura o áudio + 1 s) e `<segmento>-fim`. Na Completa, antes de tudo, `abertura` e `chegar-intro`.
- **Deixas:** `entra-1..3`, `solta-1..3`, `espera-1..3`, sorteadas, só nas 2 primeiras respirações de cada exercício. `outro-lado-1..2` na troca de lado, `ultima` na última repetição ou respiração.
- **Outras:** `soltar-o-ar-som` nas 3 últimas do "Soltar o ar", `seguir-o-ponto-lados` quando o ponto passa pro lado a lado, `ficar` / `ficar-fim` (20 s antes do fim) / `fim`, `sinais-normais` no botão Ouvir, `pausa-aterrar` / `-meio` / `-fim` no "ficou forte".
- Nunca tocam dois áudios juntos: uma deixa não entra por cima de fala, e uma fala extra espera a vez.
- Nos Ajustes: voz gravada, voz do aparelho ou sem voz, e o volume da voz. Se um arquivo faltar ou falhar, a voz do aparelho lê o mesmo texto.
- Sem internet: cada áudio fica guardado na primeira vez que toca, e "Baixar todos os áudios" nos Ajustes guarda tudo de uma vez (~6 MB).

Pra trocar uma fala: salva o mp3 novo com o mesmo nome e atualiza `texto` e `duracao` no `falas.json`. Quem já baixou os áudios só recebe o arquivo novo se o nome do cache de áudio (`AUDIO` no `sw.js`) mudar.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `index.html` | A página única com as cinco telas e a folha de ajustes. |
| `css/estilo.css` | Visual: cores por segmento, tipografia, telas. |
| `js/rotina.js` | **Só dados:** segmentos, exercícios, textos, tempos, rota curta. É aqui que você edita a rotina. |
| `js/app.js` | A lógica: relógio, guia, contadores, som, voz do aparelho, aterrar, ficar, PWA. |
| `js/falas.js` | A voz gravada: tocador, legenda, pré-carregamento e "Baixar todos os áudios". |
| `js/checkin.js` | Antes de começar, check-in de tensão, histórico e feedback. |
| `js/inicio.js` | Liga o app depois que todos os arquivos carregaram. |
| `audio/` | As falas gravadas (`<id>.mp3`) e o `falas.json`. |
| `img/<id>.webp` | Ilustração nova do exercício. Se não existir, o app usa o `.svg`. |
| `img/<id>.svg` | Ilustração antiga, nomeada pelo id do exercício. |
| `img/icone*` | Ícone do app. |
| `manifest.webmanifest` | Nome, cores e ícones pra instalar na tela inicial. |
| `sw.js` | Service worker: guarda os arquivos pra funcionar offline. |

## Como trocar as ilustrações

**Imagens novas (`.webp`):** salva em `img/<id>.webp`, com o mesmo id do exercício. Quadrada, fundo branco (as primeiras têm 1200×1200). O app tenta o `.webp` primeiro e, se não achar, usa o `.svg`; não precisa mexer em código nem no `sw.js`. A imagem fica guardada pra uso offline na primeira vez que aparece.

**Ilustrações antigas (`.svg`):** cada exercício tem um arquivo `img/<id>.svg`, onde `<id>` é o id do exercício em `js/rotina.js` (por exemplo `img/arregalar-e-soltar.svg`). Pra colocar os seus desenhos:

1. Exporta cada desenho em SVG com **`viewBox="0 0 200 200"`**, traço de **2,5**, **sem preenchimento**.
2. Salva por cima do arquivo com o **mesmo nome**.
3. A cor do traço vem do app (a cor do segmento), não do arquivo: pode deixar o traço preto ou `currentColor` que o app pinta. Se algum traço não mudar de cor, é porque o programa de desenho colocou a cor como `style="stroke:..."` dentro da tag; apaga esse `style` ou troca por `stroke="currentColor"`.
4. Troca o número da `VERSAO` no começo de `sw.js` (por exemplo `alongamento-v2`) pra quem já instalou receber os desenhos novos.

Os ids dos 39 exercícios são:

`varredura`, `soltar-o-ar`, `arregalar-e-soltar`, `seguir-o-ponto`, `longe-e-perto`, `franzir-e-soltar`, `palmas-nos-olhos`, `mandibula-pesada`, `bocejo`, `morder-o-ar`, `sugar-e-soltar`, `cara-de-choro`, `masseter`, `cabeca-pesada`, `rotacao-lenta`, `orelha-no-ombro`, `suspiro-com-som`, `base-do-cranio`, `soltar-o-ar-todo`, `abrir-o-peito`, `alcancar`, `ombros`, `circulos-de-ombro`, `maos`, `barriga-primeiro`, `haaa`, `lateral`, `gato-camelo-lento`, `bocejo-fundo`, `barriga-mole`, `torcao-deitada`, `crianca`, `maos-na-barriga`, `bascula`, `ponte`, `borboleta`, `flexor-do-quadril`, `aterrar`, `ficar`.

No exercício "Seguir o ponto", a imagem aparece enquanto a fala toca; depois o ponto anda por cima dela, com a imagem apagadinha.

## Como mudar textos e tempos

Tudo está em `js/rotina.js`. Cada exercício tem este formato:

```js
{
  id: 'arregalar-e-soltar',          // nome do arquivo em img/
  nome: 'Arregalar e soltar',        // título na tela
  como: 'Abre os olhos como num susto, ...',  // lido pela voz
  respiracao: 'solta o ar ao relaxar',        // 'livre' mostra "respiração livre"; '' não mostra nada
  contagem: { tipo: 'vezes', valor: 6, intervalo: 5 }
}
```

Os três tipos de contagem:

- `{ tipo: 'respiracoes', valor: 8 }`: 8 ciclos do guia, no ritmo dos Ajustes (padrão 4/6/2 s).
- `{ tipo: 'vezes', valor: 6, intervalo: 5 }`: 6 repetições, um toque sonoro a cada 5 s. Sem `intervalo`, vale `intervaloVezPadrao` (4 s).
- `{ tipo: 'segundos', valor: 30 }`: cronômetro. Com `cadaLado: true`, roda duas vezes com aviso de troca.

Outras coisas no mesmo arquivo:

- `intro` de cada segmento e `duracaoIntro` (segundos).
- `sinaisNormais`, `textoAterrar`, `duracaoAterrar`.
- `ajustesPadrao`: o que vale antes da pessoa mexer nos Ajustes.
- `pontoOcular`: segundos por volta do ponto, pra cada velocidade.
- `rotaCurta`: lista de exercícios na ordem, apontando pelo id do segmento e do exercício, com a contagem que quiser. Sem contagem, usa a do exercício.

Pra adicionar um exercício novo: inclui o objeto no segmento certo, cria o `img/<id>.svg` e adiciona o arquivo na lista `ARQUIVOS` do `sw.js`. Depois de qualquer mudança, troca a `VERSAO` no `sw.js`.

Os tempos mostrados no início ("~50 min") são somados a partir destes dados, mais a duração das falas gravadas (que tocam antes de cada contador). Com "sem voz", as falas dos exercícios não contam. Se quiser uma Completa mais curta de verdade, é aqui que se corta.

## Editando pelo celular

No app do GitHub ou no site: abre o arquivo, toca no lápis, edita, e faz o commit na branch `main`. O Pages atualiza sozinho em um ou dois minutos. Em quem já instalou, o app pega a versão nova na abertura seguinte, desde que a `VERSAO` do `sw.js` tenha mudado.

## Detalhes que valem saber

- **Som:** gerado pela Web Audio API, sem arquivos. No iPhone o som só começa depois de um toque, por isso tudo nasce quando você toca numa rota.
- **Voz:** por padrão, a voz gravada. No iPhone o áudio só toca sozinho depois de um toque: o primeiro toque em qualquer lugar do app destrava. O iPhone também ignora o volume da voz do app (vale o botão do aparelho); os Ajustes avisam quando é o caso. A voz do aparelho (Web Speech API) é a reserva; se não houver voz em português, o app avisa. No Android, instalar "Google Text-to-speech" com o pacote de português resolve.
- **Tela ligada:** usa a Wake Lock API. Funciona no Chrome e no Safari a partir do iOS 16.4. Onde não funciona, aumenta o tempo de bloqueio do aparelho antes da sessão.
- **Fontes:** Fraunces e Hanken Grotesk, do Google Fonts, o único recurso de fora. Depois da primeira visita ficam em cache pra uso offline.
- **Movimento:** com "reduzir movimento" ligado no aparelho, as transições somem e o Ficar escurece mais rápido. O guia de respiração continua, porque é a função do app.
