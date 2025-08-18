"use strict";
console.clear();

/* ====== ГЛОБАЛЬНИЙ СТАН (баланс/рекорди/завдання) ====== */
let balance = 0, subscribed = false, task50Completed = false, highscore = 0;

function loadData() {
  balance = parseInt(localStorage.getItem("balance") || "0", 10);
  subscribed = localStorage.getItem("subscribed") === "true";
  task50Completed = localStorage.getItem("task50Completed") === "true";
  highscore = parseInt(localStorage.getItem("highscore") || "0", 10);
  document.getElementById("balance").innerText = balance;
  document.getElementById("highscore").innerText = "🏆 " + highscore;
  const subBtn = document.getElementById("subscribeBtn");
  if (subBtn && subscribed) { subBtn.innerText = "Виконано"; subBtn.classList.add("done"); }
  const t50 = document.getElementById("checkTask50");
  if (t50 && task50Completed) { t50.innerText = "Виконано"; t50.classList.add("done"); }
}
function saveData() {
  localStorage.setItem("balance", balance);
  localStorage.setItem("subscribed", subscribed);
  localStorage.setItem("task50Completed", task50Completed);
  localStorage.setItem("highscore", highscore);
}
function addBalance(amount) { balance += amount; document.getElementById("balance").innerText = balance; saveData(); }
function updateHighscore(currentScore) {
  if (currentScore > highscore) {
    highscore = currentScore;
    localStorage.setItem("highscore", String(highscore));
    document.getElementById("highscore").innerText = "🏆 " + highscore;
  }
}
function subscribe() {
  if (subscribed) return;
  const url = "https://t.me/stackofficialgame";
  if (window.Telegram?.WebApp?.openTelegramLink) {
    Telegram.WebApp.openTelegramLink(url);
  } else {
    window.open(url, "_blank");
  }
  const btn = document.getElementById("subscribeBtn");
  btn.innerText = "Виконано"; btn.classList.add("done");
  subscribed = true; addBalance(1); saveData();
}

/* ====== Adsgram ====== */
let AdController = null;
function initAds() {
  if (!window.Adsgram) {
    console.warn("Adsgram SDK не завантажився");
    return;
  }
  AdController = window.Adsgram.init({
    blockId: "YOUR_BLOCK_ID", // <-- заміни на свій blockId
    debug: true               // у продакшені постав false
  });
}
async function showAdAndMaybeRevive() {
  if (!AdController) { console.warn("AdController не ініціалізовано"); return; }
  try {
    const result = await AdController.show();
    if (result && result.done) {
      // нагорода за перегляд
      addBalance(3);
      // простий "revive": перезапустити гру
      game.restartGame();
    }
  } catch (e) {
    console.warn("Реклама не показана:", e);
  }
}

/* ====== Навігація сторінками ====== */
function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.menu button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // пауза гри поза вкладкою "game"
  if (window.game) game.isPaused = (id !== 'game');
}
window.showPage = showPage;

/* ====== 3D СЦЕНА + ЛОГІКА ГРИ ====== */
class Stage {
  constructor() {
    this.render = () => { this.camera.lookAt(this.cameraTarget); this.renderer.render(this.scene, this.camera); };
    this.add = (elem) => { this.scene.add(elem); };
    this.remove = (elem) => { this.scene.remove(elem); };
    this.container = document.getElementById('container');
    this.renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor('#D0CBC7', 1);
    this.container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const d = 20;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -100, 1000);
    this.camera.position.set(2, 2, 2);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.camera.lookAt(this.cameraTarget);
    this.light = new THREE.DirectionalLight(0xffffff, 0.5); this.light.position.set(0, 499, 0); this.scene.add(this.light);
    this.softLight = new THREE.AmbientLight(0xffffff, 0.4); this.scene.add(this.softLight);
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }
  setCamera(y, speed = 0.3) {
    gsap.to(this.camera.position, { y: y + 4, duration: speed, ease: "power1.inOut" });
    gsap.to(this.cameraTarget, { y: y, duration: speed, ease: "power1.inOut" });
  }
  onResize() {
    const viewSize = 30;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.left = window.innerWidth / -viewSize;
    this.camera.right = window.innerWidth / viewSize;
    this.camera.top = window.innerHeight / viewSize;
    this.camera.bottom = window.innerHeight / -viewSize;
    this.camera.updateProjectionMatrix();
  }
}

