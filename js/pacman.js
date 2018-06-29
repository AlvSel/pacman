// Variables globales de utilidad
var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var w = canvas.width;
var h = canvas.height;

// GAME FRAMEWORK
var GF = function(){

  // variables para contar frames/s, usadas por measureFPS
  var frameCount = 0;
  var lastTime;
  var fpsContainer;
  var fps;

  //  variable global temporalmente para poder testear el ejercicio
  inputStates = {};

  const TILE_WIDTH=24, TILE_HEIGHT=24;
  var numGhosts = 4;

  // hold ghost objects
  var ghosts = {};

  var Ghost = function(id, ctx){
    this.x = 0;
    this.y = 0;
    this.velX = 0;
    this.velY = 0;
    this.speed = 1;

    this.nearestRow = 0;
    this.nearestCol = 0;

    this.state = Ghost.NORMAL;
    this.ctx = ctx;

    this.id = id;
    this.homeX = 0;
    this.homeY = 0;
    this.sprite=[];
    //estado NORMAL (depende del id) (array con 4 sprite, uno por cada direccion)
    this.sprite[0] = [];
    this.sprite[0][0] = new Sprite('res/sprites.png', [456, 16* this.id + 65],[16,16], 0.005, [0,1]);
    this.sprite[0][1] = new Sprite('res/sprites.png', [456+2*16, 16* this.id + 65],[16,16], 0.005, [0,1]);
    this.sprite[0][2] = new Sprite('res/sprites.png', [456+4*16, 16* this.id + 65],[16,16], 0.005, [0,1]);
    this.sprite[0][3] = new Sprite('res/sprites.png', [456+6*16, 16* this.id + 65],[16,16], 0.005, [0,1]);
    //estado VULNERABLE
    this.sprite[1] = new Sprite('res/sprites.png', [585, 65],[16,16], 0.005, [0,3]);
    //estado SPECTACLES
    this.sprite[2] = new Sprite('res/sprites.png', [585, 16* 1 + 65],[16,16], 0.005, [0,0]);

    this.draw = function(){
      //save, translate y restore para el uso de sprite
      ctx.save();
      ctx.translate(this.x,this.y);
      if(this.state==thisGame.NORMAL){
        if(this.velX>0){
          this.sprite[0][0].render(this.ctx);
        }else if (this.velX<0) {
          this.sprite[0][1].render(this.ctx);
        }else if (this.velY<0) {
          this.sprite[0][2].render(this.ctx);
        }else{
          this.sprite[0][3].render(this.ctx);
    }}else{
        this.sprite[(this.state-1)].render(this.ctx);
      }
      ctx.restore();
    }; // draw

    //TODO:
    //add para controlar fantasmas y teletransporte (codigo igual que el de pacman :()
    this.checkFantasmaTeletrans = function(row, col){
      var tele = false;
      var tipoCasilla = thisLevel.getMapTile(row,col);

      //puerta horizontal
      if (tipoCasilla==20) {
        tele=true;
        if(col==0 && (this.x-this.speed)==0){
          this.x=(thisLevel.lvlWidth-1)*thisGame.TILE_WIDTH;
        }else if(col==(thisLevel.lvlWidth-1)){
          this.x=thisGame.TILE_WIDTH;
        }
      }
      //puerta vertical
      else if (tipoCasilla==21) {
        tele=true;
        if(row==0 && (this.y-this.speed)==0){
          this.y=(thisLevel.lvlHeight-1)*thisGame.TILE_HEIGHT;
        }else if(row==(thisLevel.lvlHeight-1)){
          this.y=thisGame.TILE_HEIGHT;
        }
      }
      return tele;
    }

    this.buscar = function(colF,rowF,colO,rowO,grid){
      var grid = new PF.Grid(thisLevel.grid);
      var finder = new PF.AStarFinder();
      var path = finder.findPath(colF,rowF,colO,rowO,grid);
      if(path.length>1){
        var nextRow = path[1][1];
        var nextCol = path[1][0];
        if(!thisLevel.isWall(nextRow,nextCol)){
          if(rowF<nextRow){
            this.velX=0;
            this.velY=this.speed;
          }else if(rowF>nextRow){
            this.velX=0;
            this.velY=-this.speed;
          }else if(colF<nextCol){
            this.velX=this.speed;
            this.velY=0;
          }else if(colF>nextCol){
            this.velX=-this.speed;
            this.velY=0;
          }
        }
        else{
          this.velX=0;
          this.velY=0;
        }
      }
        return path;
      }

      //OBJ: escapar de Pacman -> moverse al cuadrante contrario de pacman
      this.escapar = function(colF,rowF,colP,rowP,grid,soluciones){
        var rowO=0;
        var colO=0;
        if(colP>thisLevel.lvlWidth/2){
          if(rowP>thisLevel.lvlHeight/2){
            //2 cuadrante
            rowO=thisLevel.c2R;
            colO=thisLevel.c2C;
          }else{
            //3 cuadrante
            rowO=thisLevel.c3R;
            colO=thisLevel.c3C;
          }
        }else{
          if(rowP>thisLevel.lvlHeight/2){
            //1 cuadrante
            rowO=thisLevel.c1R;
            colO=thisLevel.c1C;
          }else {
            //4 cuadrante
            rowO=thisLevel.c4R;
            colO=thisLevel.c4C;
          }
        }
        var path = this.buscar(colF,rowF,colO,rowO,grid);
        if(path.length<2){
          //si llegan al cuadrante y pacman sigue en el cuadrante contrario que hagan movimientos Random
          var solRand = soluciones[Math.floor(Math.random()*soluciones.length)]
          this.velX=this.speed*solRand[0];
          this.velY=this.speed*solRand[1];
      }
    }

    //OBJ: volver a homeX y homeY
    this.volverCasa = function(colF,rowF,colH,rowH,grid){
      this.buscar(colF,rowF,colH,rowH,grid);
      if(this.x==this.homeX && this.y==this.homeY){
        //sonido
        ghost_eaten.play();
        this.state = Ghost.NORMAL;
        this.speed = 3;
        this.velY=0;
        this.velX=0;
      }
    }

    this.move = function() {
      var soluciones=[];

      var grid = thisLevel.grid;
      var rowF = Math.floor(this.y/thisGame.TILE_HEIGHT);
      var colF = Math.floor(this.x/thisGame.TILE_WIDTH);
      var tele = this.checkFantasmaTeletrans(rowF,colF);

      var rowP = Math.floor(player.y/thisGame.TILE_HEIGHT);
      var colP = Math.floor(player.x/thisGame.TILE_WIDTH);

      if(!tele){
        if(this.x%thisGame.TILE_WIDTH==0 && this.y%thisGame.TILE_HEIGHT==0){
          //derecha
          if((colF+1)<thisLevel.lvlWidth && !thisLevel.isWall(rowF,(colF+1))){
            soluciones.push([1,0]);
          }
          //izquierda
          if((colF-1)>=0 && !thisLevel.isWall(rowF,(colF-1))){
            soluciones.push([-1,0]);
          }
          //arriba
          if((rowF-1)>=0 && !thisLevel.isWall((rowF-1),colF)){
            soluciones.push([0,-1]);
          }
          //abajo
          if((rowF-1)<thisLevel.lvlHeight && !thisLevel.isWall((rowF+1),colF)){
            soluciones.push([0,+1]);
          }
          //si hay bifurcacion
          if(soluciones.length!=2 || (soluciones.length==2 && soluciones.join()!="1,0,-1,0" && soluciones.join()!="0,-1,0,1")){
            if(this.state==Ghost.SPECTACLES){
              var rowH = Math.floor(this.homeY/thisGame.TILE_HEIGHT);
              var colH = Math.floor(this.homeX/thisGame.TILE_WIDTH);
              this.volverCasa(colF,rowF,colH,rowH,grid);
            }else if (this.state==Ghost.VULNERABLE){
              this.escapar(colF,rowF,colP,rowP,grid,soluciones);
            }else{
              //dos fantasmas no persiguen, los otros random
              if(this.id<2){
                this.buscar(colF,rowF,colP,rowP,grid);
              }else{
                //resto de fantasmas random
                var solRand = soluciones[Math.floor(Math.random()*soluciones.length)]
                this.velX=this.speed*solRand[0];
                this.velY=this.speed*solRand[1];
              }
            }
          }
        }
      }
      this.x += this.velX;
      this.y += this.velY;
    };
  }; // fin clase Ghost

  // static variables
  Ghost.NORMAL = 1;
  Ghost.VULNERABLE = 2;
  Ghost.SPECTACLES = 3;

  var Level = function(ctx) {
    this.ctx = ctx;
    this.lvlWidth = 0;
    this.lvlHeight = 0;
    this.map = [];
    this.grid = [];
    this.pellets = 0;
    this.powerPelletBlinkTimer = 0;
    //add al codigo inicial
    this.holgura=thisGame.TILE_WIDTH/2;

    //add los cuadrantes seguros para que los fantasmas escapen de Pacman
    //habría que parametrizarlos y cargarlos diferentes segun el nivel
    //cuadrante1
    this.c1R = 2;
    this.c1C = 18;
    //cuadrante2
    this.c2R = 2;
    this.c2C = 2;
    //cuadrante3
    this.c3R = 23;
    this.c3C =1;
    //cuadrante4
    this.c4R = 23;
    this.c4C = 19;

    this.setMapTile = function(row, col, newValue){
      this.map[row*thisLevel.lvlWidth+col]=newValue;
    };

    this.getMapTile = function(row, col){
      return thisLevel.map[row*thisLevel.lvlWidth+col];
    };

    this.printMap = function(){
      for (var i = 0; i < thisLevel.lvlHeight; i++) {
        var aux=thisLevel.map.slice(i*thisLevel.lvlWidth,i*thisLevel.lvlWidth+thisLevel.lvlWidth);
        console.log(aux.join(" "));
      }
    };

    //OBJ: transformar el map compatible con PathFindig
    this.getGrid = function(){
      var grid=[]
      for (var i = 0; i < thisLevel.lvlHeight; i++) {
        fila = [];
        for(var j = 0; j < thisLevel.lvlWidth; j++) {
          tipoCasilla = thisLevel.getMapTile(i,j);
          if(tipoCasilla>=100 && tipoCasilla<=199){
            fila.push(1);
          }else{
            fila.push(0);
          }
        }
        grid.push(fila);
      }
      return grid;
    }

    this.loadLevel = function(){
      //SOLO FUNCIONA EN FIREFOX
      //PRE: siempre el formato
      $.get('res/levels/1.txt', function(data) {
        var auxData=data.split("\n");
        thisLevel.lvlWidth=parseInt(auxData[0].split("# lvlwidth ")[1]);
        thisLevel.lvlHeight=parseInt(auxData[1].split("# lvlheight ")[1]);
        var inic =4; //indice donde empiezan los datos

        for (var i = inic; i < (thisLevel.lvlHeight+inic); i++) {
          var fila = auxData[i].split(" ");
          for (var j = 0; j < thisLevel.lvlWidth; j++) {
            thisLevel.setMapTile((i-4),j,fila[j]);
          }
        }
        thisLevel.grid=thisLevel.getGrid();//vale porque las paredes nunca se modifican
        //añadido aqui reset para asegurarme de reset cuando se haya cargado
        //JQuery es asincrono
        reset();
      }, 'text');
    };

    this.displayScore = function(){
      ctx.font = thisGame.TILE_HEIGHT+"px Arial";
      ctx.fillStyle = "white";

      ctx.fillText("Points: "+thisGame.points,0,thisGame.TILE_HEIGHT);
      ctx.fillText("Highscore: "+thisGame.highscore,14*thisGame.TILE_HEIGHT,thisGame.TILE_HEIGHT);

      ctx.fillText("Lifes: ",0,(thisLevel.lvlHeight)*thisGame.TILE_HEIGHT);
      ctx.save();
      ctx.translate(thisGame.TILE_WIDTH+5,(thisLevel.lvlHeight)*thisGame.TILE_HEIGHT-21);
      for (var i = 0; i < thisGame.lifes; i++) {
        ctx.translate(thisGame.TILE_WIDTH,0);
        thisGame.sprite.render(this.ctx,0,0);
      }
      ctx.restore();
    }

    this.displayGameOver = function(){
      ctx.font = thisGame.TILE_HEIGHT*3+"px Arial";
      ctx.fillStyle = "red";
      ctx.fillText("GAME OVER",w/8,h/2);
    }

    this.displayPause = function(){
      siren.stop();
      if(thisLevel.algunFantasmaVulnerable()){
        waza.stop();
      }
      //pinta en pantalla PAUSE intermitente
      if(thisLevel.powerPelletBlinkTimer<30){
        ctx.font = thisGame.TILE_HEIGHT+"px Arial";
        ctx.fillStyle = "red";
        ctx.fillText("PAUSE",thisGame.TILE_WIDTH,thisGame.TILE_HEIGHT*2);
      }
    }

    this.drawMap = function(){
      var TILE_WIDTH = thisGame.TILE_WIDTH;
      var TILE_HEIGHT = thisGame.TILE_HEIGHT;

      var tileID = {
        'door-h' : 20,
        'door-v' : 21,
        'pellet-power' : 3
      };
      for (var i = 0; i < thisLevel.lvlHeight; i++) {
        for (var j = 0; j < thisLevel.lvlWidth; j++) {
          var tipoCasilla = thisLevel.getMapTile(i,j);
          //paredes
          if(tipoCasilla>=100 && tipoCasilla<=199){
            ctx.fillStyle="blue"
            ctx.fillRect(j*TILE_HEIGHT,i*TILE_WIDTH,TILE_WIDTH,TILE_HEIGHT);
            //pildoras normales
          }else if (tipoCasilla==2) {
            ctx.beginPath();
            ctx.fillStyle="white"
            ctx.arc(j*TILE_HEIGHT+TILE_HEIGHT/2,i*TILE_WIDTH+TILE_WIDTH/2,5,0,2*Math.PI);
            ctx.fill();
            ctx.stroke();
            //pildoras rojas (parpadeando)
          }else if (tipoCasilla==3) {
            if(thisLevel.powerPelletBlinkTimer<30){
              ctx.beginPath();
              ctx.fillStyle="red"
              ctx.arc(j*TILE_HEIGHT+TILE_HEIGHT/2,i*TILE_WIDTH+TILE_WIDTH/2,5,0,2*Math.PI);
              ctx.fill();
              ctx.stroke();
            }
            if(thisLevel.powerPelletBlinkTimer==0){
              thisLevel.powerPelletBlinkTimer=60;
            }
            thisLevel.powerPelletBlinkTimer--;
          }
        }
      }
      ctx.fillStyle="yellow"
    };

    this.isWall = function(row, col) {
      // Tu código aquí
      var tipoCasilla = thisLevel.getMapTile(row,col);
      return(tipoCasilla>=100 && tipoCasilla<=199);
    };

    this.checkIfHitWall = function(possiblePlayerX, possiblePlayerY, row, col){
      //para que no se pueda chocar en pasillo porque el radio de Pacman no se ajusta exactamente uso TILE_HEIGHT y TILE_WIDTH el -1 para qeu se pueda mover
      var newCol = Math.floor((possiblePlayerX+(thisGame.TILE_WIDTH-1))/thisGame.TILE_WIDTH);
      var newRow = Math.floor((possiblePlayerY+(thisGame.TILE_HEIGHT-1))/thisGame.TILE_HEIGHT);
      var hit=true;
      if(!this.isWall(row,col)&&!this.isWall(newRow,newCol)){
        if(!this.isWall(row,newCol)&&!this.isWall(newRow,col)){
          hit=false;
        }
      }
      return hit;
    };

    this.checkIfHit = function(playerX, playerY, x, y, holgura){
      return (Math.abs(playerX-x)<holgura && Math.abs(playerY-y)<holgura);
    };

    this.checkIfHitSomething = function(playerX, playerY, row, col){
      var tileID = {
        'door-h' : 20,
        'door-v' : 21,
        'pellet-power' : 3,
        'pellet': 2
      };
      // Gestiona la recogida de píldoras (considero pellet solo las normales)
      var tipoCasilla = thisLevel.getMapTile(row,col);
      //pildoras
      if(tipoCasilla==2){
        //para no reproducir mas de un eating a la vez (la primerav vez no stop sin que este en play... pero no pasa nada)
        eating.play();

        thisLevel.setMapTile(row,col,0);
        thisLevel.pellets--;
        addToScore(10);
        //TODO: ultima pellet? -> next level (si quedanse de poder tambien pasaría)
      }else if(tipoCasilla==3){
        // Gestiona la recogida de píldoras de poder
        // (cambia el estado de los fantasmas)
        //para no reproducir mas de un eat_pill si se comen dos pildoras de poder antes de que acabe el tiempo vulnerable
        if(!thisLevel.algunFantasmaVulnerable()){
          waza.play();
        }

        thisLevel.setMapTile(row,col,0)
        addToScore(40);
        thisGame.ghostTimer=360;
        for (var i=0; i< numGhosts; i++){
          if(ghosts[i].state!= Ghost.SPECTACLES){
            ghosts[i].state = Ghost.VULNERABLE;
          }
        }
      }
      // Gestiona las puertas teletransportadoras
      //puerta horizontal
      else if (tipoCasilla==20) {
        if(col==0 && (player.x-player.speed)==0){
          player.x=(thisLevel.lvlWidth-1)*thisGame.TILE_WIDTH;
        }else if(col==(thisLevel.lvlWidth-1)){
          player.x=thisGame.TILE_WIDTH;
        }
      }
      //puerta vertical
      else if (tipoCasilla==21) {
        if(row==0 && (player.y-player.speed)==0){
          player.y=(thisLevel.lvlHeight-1)*thisGame.TILE_HEIGHT;
        }else if(row==(thisLevel.lvlHeight-1)){
          player.y=thisGame.TILE_HEIGHT;
        }
      }
    };

    this.algunFantasmaVulnerable = function(){
      var vuln=false;
      for (var i=0; i< numGhosts; i++){
        if(ghosts[i].state==Ghost.VULNERABLE){
          vuln=true;
          break;
        }
      }
      return vuln;
    }


  }; // end Level

  var Pacman = function() {
    this.radius = 10;
    this.x = 0;
    this.y = 0;
    this.speed = 3;
    this.angle1 = 0.25;
    this.angle2 = 1.75;
    //un sprite por cada direccion
    this.sprite=[];
    //derecha
    this.sprite[0] = new Sprite('res/sprites.png', [454,0], [16,16], 0.005, [0,1,2]);
    //modificado el sprites.png original copiando para cada direccion al Pacman completo (pacman sin boca)
    //izquierda
    this.sprite[1] = new Sprite('res/sprites.png', [454,16], [16,16], 0.005, [0,1,2]);
    //arriba
    this.sprite[2] = new Sprite('res/sprites.png', [454,32], [16,16], 0.005, [0,1,2]);
    //abajo
    this.sprite[3] = new Sprite('res/sprites.png', [454,48], [16,16], 0.005, [0,1,2]);

    this.ctx=ctx;
  };

  Pacman.prototype.move = function() {
    //PRE: solo un inputStates esta en true
    if(inputStates.right){
      this.sprite[0].update(delta);
    }else if (inputStates.left) {
      this.sprite[1].update(delta);
    }else if (inputStates.up) {
      this.sprite[2].update(delta);
    }else{
      this.sprite[3].update(delta);
    }

    var newX = this.x+this.velX;
    var newY = this.y+this.velY;
    //check if positions are integers
    if(parseInt(newX, 10) && parseInt(newY, 10)){
      var newCol = Math.floor(newX/thisGame.TILE_WIDTH);
      var newRow = Math.floor(newY/thisGame.TILE_HEIGHT);
      //check if hit wall
      if(!thisLevel.checkIfHitWall(newX,newY,newRow,newCol)){
        if(newX>=0 && (2*this.radius+newX)<=w){
          this.x = newX;
        }
        if(newY>=0 && (2*this.radius+newY)<=h){
          this.y = newY;
        }
        //ya se que no ha chocado con pared -> compruebo pellet o puerta
        thisLevel.checkIfHitSomething(newX,newY, newRow, newCol);
      }
    }
    // test13 Tu código aquí.  Si chocamos contra un fantasma y su estado es Ghost.VULNERABLE
    // cambiar velocidad del fantasma y pasarlo a modo Ghost.SPECTACLES
    for (var i=0; i< numGhosts; i++){
      if(thisLevel.checkIfHit(newX, newY, ghosts[i].x, ghosts[i].y, thisLevel.holgura)){
        if(ghosts[i].state==Ghost.VULNERABLE){
          //sonido
          eat_ghost.play();
          ghosts[i].state= Ghost.SPECTACLES;
        }
        // Si chocamos contra un fantasma cuando éste esta en estado Ghost.NORMAL --> cambiar el modo de juego a HIT_GHOST
        else if (ghosts[i].state==Ghost.NORMAL) {
          //sonido
          die.play();
          thisGame.setMode(thisGame.HIT_GHOST);
          thisGame.lifes--;
          if(thisGame.lifes==0){
            thisGame.setMode(thisGame.GAME_OVER);
          }
        }
      }
    }
  };

  // Función para pintar el Pacman
  Pacman.prototype.draw = function(x, y) {
    ctx.save();
    ctx.translate(this.x,this.y);
    if(this.velX>0){
      this.sprite[0].render(this.ctx,this.x,this.y);
    }else if (this.velX<0) {
      this.sprite[1].render(this.ctx,this.x,this.y);
    }else if (this.velY<0) {
      this.sprite[2].render(this.ctx,this.x,this.y);
    }else{
      this.sprite[3].render(this.ctx,this.x,this.y);
    }
    ctx.restore();
  };

  var player = new Pacman();
  for (var i=0; i< numGhosts; i++){
    ghosts[i] = new Ghost(i, canvas.getContext("2d"));
  }


  var thisGame = {
    getLevelNum : function(){
      return 0;
    },
    setMode : function(mode) {
      this.mode = mode;
      this.modeTimer = 0;
    },
    screenTileSize: [24, 21],
    TILE_WIDTH: 24,
    TILE_HEIGHT: 24,
    ghostTimer: 0,
    NORMAL : 1,
    HIT_GHOST : 2,
    GAME_OVER : 3,
    WAIT_TO_START: 4,
    PAUSE:5,
    REANUDE:6,
    pause:false,
    modeTimer: 0,
    lifes: 3,
    points: 0,
    highscore: 0,
    sprite: new Sprite('res/sprites.png', [454+16,0], [16,16], 0.005, [0])
  };

  var thisLevel = new Level(canvas.getContext("2d"));
  thisLevel.loadLevel( thisGame.getLevelNum() );

  var measureFPS = function(newTime){
    // la primera ejecución tiene una condición especial
    if(lastTime === undefined) {
      lastTime = newTime;
      return;
    }
    // calcular el delta entre el frame actual y el anterior
    var diffTime = newTime - lastTime;
    if (diffTime >= 1000) {

      fps = frameCount;
      frameCount = 0;
      lastTime = newTime;
    }
    // mostrar los FPS en una capa del documento
    // que hemos construído en la función start()
    fpsContainer.innerHTML = 'FPS: ' + fps;
    frameCount++;
  };

  // clears the canvas content
  var clearCanvas = function() {
    ctx.clearRect(0, 0, w, h);
  };

  var addToScore = function(puntos){
    thisGame.points+=puntos;
  }

  //add al codigo inicial
  function inputValido(x,y) {
    var newCol = Math.floor(x/thisGame.TILE_WIDTH);
    var newRow = Math.floor(y/thisGame.TILE_HEIGHT);
    return !thisLevel.checkIfHitWall(x,y,newRow,newCol);
  }

  var checkInputs = function(){
    if(inputStates.right){
      if(inputValido(player.x+player.speed,player.y)){
        player.velX=player.speed;
        player.velY=0;
      }
    }else if (inputStates.left) {
      if(inputValido(player.x-player.speed,player.y)){
        player.velX=-player.speed;
        player.velY=0;
      }
    }else if(inputStates.up){
      if(inputValido(player.x,player.y-player.speed)){
        player.velX=0;
        player.velY=-player.speed;
      }
    }else if (inputStates.down) {
      if(inputValido(player.x,player.y+player.speed)){
        player.velX=0;
        player.velY=player.speed;
      }
    }
  };

  var updateTimers = function(){
    // Actualizar thisGame.ghostTimer (y el estado de los fantasmas, tal y como se especifica en el enunciado)
    if(thisGame.ghostTimer>0 && thisGame.mode!=thisGame.PAUSE){
      thisGame.ghostTimer--;
    }if (thisGame.ghostTimer==0) {
      //sonido
      waza.stop();
      for (var i=0; i< numGhosts; i++){
        if(ghosts[i].state!=Ghost.SPECTACLES){
          ghosts[i].state = Ghost.NORMAL;
        }
      }
    }
    // actualiza modeTimer...
    if(thisGame.mode!=thisGame.NORMAL){
      thisGame.modeTimer++;
    }
  };

  //add para sprites
  var oldTime=0;
  //POST: tiempo que ha pasado entre frames
  var timer = function(currentTime) {
    var aux = currentTime - oldTime;
    oldTime = currentTime;
    return aux;
  };

  var mainLoop = function(time){
    //main function, called each frame
    measureFPS(time);
    //number of ms since last frame draw
    delta = timer(time);

    // sólo en modo NORMAL
    if(thisGame.mode ==  thisGame.NORMAL){
      checkInputs();
      // Mover fantasmas
      for (var i=0; i< numGhosts; i++){
        ghosts[i].move();
      }
      player.move();
    }
    // en modo HIT_GHOST
    else if(thisGame.mode ==  thisGame.HIT_GHOST){
      if(thisGame.modeTimer==150){
        reset();
        thisGame.setMode(thisGame.WAIT_TO_START);
      }
    }
    // 	en modo WAIT_TO_START
    else if(thisGame.mode ==  thisGame.WAIT_TO_START){
      if(thisGame.modeTimer==50){
        thisGame.setMode(thisGame.NORMAL);
      }
    }
    // Clear the canvas
    clearCanvas();
    thisLevel.drawMap();
    thisLevel.displayScore();

    // Pintar fantasmas
    for (var i=0; i< numGhosts; i++){
      ghosts[i].draw();
    }
    player.draw();

    //	en modo PAUSE
    if(thisGame.mode ==  thisGame.PAUSE){
      thisLevel.displayPause();
    }else if(thisGame.mode ==  thisGame.REANUDE){
      siren.play();
      if(thisLevel.algunFantasmaVulnerable()){
        waza.play();
      }
      thisGame.setMode( thisGame.NORMAL);
    }
    //	en modo GAME_OVER
    else if(thisGame.mode ==  thisGame.GAME_OVER){
      siren.stop();
      thisLevel.displayGameOver();
    }

    updateTimers();
    // call the animation loop every 1/60th of second
    requestAnimationFrame(mainLoop);
  };

  //add al codigo inicial
  function check(e) {
    if(thisGame.mode!=thisGame.GAME_OVER){
      var code = e.keyCode;
      switch (code) {
        //left
        case 37:
        inputStates.left=true;
        inputStates.up=false;
        inputStates.right=false;
        inputStates.down=false;
        break;
        //up
        case 38:
        inputStates.left=false;
        inputStates.up=true;
        inputStates.right=false;
        inputStates.down=false;
        break;
        //right
        case 39:
        inputStates.left=false;
        inputStates.up=false;
        inputStates.right=true;
        inputStates.down=false;
        break;
        //down
        case 40:
        inputStates.left=false;
        inputStates.up=false;
        inputStates.right=false;
        inputStates.down=true;
        break;
        case 80:
        //boolean toggle
        thisGame.pause = !thisGame.pause;

        if(thisGame.pause){
          thisGame.setMode(thisGame.PAUSE);
        }else{
          thisGame.setMode(thisGame.REANUDE);
        }
        break;
      }
    }
  }

  var addListeners = function(){
    //add the listener to the main, window object, and update the states
    document.addEventListener('keydown',check,false);
  };

  var reset = function(){
    // Inicialmente Pacman debe empezar a moverse en horizontal hacia la derecha, con una velocidad igual a su atributo speed
    // inicializa la posición inicial de Pacman tal y como indica el enunciado
    var casillaPacman = thisLevel.map.indexOf("4");
    player.x = casillaPacman%thisLevel.lvlWidth*thisGame.TILE_HEIGHT;
    player.y = Math.floor(casillaPacman/thisLevel.lvlWidth)*thisGame.TILE_HEIGHT;
    inputStates.right=true;
    // Inicializa los atributos x,y, velX, velY, speed de la clase Ghost de forma conveniente
    for (var i = 0; i < numGhosts; i++) {
      var fant = thisLevel.map.indexOf(""+(10+i));
      ghosts[i].x = fant%thisLevel.lvlWidth*thisGame.TILE_HEIGHT;
      ghosts[i].y = Math.floor(fant/thisLevel.lvlWidth)*thisGame.TILE_HEIGHT;
      ghosts[i].homeX = fant%thisLevel.lvlWidth*thisGame.TILE_HEIGHT;
      ghosts[i].homeY = Math.floor(fant/thisLevel.lvlWidth)*thisGame.TILE_HEIGHT;

      ghosts[i].speed = 3;
      ghosts[i].velX = 3;
      ghosts[i].velY = 0;

      ghosts[i].state = Ghost.NORMAL;
    }
    // test14
    thisGame.setMode( thisGame.NORMAL);
  };

  function init(){
    // start the animation
    requestAnimationFrame(mainLoop);
  }

  function loadSounds(){
    //principal con loop
    siren = new Howl({src: ['res/sounds/siren.mp3'], loop: true, autoplay:true, volume:0.5});
    //fantasma vulenable
    waza = new Howl({src: ['res/sounds/waza.mp3'], loop: true});
    //comer pildora
    eating = new Howl({src: ['res/sounds/eating.mp3']});
    //comer pildora de poder
    eat_pill = new Howl({src: ['res/sounds/eat-pill.mp3']});
    //muere Pacman
    die = new Howl({src: ['res/sounds/die.mp3']});
    //pacman come fantasma
    eat_ghost = new Howl({src: ['res/sounds/eat-ghost.mp3']});
    //alma fantasma llega a casa
    ghost_eaten = new Howl({src: ['res/sounds/ghost-eaten.mp3']});
  }

  var start = function(){
    // adds a div for displaying the fps value
    fpsContainer = document.createElement('div');
    document.body.appendChild(fpsContainer);
    addListeners();
    reset();

    //load sounds
    loadSounds();

    resources.load(['res/sprites.png']);
    resources.onReady(init);
  };

  //our GameFramework returns a public API visible from outside its scope
  return {
    start: start,
    thisGame: thisGame
  };
};


var game = new GF();
game.start();
