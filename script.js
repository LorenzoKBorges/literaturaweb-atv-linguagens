/**
 * A Fita 13 — O Segredo Antes do Silêncio
 * Livro-jogo interativo (HTML/CSS/JS puro, sem dependências de build).
 *
 * Estrutura deste arquivo:
 *   DATA        -> conteúdo estático (metadados de início/caminho, textos de pista)
 *   STATE       -> estado mutável da leitura + estado de cada quebra-cabeça
 *   ACTIONS     -> tudo que uma interação do leitor pode disparar
 *   COMPONENTS  -> pedaços de HTML reutilizados entre telas (topo, diário de pistas)
 *   SCREENS     -> uma função por tela, retorna o HTML daquela tela
 *   RENDER      -> desenha a tela atual no DOM e liga os eventos de clique
 *
 * Precisa ser servido junto de index.html e styles.css (mesma pasta).
 */
(function(){
  "use strict";

  /* ================= DATA ================= */
  var INICIOS = [
    {id:'i1', num:1, title:'A Fotografia', icon:'&#128247;'},
    {id:'i2', num:2, title:'A Chave', icon:'&#128273;'},
    {id:'i3', num:3, title:'O Desaparecimento', icon:'&#127908;'}
  ];
  var CAMINHOS = [
    {id:'c1', num:1, title:'O Arquivo', icon:'&#128194;'},
    {id:'c2', num:2, title:'A Estação', icon:'&#128646;'},
    {id:'c3', num:3, title:'O Homem da Fotografia', icon:'&#128100;'}
  ];
  var PISTA_TEXT = {
    i1:'Um artigo censurado no arquivo de partituras menciona o nome de Augusto Valença.',
    i2:'Uma carta inacabada de Miguel: "A pessoa que estamos procurando não é quem…" — a última palavra foi arrancada.',
    i3:'Num armário da estação, um envelope: "Não confie na primeira pessoa que parecer culpada." Dentro, uma fotografia de Augusto Valença.',
    c1:'O depoimento do diretor não bate com o registro da portaria. Alguém, dentro do estúdio, está mentindo.',
    c2:'A fita não continha apenas música — continha vozes de pessoas apagadas dos registros oficiais.',
    c3:'O último relatório de Miguel termina com uma única letra no lugar de uma assinatura: D.'
  };

  /* ================= STATE ================= */
  var endingsSeen = {}; // persists across restarts within this session

  function freshState(){
    return {
      screen:'cover',
      solved:{i1:false,i2:false,i3:false,c1:false,c2:false,c3:false},
      pistas:[],
      fitaChoice:null,
      journalOpen:false,
      p1:{chosen:[], target:['PRIMAVERA','DENTES','ROSA','SANGUE'], words:shuffle(['PRIMAVERA','DENTES','SANGUE','ROSA','VIRA']), wrongWord:null, cipherRevealed:false, keyApplied:false, done:false},
      p2:{chosen:[], target:[7,9,13], wrongNum:null, done:false},
      p3:{soundDone:false, wrongSound:null, lockerDone:false, wrongLocker:null},
      p4:{picked:null, wrong:null},
      p5:{chosen:[], target:['b','c','a'], wrong:false, choice:null},
      p6:{revealed:{}, order:['r1','r2','r3','r4','r5','r6']}
    };
  }
  var S = freshState();

  function shuffle(arr){
    var a = arr.slice();
    for(var i=a.length-1;i>0;i--){
      var j = Math.floor(Math.random()*(i+1));
      var t=a[i]; a[i]=a[j]; a[j]=t;
    }
    return a;
  }

  function addPista(key){
    if(S.pistas.indexOf(key)===-1){ S.pistas.push(key); }
  }

  function goto(screen){ S.screen = screen; render(); }

  /* ================= ACTIONS ================= */
  var actions = {

    startPrologo: function(){ goto('prologo'); },
    startInvestigation: function(){ goto('hubInicio'); },

    enter: function(id){ goto(id); },
    backHub: function(which){ goto(which==='inicio' ? 'hubInicio' : 'hubCaminho'); },
    toCaminhoHub: function(){ goto('hubCaminho'); },
    toRevelacao: function(){ goto('revelacao'); },
    toDesafioFinal: function(){ goto('desafioFinal'); },

    finalChoice: function(which){
      var map = {fita:'finalFita', documento:'finalDocumento', fotografia:'finalFotografia'};
      var screen = map[which];
      endingsSeen[which] = true;
      goto(screen);
    },
    restart: function(){
      S = freshState();
      render();
    },
    toggleJournal: function(){ S.journalOpen = !S.journalOpen; render(); },

    /* ---- Puzzle 1: início 1 (photograph word order) ---- */
    p1Word: function(word){
      if(S.p1.done) return;
      var idx = S.p1.chosen.length;
      var expected = S.p1.target[idx];
      if(word === expected && S.p1.chosen.indexOf(word)===-1){
        S.p1.chosen.push(word);
        S.p1.wrongWord = null;
        if(S.p1.chosen.length === S.p1.target.length){
          S.p1.done = true;
        }
      } else {
        S.p1.wrongWord = word;
        S.p1.chosen = [];
      }
      render();
    },
    p1Cipher: function(){ S.p1.cipherRevealed = true; render(); },
    p1Key: function(){ S.p1.keyApplied = true; render(); },
    p1Finish: function(){
      S.solved.i1 = true;
      addPista('i1');
      goto('hubInicio');
    },

    /* ---- Puzzle 2: início 2 (track order) ---- */
    p2Track: function(numStr){
      if(S.p2.done) return;
      var num = parseInt(numStr,10);
      var idx = S.p2.chosen.length;
      var expected = S.p2.target[idx];
      if(num === expected && S.p2.chosen.indexOf(num)===-1){
        S.p2.chosen.push(num);
        S.p2.wrongNum = null;
        if(S.p2.chosen.length === S.p2.target.length){ S.p2.done = true; }
      } else {
        S.p2.wrongNum = num;
        S.p2.chosen = [];
      }
      render();
    },
    p2Finish: function(){
      S.solved.i2 = true;
      addPista('i2');
      goto('hubInicio');
    },

    /* ---- Puzzle 3: início 3 (sound + locker) ---- */
    p3Sound: function(val){
      if(S.p3.soundDone) return;
      if(val === 'trem'){ S.p3.soundDone = true; S.p3.wrongSound = null; }
      else { S.p3.wrongSound = val; }
      render();
    },
    p3Locker: function(numStr){
      if(S.p3.lockerDone) return;
      var num = parseInt(numStr,10);
      if(num === 4){ S.p3.lockerDone = true; S.p3.wrongLocker = null; }
      else { S.p3.wrongLocker = num; }
      render();
    },
    p3Finish: function(){
      S.solved.i3 = true;
      addPista('i3');
      goto('hubInicio');
    },

    /* ---- Puzzle 4: caminho 1 (testimony) ---- */
    p4Pick: function(who){
      if(S.p4.picked) return;
      if(who === 'diretor'){ S.p4.picked = who; S.p4.wrong = null; }
      else { S.p4.wrong = who; }
      render();
    },
    p4Finish: function(){
      S.solved.c1 = true;
      addPista('c1');
      goto('hubCaminho');
    },

    /* ---- Puzzle 5: caminho 2 (fragments + choice) ---- */
    p5Frag: function(id){
      if(S.p5.chosen.length>=3) return;
      if(S.p5.chosen.indexOf(id)!==-1) return;
      S.p5.chosen.push(id);
      if(S.p5.chosen.length===3){
        var ok = S.p5.chosen.join(',') === S.p5.target.join(',');
        if(!ok){ S.p5.wrong = true; }
        else { S.p5.wrong = false; }
      }
      render();
    },
    p5Reset: function(){ S.p5.chosen=[]; S.p5.wrong=false; render(); },
    p5Choice: function(val){ S.p5.choice = val; render(); },
    p5Finish: function(){
      S.solved.c2 = true;
      addPista('c2');
      goto('hubCaminho');
    },

    /* ---- Puzzle 6: caminho 3 (redaction reveal) ---- */
    p6Reveal: function(id){
      S.p6.revealed[id] = true;
      render();
    },
    p6Finish: function(){
      S.solved.c3 = true;
      addPista('c3');
      goto('hubCaminho');
    }
  };

  /* ================= SMALL COMPONENTS ================= */
  function topBar(chapter){
    return '<div class="topbar"><span class="chapter">'+chapter+'</span><span class="series">A Fita 13</span></div>';
  }

  function journalToggle(){
    var n = S.pistas.length;
    return '<button class="journal-toggle" data-action="toggleJournal" type="button">Diário de pistas ('+n+')</button>' + (S.journalOpen ? journalPanel() : '');
  }

  function journalPanel(){
    var items = S.pistas.map(function(k){
      return '<div class="journal-item">'+PISTA_TEXT[k]+'</div>';
    }).join('');
    if(!items){ items = '<p class="journal-empty">Nenhuma pista anotada ainda.</p>'; }
    return '<div class="journal-panel"><div class="journal-inner fade-in">'+
      '<h2>Diário de pistas</h2>'+
      '<p class="small">O que Lívia já reuniu até agora.</p>'+
      items+
      '<div><button class="btn journal-close" data-action="toggleJournal" type="button">Fechar</button></div>'+
      '</div></div>';
  }

  function backBtn(which){
    return '<button class="btn btn-quiet" data-action="backHub" data-value="'+which+'" type="button">&larr; Voltar ao mapa</button>';
  }

  /* ================= SCREENS ================= */
  var screens = {};

  screens.cover = function(){
    var seenCount = Object.keys(endingsSeen).length;
    return '<div class="cover">'+
      '<div class="cover-stamp">DOSSIÊ CONFIDENCIAL</div>'+
      '<h1>A Fita 13</h1>'+
      '<p class="subtitle">O Segredo Antes do Silêncio</p>'+
      '<p class="setting">São Paulo, 1973</p>'+
      '<button class="btn btn-primary" data-action="startPrologo" type="button">Começar a leitura</button>'+
      (seenCount>0 ? '<p class="endings-note">Finais descobertos: '+seenCount+' de 3. Reinicie a investigação para encontrar os outros.</p>' : '')+
      '</div>';
  };

  screens.prologo = function(){
    return topBar('Prólogo') + '<div class="page fade-in">'+
      '<p>A chuva havia começado antes do anoitecer e transformara as ruas em espelhos escuros. Nas bancas de jornal, algumas manchetes desapareciam antes mesmo de amanhecer. Em determinadas redações, textos inteiros eram cortados antes da impressão.</p>'+
      '<p>Naquela noite, Lívia Duarte recebeu um envelope sem remetente.</p>'+
      '<p>Dentro havia apenas três objetos: uma fotografia de um estúdio de gravação; uma pequena chave; e um pedaço de papel escrito à mão.</p>'+
      '<p class="whisper">"Quando a primavera chegar aos dentes, procure aquilo que foi calado."</p>'+
      '<p>No verso do papel havia três números: <strong>3 — 9 — 13</strong>.</p>'+
      '<p>Lívia conhecia aquelas referências. E percebeu que aquilo não era um convite. Era uma pista.</p>'+
      '<p>Naquela mesma noite, ela descobriu que Miguel Ferraz, técnico de som de um estúdio próximo, havia desaparecido. Poucas horas antes de sumir, ele havia enviado uma mensagem para uma pessoa desconhecida.</p>'+
      '<p class="whisper">"A fita não pode chegar às mãos deles."</p>'+
      '<p>Ninguém sabia quem eram "eles". O estúdio informou que uma única gravação havia desaparecido: a fita 13. Oficialmente, ela nem deveria existir.</p>'+
      '<p>E foi nesse momento que a investigação começou.</p>'+
      '<div class="btn-row"><button class="btn btn-primary" data-action="startInvestigation" type="button">Iniciar a investigação</button></div>'+
      '</div>';
  };

  screens.hubInicio = function(){
    var cards = INICIOS.map(function(m){
      var done = S.solved[m.id];
      return '<button class="file-card'+(done?' is-done':'')+'" data-action="enter" data-value="'+m.id+'" type="button">'+
        '<span class="file-card-num">Início '+m.num+'</span>'+
        '<span class="file-card-icon">'+m.icon+'</span>'+
        '<span class="file-card-title">'+m.title+'</span>'+
        (done ? '<span class="file-card-check">investigado</span>' : '')+
        '</button>';
    }).join('');
    var any = S.solved.i1 || S.solved.i2 || S.solved.i3;
    return topBar('A investigação') + '<div class="page fade-in">'+
      '<p class="board-instructions">Lívia tem três fios soltos para puxar. Escolha por onde começar — dá para investigar mais de um antes de seguir em frente.</p>'+
      '<div class="board-grid">'+cards+'</div>'+
      (any
        ? '<button class="btn btn-primary" data-action="toCaminhoHub" type="button">Seguir a pista</button>'
        : '<p class="board-hint">Investigue ao menos um deles para continuar.</p>')+
      '</div>' + journalToggle();
  };

  screens.hubCaminho = function(){
    var cards = CAMINHOS.map(function(m){
      var done = S.solved[m.id];
      return '<button class="file-card'+(done?' is-done':'')+'" data-action="enter" data-value="'+m.id+'" type="button">'+
        '<span class="file-card-num">Caminho '+m.num+'</span>'+
        '<span class="file-card-icon">'+m.icon+'</span>'+
        '<span class="file-card-title">'+m.title+'</span>'+
        (done ? '<span class="file-card-check">investigado</span>' : '')+
        '</button>';
    }).join('');
    var any = S.solved.c1 || S.solved.c2 || S.solved.c3;
    return topBar('Novas pistas') + '<div class="page fade-in">'+
      '<p class="board-instructions">Com as primeiras pistas em mãos, três caminhos se abrem diante de Lívia. Escolha por onde seguir — dá para explorar mais de um.</p>'+
      '<div class="board-grid">'+cards+'</div>'+
      (any
        ? '<button class="btn btn-primary" data-action="toRevelacao" type="button">Ir à revelação</button>'
        : '<p class="board-hint">Investigue ao menos um caminho para continuar.</p>')+
      '</div>' + journalToggle();
  };

  /* ---- INÍCIO 1 — A Fotografia ---- */
  screens.i1 = function(){
    if(S.solved.i1){
      return topBar('Início 1 — A Fotografia') + '<div class="page fade-in">'+
        i1Story()+ i1Result() +
        '<div class="clue-banner"><span class="tag">PISTA</span><p>'+PISTA_TEXT.i1+'</p></div>'+
        '<div class="btn-row">'+backBtn('inicio')+'</div>'+
        '</div>' + journalToggle();
    }
    var p1 = S.p1;
    var wordsHtml = p1.words.map(function(w){
      var chosen = p1.chosen.indexOf(w)!==-1;
      var wrong = p1.wrongWord===w;
      return '<button class="tile'+(chosen?' chosen':'')+(wrong?' wrong':'')+'" data-action="p1Word" data-value="'+w+'" type="button" '+(chosen?'disabled':'')+'>'+w+'</button>';
    }).join('');

    var puzzle = '<div class="puzzle-block">'+
      '<p class="puzzle-instructions">No fundo da fotografia há um quadro com palavras escritas. A maior delas é PRIMAVERA. A pista falava em "primavera" e "dentes" — clique nas palavras na ordem que parece certa.</p>'+
      '<div class="sequence-track">'+[0,1,2,3].map(function(i){
        var v = p1.chosen[i];
        return '<span class="sequence-slot'+(v?' filled':'')+'">'+(v||'—')+'</span>';
      }).join('')+'</div>'+
      '<div class="tiles">'+wordsHtml+'</div>'+
      (p1.wrongWord ? '<p class="feedback">Essa ordem não revela nada. A sequência recomeça.</p>' : '')+
      '</div>';

    var reveal = '';
    if(p1.done){
      reveal += '<p class="whisper">"Procure onde a música não pode ser ouvida."</p>'+
        '<p>Lívia entende: o próximo lugar não é a sala de gravação, é o arquivo de partituras e documentos. Lá, um pedaço de papel carbono traz uma sequência de números.</p>'+
        '<div class="puzzle-block">'+
        '<p class="puzzle-instructions">14 — 18 — 20 — 9 — 7 — 15</p>'+
        (!p1.cipherRevealed
          ? '<button class="btn" data-action="p1Cipher" type="button">Decifrar (A=1, B=2...)</button>'
          : ('<p class="lead">'+(p1.keyApplied ? 'A R T I G O' : 'N R T I G O')+'</p>'+
             (!p1.keyApplied
               ? '<p class="feedback">Algo está errado. A pequena chave recebida com a fotografia traz uma etiqueta: <strong>"FALA"</strong>.</p><button class="btn" data-action="p1Key" type="button">Aplicar a chave</button>'
               : '<p>Usando a etiqueta como referência, a primeira letra se corrige. A palavra é <strong>ARTIGO</strong>.</p>'+
                 '<p>Dentro do arquivo existe uma matéria censurada. Nela aparece o nome de <strong>Augusto Valença</strong>.</p>'+
                 '<div class="btn-row"><button class="btn btn-primary" data-action="p1Finish" type="button">Anotar a pista</button></div>')))+
        '</div>';
    }

    return topBar('Início 1 — A Fotografia') + '<div class="page fade-in">'+
      i1Story() + puzzle + reveal +
      '<div class="btn-row">'+backBtn('inicio')+'</div>'+
      '</div>' + journalToggle();
  };
  function i1Story(){
    return '<p>Lívia observa a fotografia recebida. Há quatro pessoas no estúdio, mas somente três deveriam estar ali — um funcionário aparece parcialmente escondido atrás de uma porta.</p>';
  }
  function i1Result(){
    return '<p>O artigo censurado, encontrado sob a chave da palavra ARTIGO, menciona o nome de Augusto Valença.</p>';
  }

  /* ---- INÍCIO 2 — A Chave ---- */
  screens.i2 = function(){
    if(S.solved.i2){
      return topBar('Início 2 — A Chave') + '<div class="page fade-in">'+
        i2Story()+
        '<p>Entre as faixas assinaladas por Miguel, três formam uma sequência temática: <strong>MEMÓRIA</strong>. Dentro de uma gaveta secreta, uma carta inacabada.</p>'+
        '<p class="whisper">"A pessoa que estamos procurando não é quem…"</p>'+
        '<div class="clue-banner"><span class="tag">PISTA</span><p>'+PISTA_TEXT.i2+'</p></div>'+
        '<div class="btn-row">'+backBtn('inicio')+'</div>'+
        '</div>' + journalToggle();
    }
    var p2 = S.p2;
    var tracks = [
      {num:1, title:'Vento Sul'},
      {num:3, title:'Cidade Cinza'},
      {num:5, title:'Trem da Meia-Noite'},
      {num:7, title:'O Patrão Nosso de Cada Dia', anno:'"Não é sobre música."'},
      {num:9, title:'Rosa de Hiroshima', anno:'"Lembre-se do que acontece quando alguém decide o que pode ser lembrado."'},
      {num:11, title:'Silêncio Antigo'},
      {num:13, title:'Fala', anno:'"A última palavra está onde ninguém procura."'},
      {num:15, title:'Última Faixa'}
    ];
    var rows = tracks.map(function(t){
      var chosen = p2.chosen.indexOf(t.num)!==-1;
      var wrong = p2.wrongNum===t.num;
      return '<button class="track-row'+(chosen?' chosen':'')+(wrong?' wrong':'')+'" data-action="p2Track" data-value="'+t.num+'" type="button" '+(chosen?'disabled':'')+'>'+
        '<span class="num">'+t.num+'</span>'+
        '<span><span>'+t.title+'</span>'+(t.anno?'<span class="anno">'+t.anno+'</span>':'')+'</span>'+
        '</button>';
    }).join('');

    var puzzle = '<div class="puzzle-block">'+
      '<p class="puzzle-instructions">Miguel deixou um bilhete com três números: <strong>7 — 9 — 13</strong>. Encontre e clique nessas faixas, nessa ordem.</p>'+
      '<div class="sequence-track">'+[0,1,2].map(function(i){
        var v = p2.chosen[i];
        return '<span class="sequence-slot'+(v?' filled':'')+'">'+(v||'—')+'</span>';
      }).join('')+'</div>'+
      '<div class="track-list">'+rows+'</div>'+
      (p2.wrongNum ? '<p class="feedback">Essa faixa não leva a nada. A sequência recomeça.</p>' : '')+
      '</div>';

    var reveal = '';
    if(p2.done){
      reveal = '<p>Entre as três faixas assinaladas por Miguel, algo se organiza: <strong>MEMÓRIA</strong>. Uma gaveta secreta se abre.</p>'+
        '<p>Dentro está uma carta de Miguel. Ele escreve que descobriu que alguém estava substituindo documentos no arquivo do estúdio. Mas termina com uma frase incompleta:</p>'+
        '<p class="whisper">"A pessoa que estamos procurando não é quem…"</p>'+
        '<p>A última palavra foi arrancada.</p>'+
        '<div class="btn-row"><button class="btn btn-primary" data-action="p2Finish" type="button">Anotar a pista</button></div>';
    }

    return topBar('Início 2 — A Chave') + '<div class="page fade-in">'+
      i2Story() + puzzle + reveal +
      '<div class="btn-row">'+backBtn('inicio')+'</div>'+
      '</div>' + journalToggle();
  };
  function i2Story(){
    return '<p>Lívia decide ignorar a fotografia e investigar primeiro a pequena chave. Ela descobre que ela abre um armário antigo no estúdio, com rolos de fita, documentos e uma lista de músicas cheia de anotações.</p>';
  }

  /* ---- INÍCIO 3 — O Desaparecimento ---- */
  screens.i3 = function(){
    if(S.solved.i3){
      return topBar('Início 3 — O Desaparecimento') + '<div class="page fade-in">'+
        i3Story()+
        '<p>A estação de trem mais próxima possui uma antiga área de armazenamento. Lívia encontra o armário correspondente ao número indicado pela hora do relógio. Dentro há apenas um envelope.</p>'+
        '<p class="whisper">"Não confie na primeira pessoa que parecer culpada."</p>'+
        '<p>E uma fotografia de Augusto Valença.</p>'+
        '<div class="clue-banner"><span class="tag">PISTA</span><p>'+PISTA_TEXT.i3+'</p></div>'+
        '<div class="btn-row">'+backBtn('inicio')+'</div>'+
        '</div>' + journalToggle();
    }
    var p3 = S.p3;
    var soundPuzzle = '<div class="puzzle-block">'+
      '<p class="puzzle-instructions">A gravação captou três ruídos de fundo. Qual deles indica um lugar para onde ir?</p>'+
      '<div class="sound-grid">'+
      ['relogio:&#128340;:Relógio','porta:&#128682;:Porta metálica','trem:&#128646;:Trem ao longe'].map(function(s){
        var parts = s.split(':');
        var val=parts[0], emoji=parts[1], label=parts[2];
        var wrong = p3.wrongSound===val;
        var chosen = p3.soundDone && val==='trem';
        return '<button class="sound-btn'+(wrong?' wrong':'')+(chosen?' chosen':'')+'" data-action="p3Sound" data-value="'+val+'" type="button" '+(p3.soundDone?'disabled':'')+'><span class="emoji">'+emoji+'</span>'+label+'</button>';
      }).join('')+
      '</div>'+
      (p3.wrongSound ? '<p class="feedback">Esse som não indica um lugar. Escute de novo.</p>' : '')+
      '</div>';

    var lockerPuzzle = '';
    if(p3.soundDone){
      lockerPuzzle = '<p>Um trem passa ao longe. A estação mais próxima tem uma antiga área de armazenamento — e, na gravação, um relógio bate quatro vezes antes do silêncio.</p>'+
        '<div class="puzzle-block">'+
        '<p class="puzzle-instructions">Abra o armário correspondente ao número de batidas do relógio.</p>'+
        '<div class="locker-grid">'+[1,2,3,4,5,6].map(function(n){
          var wrong = p3.wrongLocker===n;
          var chosen = p3.lockerDone && n===4;
          return '<button class="locker-btn'+(wrong?' wrong':'')+(chosen?' chosen':'')+'" data-action="p3Locker" data-value="'+n+'" type="button" '+(p3.lockerDone?'disabled':'')+'>'+n+'</button>';
        }).join('')+'</div>'+
        (p3.wrongLocker ? '<p class="feedback">Armário vazio. Tente outro número.</p>' : '')+
        '</div>';
    }

    var reveal = '';
    if(p3.lockerDone){
      reveal = '<p>Dentro do armário há apenas um envelope.</p>'+
        '<p class="whisper">"Não confie na primeira pessoa que parecer culpada."</p>'+
        '<p>E uma fotografia de Augusto Valença.</p>'+
        '<div class="btn-row"><button class="btn btn-primary" data-action="p3Finish" type="button">Anotar a pista</button></div>';
    }

    return topBar('Início 3 — O Desaparecimento') + '<div class="page fade-in">'+
      i3Story() + soundPuzzle + lockerPuzzle + reveal +
      '<div class="btn-row">'+backBtn('inicio')+'</div>'+
      '</div>' + journalToggle();
  };
  function i3Story(){
    return '<p>Lívia decide investigar diretamente o desaparecimento de Miguel. O estúdio está vazio. Sobre a mesa, um gravador ainda ligado. A fita foi retirada, mas o aparelho guarda uma gravação de poucos segundos.</p>'+
      '<p class="whisper">"Se você está ouvindo isso, já sabe que a fita desapareceu."</p><p>Depois, silêncio.</p>';
  }

  /* ---- CAMINHO 1 — O Arquivo ---- */
  screens.c1 = function(){
    if(S.solved.c1){
      return topBar('Caminho 1 — O Arquivo') + '<div class="page fade-in">'+
        c1Story()+
        '<p>O depoimento do diretor é impossível: um registro mostra que a porta do estúdio foi aberta durante o período em que ele afirma que ninguém entrou.</p>'+
        '<p>Alguém, dentro do estúdio, está mentindo.</p>'+
        '<div class="clue-banner"><span class="tag">PISTA</span><p>'+PISTA_TEXT.c1+'</p></div>'+
        '<div class="btn-row">'+backBtn('caminho')+'</div>'+
        '</div>' + journalToggle();
    }
    var p4 = S.p4;
    var testimonies = [
      {who:'augusto', name:'Augusto', quote:'"Eu apenas recolhi documentos que não poderiam ser divulgados."', time:'Horário declarado: saiu do estúdio às 22h40.'},
      {who:'funcionario', name:'Funcionário do estúdio', quote:'"Miguel estava assustado e dizia que alguém o estava seguindo."', time:'Horário declarado: viu Miguel por volta das 23h10.'},
      {who:'diretor', name:'Diretor', quote:'"Ninguém entrou no estúdio naquela noite."', time:'Horário declarado: portas fechadas das 21h às 6h.'}
    ];
    var cards = testimonies.map(function(t){
      var wrong = p4.wrong===t.who;
      return '<button class="testimony-card'+(wrong?' wrong':'')+'" data-action="p4Pick" data-value="'+t.who+'" type="button" '+(p4.picked?'disabled':'')+'>'+
        '<span class="testimony-who">'+t.name+'</span>'+
        '<p class="testimony-quote">'+t.quote+'</p>'+
        '<span class="testimony-time">'+t.time+'</span>'+
        '</button>';
    }).join('');

    var puzzle = '<div class="puzzle-block">'+
      '<p class="puzzle-instructions">Compare os três depoimentos com o registro da portaria. Qual deles é impossível?</p>'+
      '<div class="log-strip">Registro da portaria: porta do estúdio destravada às 23h05.</div>'+
      '<div class="testimony-grid">'+cards+'</div>'+
      (p4.wrong ? '<p class="feedback">Esse depoimento não contradiz o registro. Reveja os horários.</p>' : '')+
      '</div>';

    var reveal = '';
    if(p4.picked){
      reveal = '<p>O depoimento do diretor é impossível: o registro mostra a porta destravada bem no meio do período em que, segundo ele, ninguém entrou.</p>'+
        '<p>Alguém, dentro do estúdio, está mentindo.</p>'+
        '<div class="btn-row"><button class="btn btn-primary" data-action="p4Finish" type="button">Anotar a pista</button></div>';
    }

    return topBar('Caminho 1 — O Arquivo') + '<div class="page fade-in">'+
      c1Story() + puzzle + reveal +
      '<div class="btn-row">'+backBtn('caminho')+'</div>'+
      '</div>' + journalToggle();
  };
  function c1Story(){
    return '<p>Lívia decide seguir os documentos. Ela descobre que vários materiais foram retirados do arquivo por ordem de Augusto. Porém, existe uma inconsistência: Miguel também teve acesso ao arquivo, na mesma noite.</p>';
  }

  /* ---- CAMINHO 2 — A Estação ---- */
  screens.c2 = function(){
    if(S.solved.c2){
      return topBar('Caminho 2 — A Estação') + '<div class="page fade-in">'+
        c2Story()+
        '<p class="whisper">"Não deixe a fita ser destruída."</p>'+
        c2ChoiceEcho()+
        '<div class="clue-banner"><span class="tag">PISTA</span><p>'+PISTA_TEXT.c2+'</p></div>'+
        '<div class="btn-row">'+backBtn('caminho')+'</div>'+
        '</div>' + journalToggle();
    }
    var p5 = S.p5;
    var frags = [
      {id:'b', text:'"...não deixe..."'},
      {id:'c', text:'"...a fita..."'},
      {id:'a', text:'"...ser destruída."'}
    ];
    var tiles = frags.map(function(f){
      var used = p5.chosen.indexOf(f.id)!==-1;
      return '<button class="tile'+(used?' chosen':'')+'" data-action="p5Frag" data-value="'+f.id+'" type="button" '+(used?'disabled':'')+'>'+f.text+'</button>';
    }).join('');

    var built = p5.chosen.map(function(id){
      var f = frags.filter(function(x){return x.id===id;})[0];
      return f.text.replace(/"/g,'').replace(/\.\.\./g,'');
    }).join(' ');

    var puzzle = '<div class="puzzle-block">'+
      '<p class="puzzle-instructions">No armário, uma segunda gravação está dividida em três fragmentos embaralhados. Clique nos fragmentos, na ordem que forma uma frase com sentido.</p>'+
      '<div class="sequence-track"><span class="sequence-slot'+(built?' filled':'')+'">'+(built||'—')+'</span></div>'+
      '<div class="tiles">'+tiles+'</div>'+
      (p5.chosen.length===3 && p5.wrong ? '<p class="feedback">Isso não faz sentido. Tente de novo.</p><button class="btn btn-quiet" data-action="p5Reset" type="button">Recomeçar</button>' : '')+
      '</div>';

    var choiceBlock = '';
    if(p5.chosen.length===3 && p5.wrong===false){
      choiceBlock = '<p>As peças se encaixam:</p><p class="whisper">"Não deixe a fita ser destruída."</p>'+
        '<p>Miguel explica, em uma segunda gravação: a fita desaparecida não continha apenas música. Continha vozes — pessoas que haviam sido obrigadas a desaparecer dos registros oficiais.</p>';
      if(!p5.choice){
        choiceBlock += '<div class="choice-row">'+
          '<button class="choice-btn" data-action="p5Choice" data-value="esconder" type="button">Esconder a fita</button>'+
          '<button class="choice-btn" data-action="p5Choice" data-value="entregar" type="button">Entregar a fita</button>'+
          '</div>';
      } else {
        choiceBlock += c2ChoiceEcho() +
          '<div class="btn-row"><button class="btn btn-primary" data-action="p5Finish" type="button">Anotar a pista</button></div>';
      }
    }

    return topBar('Caminho 2 — A Estação') + '<div class="page fade-in">'+
      c2Story() + puzzle + choiceBlock +
      '<div class="btn-row">'+backBtn('caminho')+'</div>'+
      '</div>' + journalToggle();
  };
  function c2Story(){
    return '<p>Lívia segue a pista deixada por Miguel até um armário da estação, onde encontra uma segunda gravação escondida.</p>';
  }
  function c2ChoiceEcho(){
    if(S.p5.choice==='esconder'){
      return '<p class="small">Lívia decide que, por ora, a fita fica escondida. Uma escolha guardada para mais tarde.</p>';
    }
    if(S.p5.choice==='entregar'){
      return '<p class="small">Lívia decide que a fita precisa sair das mãos dela o quanto antes, mesmo com o risco. Uma escolha guardada para mais tarde.</p>';
    }
    return '';
  }

  /* ---- CAMINHO 3 — O Homem da Fotografia ---- */
  screens.c3 = function(){
    if(S.solved.c3){
      return topBar('Caminho 3 — O Homem da Fotografia') + '<div class="page fade-in">'+
        c3Story()+
        '<p class="whisper">"O verdadeiro perigo não está em quem apaga as palavras. Está em quem decide quais palavras nunca poderão existir."</p>'+
        '<p>Lívia encontra então o último relatório de Miguel. No final existe apenas uma assinatura: <strong>D.</strong></p>'+
        '<div class="clue-banner"><span class="tag">PISTA</span><p>'+PISTA_TEXT.c3+'</p></div>'+
        '<div class="btn-row">'+backBtn('caminho')+'</div>'+
        '</div>' + journalToggle();
    }
    var bars = [
      {id:'r1', word:'O verdadeiro perigo'},
      {id:'r2', word:'não está em'},
      {id:'r3', word:'quem apaga as palavras.'},
      {id:'r4', word:'Está em quem decide'},
      {id:'r5', word:'quais palavras'},
      {id:'r6', word:'nunca poderão existir.'}
    ];
    var decoys = ['Relatório confidencial','Estúdio Central','protocolo 44-B','arquivo interno','uso restrito','sem data'];
    var allRevealed = bars.every(function(b){ return S.p6.revealed[b.id]; });

    var docHtml = '<div class="redaction-grid">';
    for(var i=0;i<bars.length;i++){
      docHtml += '<span class="doc-word">'+decoys[i % decoys.length]+'</span>';
      var b = bars[i];
      var rev = !!S.p6.revealed[b.id];
      docHtml += '<button class="redaction-bar'+(rev?' revealed':'')+'" data-action="p6Reveal" data-value="'+b.id+'" type="button" '+(rev?'disabled':'')+'>'+(rev? b.word : '&nbsp;&nbsp;&nbsp;&nbsp;')+'</button>';
    }
    docHtml += '</div>';

    var count = Object.keys(S.p6.revealed).length;
    var puzzle = '<div class="puzzle-block">'+
      '<p class="puzzle-instructions">Em um documento apreendido, diversas palavras foram riscadas. Clique sobre cada tarja para revelar o que está por baixo.</p>'+
      docHtml+
      '<p class="redaction-progress">'+count+' de '+bars.length+' tarjas reveladas</p>'+
      '</div>';

    var reveal = '';
    if(allRevealed){
      reveal = '<p class="whisper">"O verdadeiro perigo não está em quem apaga as palavras. Está em quem decide quais palavras nunca poderão existir."</p>'+
        '<p>Lívia percebe que Augusto pode não ser o verdadeiro responsável. Ela encontra então o último relatório de Miguel. No final existe apenas uma assinatura: <strong>D.</strong></p>'+
        '<p class="small">A identidade do verdadeiro responsável ainda não está clara.</p>'+
        '<div class="btn-row"><button class="btn btn-primary" data-action="p6Finish" type="button">Anotar a pista</button></div>';
    }

    return topBar('Caminho 3 — O Homem da Fotografia') + '<div class="page fade-in">'+
      c3Story() + puzzle + reveal +
      '<div class="btn-row">'+backBtn('caminho')+'</div>'+
      '</div>' + journalToggle();
  };
  function c3Story(){
    return '<p>Lívia decide seguir Augusto e descobre que ele realmente esteve no estúdio na noite do desaparecimento. Mas descobre algo inesperado: Augusto estava tentando localizar Miguel — não para prendê-lo. Para avisá-lo.</p>';
  }

  /* ---- Revelação ---- */
  screens.revelacao = function(){
    return topBar('A Revelação') + '<div class="page fade-in">'+
      '<p>Independentemente do caminho escolhido, Lívia finalmente encontra a sala onde a fita 13 está escondida.</p>'+
      '<p>Miguel está lá. Machucado, mas vivo.</p>'+
      '<p>Ele revela a verdade: a fita não foi roubada por Augusto. Miguel a escondeu porque descobriu que determinados registros estavam sendo eliminados. A gravação continha depoimentos de pessoas perseguidas pela repressão. Destruir a fita significaria destruir uma parte da memória daqueles que estavam sendo silenciados.</p>'+
      '<p>Mas existe um problema. Augusto finalmente aparece. Ele diz que encontrou Lívia — e revela que não está sozinho. O verdadeiro responsável pelo desaparecimento dos documentos é uma pessoa ligada à administração do estúdio.</p>'+
      '<p>Agora Lívia precisa decidir o que fazer com o que descobriu.</p>'+
      '<div class="btn-row"><button class="btn btn-primary" data-action="toDesafioFinal" type="button">Tomar a decisão final</button></div>'+
      '</div>' + journalToggle();
  };

  /* ---- Desafio final ---- */
  screens.desafioFinal = function(){
    var opts = [
      {id:'fotografia', label:'A Fotografia', icon:'&#128247;'},
      {id:'fita', label:'A Fita', icon:'&#128190;'},
      {id:'documento', label:'O Documento', icon:'&#128196;'}
    ];
    var cards = opts.map(function(o){
      return '<button class="file-card" data-action="finalChoice" data-value="'+o.id+'" type="button">'+
        '<span class="file-card-icon">'+o.icon+'</span>'+
        '<span class="file-card-title">'+o.label+'</span>'+
        '</button>';
    }).join('');
    return topBar('Desafio final') + '<div class="page fade-in">'+
      '<p>Na mesa, três objetos: a fotografia, a fita, o documento.</p>'+
      '<p>Lívia precisa escolher qual deles usar como prova. Cada escolha conduz a um final diferente — e não há como voltar atrás.</p>'+
      '<div class="board-grid">'+cards+'</div>'+
      '</div>';
  };

  /* ---- Finais ---- */
  screens.finalFita = function(){
    var choice = S.p5.choice;
    var body;
    if(choice==='entregar'){
      body = '<p>Lívia decide que a gravação precisa circular — Miguel consegue, ainda assim, retirar uma cópia antes que a fita original seja destruída.</p>';
    } else {
      body = '<p>Lívia decide esconder a gravação. Miguel consegue retirar uma cópia. A fita original é destruída.</p>';
    }
    return endingScreen('finalFita', 'Final — A Fita Sobrevive',
      body +
      '<p>Mas a gravação continua existindo em outro lugar. Anos depois, aquelas vozes finalmente podem ser ouvidas. O caso oficialmente nunca foi solucionado. Porém, a memória não desapareceu.</p>',
      '"Podem apagar uma gravação. Não podem apagar tudo o que ela fez alguém lembrar."'
    );
  };
  screens.finalDocumento = function(){
    return endingScreen('finalDocumento', 'Final — A Verdade É Revelada',
      '<p>Lívia decide entregar os documentos clandestinamente a jornalistas. O material expõe a existência de registros que estavam sendo escondidos.</p>'+
      '<p>Miguel desaparece novamente. Augusto também some. Mas a investigação chega às mãos de outras pessoas. A verdade sobre a fita começa a circular.</p>'+
      '<p>O preço é alto: Lívia precisa abandonar a cidade.</p>',
      'A história foi publicada. Os nomes foram preservados. E aquilo que deveria permanecer em silêncio ganhou testemunhas.'
    );
  };
  screens.finalFotografia = function(){
    return endingScreen('finalFotografia', 'Final — O Silêncio',
      '<p>Lívia entrega a fotografia às autoridades, acreditando que ela seja a prova definitiva. Não é.</p>'+
      '<p>A fotografia é usada para identificar Miguel e outras pessoas presentes no estúdio. A fita é destruída. Os documentos desaparecem. O caso é encerrado.</p>'+
      '<p>Anos depois, Lívia encontra a fotografia novamente. No verso, uma frase que ela nunca havia percebido:</p>'+
      '<p class="whisper">"Você esteve olhando para a pista, mas nunca para quem estava atrás dela."</p>'+
      '<p>Ela entende tarde demais.</p>',
      'A verdade estava diante dela. Mas foi o silêncio que venceu.'
    );
  };

  function endingScreen(key, title, body, closing){
    var seenCount = Object.keys(endingsSeen).length;
    return topBar('Fim') + '<div class="page fade-in">'+
      '<div class="ending-tag">FIM</div>'+
      '<h2>'+title+'</h2>'+
      body+
      '<p class="ending-close">'+closing+'</p>'+
      '<div class="ending-tracker">Finais descobertos nesta sessão: '+seenCount+' de 3.'+(seenCount<3?' Reinicie a investigação para tentar um caminho diferente.':' Você encontrou todos os finais.')+'</div>'+
      '<div class="btn-row"><button class="btn btn-primary" data-action="restart" type="button">Recomeçar a investigação</button></div>'+
      '</div>';
  }

  /* ================= RENDER ================= */
  function render(){
    var app = document.getElementById('app');
    var fn = screens[S.screen];
    app.innerHTML = fn ? fn() : '<p>Página não encontrada.</p>';
    bindActions();
    window.scrollTo(0,0);
  }
  function bindActions(){
    var els = document.querySelectorAll('[data-action]');
    for(var i=0;i<els.length;i++){
      (function(el){
        el.addEventListener('click', function(){
          var action = el.getAttribute('data-action');
          var value = el.getAttribute('data-value');
          if(actions[action]){ actions[action](value); }
        });
      })(els[i]);
    }
  }

  render();
})();