class Block {
  constructor(block) {
    this.STATES = { ACTIVE:'active', STOPPED:'stopped', MISSED:'missed' };
    this.MOVE_AMOUNT = 12;
    this.dimension = { width:0, height:0, depth:0 };
    this.position = { x:0, y:0, z:0 };
    this.targetBlock = block;
    this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1;
    this.workingPlane = this.index % 2 ? 'x' : 'z';
    this.workingDimension = this.index % 2 ? 'width' : 'depth';
    this.dimension.width  = this.targetBlock ? this.targetBlock.dimension.width  : 10;
    this.dimension.height = this.targetBlock ? this.targetBlock.dimension.height : 2;
    this.dimension.depth  = this.targetBlock ? this.targetBlock.dimension.depth  : 10;
    this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
    this.position.y = this.dimension.height * this.index;
    this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;
    this.colorOffset = this.targetBlock ? this.targetBlock.colorOffset : Math.round(Math.random()*100);
    if (!this.targetBlock) {
      this.color = 0x333344;
    } else {
      const offset = this.index + this.colorOffset;
      const r = Math.sin(0.3*offset)*55 + 200;
      const g = Math.sin(0.3*offset+2)*55 + 200;
      const b = Math.sin(0.3*offset+4)*55 + 200;
      this.color = new THREE.Color(r/255, g/255, b/255);
    }
    this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;
    this.speed = -0.1 - (this.index * 0.005);
    if (this.speed < -4) this.speed = -4;
    this.direction = this.speed;
    const geometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
    geometry.translate(this.dimension.width/2, this.dimension.height/2, this.dimension.depth/2);
    this.material = new THREE.MeshToonMaterial({ color:this.color });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    if (this.state === this.STATES.ACTIVE) {
      this.position[this.workingPlane] = Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
    }
  }
  reverseDirection(){ this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed); }
  place(){
    this.state = this.STATES.STOPPED;
    let overlap = this.targetBlock.dimension[this.workingDimension] - Math.abs(this.position[this.workingPlane] - this.targetBlock.position[this.workingPlane]);
    const blocksToReturn = { plane:this.workingPlane, direction:this.direction };
    if (this.dimension[this.workingDimension] - overlap < 0.3) {
      overlap = this.dimension[this.workingDimension];
      blocksToReturn.bonus = true;
      this.position.x = this.targetBlock.position.x;
      this.position.z = this.targetBlock.position.z;
      this.dimension.width = this.targetBlock.dimension.width;
      this.dimension.depth = this.targetBlock.dimension.depth;
    }
    if (overlap > 0) {
      const choppedDimensions = { width:this.dimension.width, height:this.dimension.height, depth:this.dimension.depth };
      choppedDimensions[this.workingDimension] -= overlap;
      this.dimension[this.workingDimension] = overlap;

      const placedGeometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
      placedGeometry.translate(this.dimension.width/2, this.dimension.height/2, this.dimension.depth/2);
      const placedMesh = new THREE.Mesh(placedGeometry, this.material);

      const choppedGeometry = new THREE.BoxGeometry(choppedDimensions.width, choppedDimensions.height, choppedDimensions.depth);
      choppedGeometry.translate(choppedDimensions.width/2, choppedDimensions.height/2, choppedDimensions.depth/2);
      const choppedMesh = new THREE.Mesh(choppedGeometry, this.material);

      const choppedPosition = { x:this.position.x, y:this.position.y, z:this.position.z };
      if (this.position[this.workingPlane] < this.targetBlock.position[this.workingPlane]) {
        this.position[this.workingPlane] = this.targetBlock.position[this.workingPlane];
      } else {
        choppedPosition[this.workingPlane] += overlap;
      }

      placedMesh.position.set(this.position.x, this.position.y, this.position.z);
      choppedMesh.position.set(choppedPosition.x, choppedPosition.y, choppedPosition.z);
      blocksToReturn.placed = placedMesh;
      if (!blocksToReturn.bonus) blocksToReturn.chopped = choppedMesh;
    } else {
      this.state = this.STATES.MISSED;
    }
    this.dimension[this.workingDimension] = overlap;
    return blocksToReturn;
  }
  tick(){
    if (this.state === this.STATES.ACTIVE) {
      let value = this.position[this.workingPlane];
      if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT) this.reverseDirection();
      this.position[this.workingPlane] += this.direction;
      this.mesh.position[this.workingPlane] = this.position[this.workingPlane];
    }
  }
}

class Game {
  constructor() {
    this.STATES = { LOADING:'loading', PLAYING:'playing', READY:'ready', ENDED:'ended', RESETTING:'resetting' };
    this.blocks = []; this.state = this.STATES.LOADING; this.isPaused = false;
    this.stage = new Stage();
    this.mainContainer = document.getElementById('container');
    this.scoreContainer = document.getElementById('score');
    this.instructions = document.getElementById('instructions');
    this.scoreContainer.innerHTML = '0';

    this.newBlocks = new THREE.Group();
    this.placedBlocks = new THREE.Group();
    this.choppedBlocks = new THREE.Group();
    this.stage.add(this.newBlocks);
    this.stage.add(this.placedBlocks);
    this.stage.add(this.choppedBlocks);

    this.addBlock();
    this.tick();
    this.updateState(this.STATES.READY);

    // керування
    document.addEventListener('keydown', e => {
      if (!this.isPaused && e.code === "Space") this.onAction();
    });
    document.addEventListener('click', e => {
      if (!this.isPaused &&
          document.getElementById("game").classList.contains("active") &&
          e.target.tagName.toLowerCase() === "canvas") {
        this.onAction();
      }
    });

    // кнопки
    document.getElementById('start-button').addEventListener('click', () => this.onAction());
    document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
    document.getElementById('watch-ad-btn').addEventListener('click', () => showAdAndMaybeRevive());
  }

