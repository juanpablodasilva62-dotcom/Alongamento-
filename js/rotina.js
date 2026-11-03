/* =========================================================
   Alongamento — rotina.js
   SÓ DADOS. Aqui você muda textos, tempos e ordem sem
   mexer na lógica (que fica em app.js).

   Cada exercício:
     id          nome do arquivo em img/<id>.svg
     nome        título na tela
     como        1–2 frases, lidas pela voz
     respiracao  deixa curta sobre a respiração
                 'livre'  → mostra "respiração livre"
                 ''       → não mostra nada
     contagem    { tipo: 'respiracoes', valor: 8 }
                 { tipo: 'vezes', valor: 6, intervalo: 5 }   intervalo em s (padrão 4)
                 { tipo: 'segundos', valor: 30 }
                 { tipo: 'segundos', valor: 20, cadaLado: true }  divide em dois lados
     ponto       true → mostra o ponto ocular animado no lugar da ilustração
     escurecer   true → tela do Ficar (escurece aos poucos)

   Tempos em segundos. A duração mostrada no início é calculada
   a partir destes dados e do ritmo de respiração escolhido.
   ========================================================= */

window.ROTINA = {

  posicaoPadrao: 'Deitado de costas, joelhos dobrados.',

  sinaisNormais:
    'Bocejo, suspiro, lágrima, tremor leve nas pernas ou no queixo, formigamento, calor: ' +
    'é o corpo soltando. Se vier tontura, ansiedade forte ou choro que não passa, ' +
    'aperta "ficou forte".',

  ajustesPadrao: {
    entra: 4,            // s
    sai: 6,              // s
    pausa: 2,            // s
    voz: true,
    vozNome: '',         // vazio = a melhor voz pt-BR que o aparelho tiver
    velocidadeVoz: 0.95, // 0.7 a 1.3
    sons: true,
    volume: 0.6,         // 0 a 1
    telaLigada: true,
    velocidadePonto: 'medio' // 'lento' | 'medio' | 'rapido'
  },

  intervaloVezPadrao: 4,   // s entre repetições quando o exercício não diz
  duracaoIntro: 10,        // s da intro de cada segmento (só Completa e Um segmento)

  // período de uma volta do ponto ocular, em s
  pontoOcular: { lento: 10, medio: 7, rapido: 5 },

  textoAterrar: 'Abre os olhos, olha o quarto, apoia os pés no chão, solta o ar devagar.',
  duracaoAterrar: 60,

  /* ---------- Chegar ---------- */
  chegar: {
    id: 'chegar',
    nome: 'Chegar',
    partes: '',
    cor: 'var(--cor-neutra)',
    intro: '',
    exercicios: [
      {
        id: 'varredura',
        nome: 'Varredura',
        como: 'Passa a atenção por testa, mandíbula, ombros, barriga, virilha, sem mexer em nada, só notando onde aperta.',
        respiracao: 'livre',
        contagem: { tipo: 'segundos', valor: 40 }
      },
      {
        id: 'soltar-o-ar',
        nome: 'Soltar o ar',
        como: 'Expira até o fim, espera no vazio, deixa o ar entrar sozinho. Nas 3 últimas, solta com um suspiro sonoro.',
        respiracao: '',
        contagem: { tipo: 'respiracoes', valor: 8 }
      }
    ]
  },

  /* ---------- Os 7 segmentos, de cima pra baixo ---------- */
  segmentos: [
    {
      id: 'ocular',
      nome: 'Ocular',
      partes: 'olhos, testa, couro cabeludo',
      cor: 'var(--cor-ocular)',
      intro: 'Aqui a couraça prende medo e choro. O olhar fica fixo e a testa não mexe. A ideia é devolver movimento ao olhar.',
      exercicios: [
        {
          id: 'arregalar-e-soltar',
          nome: 'Arregalar e soltar',
          como: 'Abre os olhos como num susto, testa pra cima, segura 3 segundos, solta tudo de uma vez.',
          respiracao: 'solta o ar ao relaxar',
          contagem: { tipo: 'vezes', valor: 6, intervalo: 5 }
        },
        {
          id: 'seguir-o-ponto',
          nome: 'Seguir o ponto',
          como: 'Segue com os olhos o ponto na tela, cabeça parada.',
          respiracao: 'livre',
          contagem: { tipo: 'segundos', valor: 60 },
          ponto: true
        },
        {
          id: 'longe-e-perto',
          nome: 'Longe e perto',
          como: 'Olha um ponto longe, teto ou janela, depois a palma da mão a 20 centímetros do rosto.',
          respiracao: 'solta o ar no "perto"',
          contagem: { tipo: 'vezes', valor: 6, intervalo: 5 }
        },
        {
          id: 'franzir-e-soltar',
          nome: 'Franzir e soltar',
          como: 'Franze a testa forte, junta as sobrancelhas, solta.',
          respiracao: 'solta o ar ao relaxar',
          contagem: { tipo: 'vezes', valor: 5 }
        },
        {
          id: 'palmas-nos-olhos',
          nome: 'Palmas nos olhos',
          como: 'Esfrega as mãos até esquentar, cobre os olhos fechados sem apertar, escuro total.',
          respiracao: '',
          contagem: { tipo: 'respiracoes', valor: 6 }
        }
      ]
    },

    {
      id: 'oral',
      nome: 'Oral',
      partes: 'boca, mandíbula, queixo, garganta alta',
      cor: 'var(--cor-oral)',
      intro: 'Prende choro, raiva de morder e vontade de sugar. Maxilar travado, lábios apertados. Deixa a mandíbula pesar.',
      exercicios: [
        {
          id: 'mandibula-pesada',
          nome: 'Mandíbula pesada',
          como: 'Boca entreaberta, língua solta. A cada saída de ar deixa o queixo cair um pouco mais.',
          respiracao: '',
          contagem: { tipo: 'respiracoes', valor: 8 }
        },
        {
          id: 'bocejo',
          nome: 'Bocejo',
          como: 'Abre a boca como num bocejo e deixa vir um de verdade.',
          respiracao: 'natural',
          contagem: { tipo: 'vezes', valor: 3, intervalo: 8 }
        },
        {
          id: 'morder-o-ar',
          nome: 'Morder o ar',
          como: 'Abre e fecha a boca mastigando o ar, exagerado, lento.',
          respiracao: 'livre',
          contagem: { tipo: 'vezes', valor: 10, intervalo: 3 }
        },
        {
          id: 'sugar-e-soltar',
          nome: 'Sugar e soltar',
          como: 'Faz bico puxando o ar como num canudo, solta com um "pah".',
          respiracao: 'solta o ar no "pah"',
          contagem: { tipo: 'vezes', valor: 8 }
        },
        {
          id: 'cara-de-choro',
          nome: 'Cara de choro',
          como: 'Puxa os cantos da boca pra baixo e o queixo pra frente, segura 2 segundos, solta.',
          respiracao: 'solta o ar ao relaxar',
          contagem: { tipo: 'vezes', valor: 5 }
        },
        {
          id: 'masseter',
          nome: 'Masseter',
          como: 'Dedos nos músculos da bochecha, perto da articulação, círculos lentos, boca entreaberta.',
          respiracao: 'livre',
          contagem: { tipo: 'segundos', valor: 30 }
        }
      ]
    },

    {
      id: 'cervical',
      nome: 'Cervical',
      partes: 'pescoço, nuca, garganta',
      cor: 'var(--cor-cervical)',
      intro: 'Prende raiva e choro engolidos. Pescoço rígido, voz presa. Cabeça que pesa e garganta que solta som.',
      exercicios: [
        {
          id: 'cabeca-pesada',
          nome: 'Cabeça pesada',
          como: 'Queixo um pouco pra baixo, nuca alongando no chão.',
          respiracao: 'solta a nuca a cada saída de ar',
          contagem: { tipo: 'respiracoes', valor: 6 }
        },
        {
          id: 'rotacao-lenta',
          nome: 'Rotação lenta',
          como: 'Vira o rosto pra um lado até o limite confortável, volta ao centro, vai pro outro.',
          respiracao: 'solta o ar enquanto vira',
          contagem: { tipo: 'vezes', valor: 6, intervalo: 6 }
        },
        {
          id: 'orelha-no-ombro',
          nome: 'Orelha no ombro',
          como: 'Inclina a cabeça pra um lado. A mão do mesmo lado puxa de leve o ombro oposto pra baixo.',
          respiracao: 'solta o ar no alongamento',
          contagem: { tipo: 'segundos', valor: 20, cadaLado: true }
        },
        {
          id: 'suspiro-com-som',
          nome: 'Suspiro com som',
          como: 'Solta o ar com um "aaah" baixo, garganta aberta, sem forçar a voz.',
          respiracao: '',
          contagem: { tipo: 'respiracoes', valor: 6 }
        },
        {
          id: 'base-do-cranio',
          nome: 'Base do crânio',
          como: 'Polegares na base da nuca, pressão leve em círculos.',
          respiracao: 'livre',
          contagem: { tipo: 'segundos', valor: 30 }
        }
      ]
    },

    {
      id: 'toracico',
      nome: 'Torácico',
      partes: 'peito, ombros, braços, mãos',
      cor: 'var(--cor-toracico)',
      intro: 'O centro da couraça: o peito preso no alto, cheio de ar. Prende raiva, choro fundo e saudade. Deixa o peito descer.',
      exercicios: [
        {
          id: 'soltar-o-ar-todo',
          nome: 'Soltar o ar todo',
          como: 'Expira até o fim com um suspiro, deixa o peito afundar, espera. A inspiração vem sozinha, sem puxar.',
          respiracao: '',
          contagem: { tipo: 'respiracoes', valor: 10 }
        },
        {
          id: 'abrir-o-peito',
          nome: 'Abrir o peito',
          como: 'Toalha enrolada atravessada embaixo das escápulas, braços abertos no chão.',
          respiracao: 'costelas abrindo pros lados',
          contagem: { tipo: 'respiracoes', valor: 8 }
        },
        {
          id: 'alcancar',
          nome: 'Alcançar',
          como: 'Braços estendidos pra cima, mãos abertas como pra pegar algo, segura 3 segundos, deixa cair pesado.',
          respiracao: 'solta o ar na queda',
          contagem: { tipo: 'vezes', valor: 6, intervalo: 6 }
        },
        {
          id: 'ombros',
          nome: 'Ombros',
          como: 'Encolhe até a orelha, segura 3 segundos, solta de uma vez.',
          respiracao: 'solta o ar ao soltar',
          contagem: { tipo: 'vezes', valor: 6, intervalo: 5 }
        },
        {
          id: 'circulos-de-ombro',
          nome: 'Círculos de ombro',
          como: 'Círculos pra trás, lentos.',
          respiracao: 'livre',
          contagem: { tipo: 'vezes', valor: 10, intervalo: 3 }
        },
        {
          id: 'maos',
          nome: 'Mãos',
          como: 'Abre e fecha forte, depois sacode braços e mãos soltos.',
          respiracao: 'livre',
          contagem: { tipo: 'segundos', valor: 20 }
        }
      ]
    },

    {
      id: 'diafragmatico',
      nome: 'Diafragmático',
      partes: 'diafragma, estômago, plexo solar',
      cor: 'var(--cor-diafragmatico)',
      intro: 'O segmento mais difícil e mais importante: um cinto de tensão que impede soltar o ar até o fim. Barriga primeiro, saída longa.',
      exercicios: [
        {
          id: 'barriga-primeiro',
          nome: 'Barriga primeiro',
          como: 'Mão na barriga, mão no peito. Deixa a barriga subir antes do peito e cair primeiro na saída.',
          respiracao: 'saída longa',
          contagem: { tipo: 'respiracoes', valor: 8 }
        },
        {
          id: 'haaa',
          nome: '"Haaa"',
          como: 'Solta o ar com um "haaa" aberto, como embaçando um vidro, até o fim, sem forçar.',
          respiracao: '',
          contagem: { tipo: 'respiracoes', valor: 6 }
        },
        {
          id: 'lateral',
          nome: 'Lateral',
          como: 'Sentado ou em pé, braço por cima da cabeça, inclina pro lado oposto, respira pro lado alongado.',
          respiracao: '',
          contagem: { tipo: 'segundos', valor: 25, cadaLado: true }
        },
        {
          id: 'gato-camelo-lento',
          nome: 'Gato-camelo lento',
          como: 'Quatro apoios. Arredonda as costas soltando o ar, abre o peito deixando o ar entrar.',
          respiracao: 'no ritmo da respiração',
          contagem: { tipo: 'respiracoes', valor: 8 }
        },
        {
          id: 'bocejo-fundo',
          nome: 'Bocejo fundo',
          como: 'Bocejo com os braços pra cima, alongando o tronco inteiro.',
          respiracao: 'natural',
          contagem: { tipo: 'vezes', valor: 2, intervalo: 10 }
        }
      ]
    },

    {
      id: 'abdominal',
      nome: 'Abdominal',
      partes: 'parede da barriga, flancos, lombar',
      cor: 'var(--cor-abdominal)',
      intro: 'Prende birra e medo. Barriga dura o dia inteiro. Barriga mole, que cai sozinha na saída do ar.',
      exercicios: [
        {
          id: 'barriga-mole',
          nome: 'Barriga mole',
          como: 'Deitado, joelhos dobrados. A cada saída de ar deixa a parede da barriga despencar, sem empurrar nem puxar.',
          respiracao: '',
          contagem: { tipo: 'respiracoes', valor: 8 }
        },
        {
          id: 'torcao-deitada',
          nome: 'Torção deitada',
          como: 'Joelhos juntos caem pra um lado, braços abertos, rosto vira pro outro.',
          respiracao: 'respira na barriga',
          contagem: { tipo: 'segundos', valor: 30, cadaLado: true }
        },
        {
          id: 'crianca',
          nome: 'Criança',
          como: 'Sentado nos calcanhares, testa no chão, braços pra trás.',
          respiracao: 'respira nas costas',
          contagem: { tipo: 'segundos', valor: 45 }
        },
        {
          id: 'maos-na-barriga',
          nome: 'Mãos na barriga',
          como: 'Palma em círculos lentos no sentido horário, pressão leve.',
          respiracao: 'livre',
          contagem: { tipo: 'segundos', valor: 30 }
        }
      ]
    },

    {
      id: 'pelvico',
      nome: 'Pélvico',
      partes: 'pelve, quadril, virilha, pernas',
      cor: 'var(--cor-pelvico)',
      intro: 'Último de propósito. Prende ansiedade e raiva; pelve puxada pra trás, virilha dura. A pelve rola pra frente no fim da expiração, sem força.',
      exercicios: [
        {
          id: 'bascula',
          nome: 'Báscula com a respiração',
          como: 'Deitado, joelhos dobrados. Ao soltar o ar, a lombar encosta no chão e a pelve rola pra frente. Ao entrar, volta ao neutro.',
          respiracao: '',
          contagem: { tipo: 'respiracoes', valor: 12 }
        },
        {
          id: 'ponte',
          nome: 'Ponte',
          como: 'Sobe o quadril devagar soltando o ar, desce vértebra por vértebra deixando o ar entrar.',
          respiracao: '',
          contagem: { tipo: 'respiracoes', valor: 6 }
        },
        {
          id: 'borboleta',
          nome: 'Borboleta',
          como: 'Plantas dos pés juntas, joelhos abertos caindo pros lados, mãos na barriga.',
          respiracao: 'solta a virilha a cada saída de ar',
          contagem: { tipo: 'respiracoes', valor: 6 }
        },
        {
          id: 'flexor-do-quadril',
          nome: 'Flexor do quadril',
          como: 'Ajoelhado numa perna, a outra à frente. Leva a pelve pra frente, tronco reto.',
          respiracao: 'solta o ar empurrando a pelve',
          contagem: { tipo: 'segundos', valor: 30, cadaLado: true }
        },
        {
          id: 'aterrar',
          nome: 'Aterrar',
          como: 'Em pé, pés na largura do quadril, joelhos um pouco dobrados, peso nos pés. Se as pernas tremerem, deixa.',
          respiracao: '',
          contagem: { tipo: 'respiracoes', valor: 8 }
        }
      ]
    }
  ],

  /* ---------- Ficar ---------- */
  ficar: {
    id: 'ficar',
    nome: 'Ficar',
    partes: '',
    cor: 'var(--cor-neutra)',
    intro: '',
    exercicios: [
      {
        id: 'ficar',
        nome: 'Ficar',
        como: 'Deitado, braços soltos, sem tarefa: só deixar o corpo respirar e notar o que mudou, de cima pra baixo. Se vier tremor, suspiro ou bocejo, deixa passar.',
        respiracao: 'livre',
        contagem: { tipo: 'segundos', valor: 120 },
        escurecer: true
      }
    ]
  },

  /* ---------- Rota Curta ----------
     Cada item aponta pra um exercício existente e pode trocar
     só a contagem. Sem intro de segmento. */
  rotaCurta: [
    { segmento: 'chegar',        exercicio: 'soltar-o-ar',       contagem: { tipo: 'respiracoes', valor: 5 } },
    { segmento: 'ocular',        exercicio: 'arregalar-e-soltar' },
    { segmento: 'ocular',        exercicio: 'seguir-o-ponto',    contagem: { tipo: 'segundos', valor: 60 } },
    { segmento: 'oral',          exercicio: 'mandibula-pesada',  contagem: { tipo: 'respiracoes', valor: 5 } },
    { segmento: 'cervical',      exercicio: 'suspiro-com-som',   contagem: { tipo: 'respiracoes', valor: 5 } },
    { segmento: 'toracico',      exercicio: 'soltar-o-ar-todo',  contagem: { tipo: 'respiracoes', valor: 8 } },
    { segmento: 'diafragmatico', exercicio: 'barriga-primeiro',  contagem: { tipo: 'respiracoes', valor: 8 } },
    { segmento: 'abdominal',     exercicio: 'barriga-mole',      contagem: { tipo: 'respiracoes', valor: 5 } },
    { segmento: 'pelvico',       exercicio: 'bascula',           contagem: { tipo: 'respiracoes', valor: 8 } },
    { segmento: 'ficar',         exercicio: 'ficar',             contagem: { tipo: 'segundos', valor: 60 } }
  ]
};