  updateState(newState){
    for (const k in this.STATES) this.mainContainer.classList.remove(this.STATES[k]);
    this.mainContainer.classList.add(newState);
    this.state = newState;
  }
  onAction(){
    switch (this.state) {
      case this.STATES.READY: this.startGame(); break;
      case this.STATES.PLAYING: this.placeBlock(); break;
      case this.STATES.ENDED: this.restartGame(); break;
    }
  }
  startGame(){
    if (this.state !== this.STATES.PLAYING) {
      this.scoreContainer.innerHTML = '0';
      this.updateState(this.STATES.PLAYING);
      this.addBlock();
    }
  }
  restartGame(){
    this.updateState(this.STATES.RESETTING);
    const oldBlocks = [...this.placedBlocks.children];
    const removeSpeed = 0.2, delayAmount = 0.02;
    for (let i=0;i<oldBlocks.length;i++){
      gsap.to(oldBlocks[i].scale, { x:0,y:0,z:0, duration:removeSpeed, delay:(oldBlocks.length - i)*delayAmount, ease:"power1.in", onComplete:()=>this.placedBlocks.remove(oldBlocks[i]) });
      gsap.to(oldBlocks[i].rotation, { y:0.5, duration:removeSpeed, delay:(oldBlocks.length - i)*delayAmount, ease:"power1.in" });
    }
    const cameraMoveSpeed = removeSpeed*2 + (oldBlocks.length * delayAmount);
    this.stage.setCamera(2, cameraMoveSpeed);
    const countdown = { value:this.blocks.length - 1 };
    gsap.to(countdown, { value:0, duration:cameraMoveSpeed, onUpdate:()=>{ this.scoreContainer.innerHTML = String(Math.round(countdown.value)); }});
    this.blocks = this.blocks.slice(0,1);
    setTimeout(()=>{ this.startGame(); }, cameraMoveSpeed*1000);
  }
  placeBlock(){
    const currentBlock = this.blocks[this.blocks.length - 1];
    const newBlocks = currentBlock.place();
    this.newBlocks.remove(currentBlock.mesh);
    if (newBlocks.placed) this.placedBlocks.add(newBlocks.placed);
    if (newBlocks.chopped) {
      this.choppedBlocks.add(newBlocks.chopped);
      const positionParams = { y:'-=30', ease:"power1.in", onComplete:()=>this.choppedBlocks.remove(newBlocks.chopped) };
      const rotateRandomness = 10;
      const rotationParams = {
        delay:0.05,
        x: newBlocks.plane === 'z' ? ((Math.random()*rotateRandomness)-(rotateRandomness/2)) : 0.1,
        z: newBlocks.plane === 'x' ? ((Math.random()*rotateRandomness)-(rotateRandomness/2)) : 0.1,
        y: Math.random()*0.1,
        duration:1
      };
      if (newBlocks.chopped.position[newBlocks.plane] > newBlocks.placed.position[newBlocks.plane]) {
        positionParams[newBlocks.plane] = '+=' + (40*Math.abs(newBlocks.direction));
      } else {
        positionParams[newBlocks.plane] = '-=' + (40*Math.abs(newBlocks.direction));
      }
      gsap.to(newBlocks.chopped.position, { ...positionParams, duration:1 });
      gsap.to(newBlocks.chopped.rotation, rotationParams);
    }
    this.addBlock();
  }
  addBlock(){
    const lastBlock = this.blocks[this.blocks.length - 1];
    if (lastBlock && lastBlock.state === lastBlock.STATES.MISSED) return this.endGame();
    document.getElementById('score').innerHTML = String(this.blocks.length - 1);
    const newKidOnTheBlock = new Block(lastBlock);
    this.newBlocks.add(newKidOnTheBlock.mesh);
    this.blocks.push(newKidOnTheBlock);
    this.stage.setCamera(this.blocks.length * 2);
    if (this.blocks.length >= 5) this.instructions.classList.add('hide');
  }
  endGame(){
    this.updateState(this.STATES.ENDED);
    const currentScore = parseInt(document.getElementById('score').innerText, 10);
    updateHighscore(currentScore);
    // показ реклами робимо з кнопки "Подивитись рекламу"
  }
  tick(){
    if (!this.isPaused) {
      this.blocks[this.blocks.length - 1].tick();
      this.stage.render();
    }
    requestAnimationFrame(()=>this.tick());
  }
}

/* ====== ІНІЦІАЛІЗАЦІЯ ====== */
window.addEventListener('DOMContentLoaded', () => {
  loadData();

  // Завдання
  document.getElementById("subscribeBtn").addEventListener("click", subscribe);
  document.getElementById("checkTask50").addEventListener("click", () => {
    const btn = document.getElementById("checkTask50");
    if (highscore >= 50 && !task50Completed) {
      addBalance(10); btn.innerText = "Виконано"; btn.classList.add("done");
      task50Completed = true; saveData();
    } else if (highscore < 50) {
      alert("❌ Твій рекорд замалий (потрібно 50+)");
    }
  });

  initAds();              // Adsgram
  window.game = new Game();
});

