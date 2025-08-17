"use strict";
console.clear();

// === AdsGram ініціалізація ===
const AdController = window.Adsgram.init({ blockId: "int-13928" });

class Stage {
    constructor() {
        this.render = function () { this.renderer.render(this.scene, this.camera); };
        this.add = function (elem) { this.scene.add(elem); };
        this.remove = function (elem) { this.scene.remove(elem); };
        this.container = document.getElementById('game');
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor('#D0CBC7', 1);
        this.container.appendChild(this.renderer.domElement);
        this.scene = new THREE.Scene();
        let aspect = window.innerWidth / window.innerHeight;
        let d = 20;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -100, 1000);
        this.camera.position.set(2, 2, 2);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.light = new THREE.DirectionalLight(0xffffff, 0.5);
        this.light.position.set(0, 499, 0);
        this.scene.add(this.light);
        this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.softLight);
        window.addEventListener('resize', () => this.onResize());
        this.onResize();
    }
    setCamera(y, speed = 0.3) {
        TweenLite.to(this.camera.position, speed, { y: y + 4, ease: Power1.easeInOut });
        TweenLite.to(this.camera.lookAt, speed, { y: y, ease: Power1.easeInOut });
    }
    onResize() {
        let viewSize = 30;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.left = window.innerWidth / -viewSize;
        this.camera.right = window.innerWidth / viewSize;
        this.camera.top = window.innerHeight / viewSize;
        this.camera.bottom = window.innerHeight / -viewSize;
        this.camera.updateProjectionMatrix();
    }
}

// … твій код Stage і Block лишається без змін …

class Game {
    constructor() {
        this.STATES = { 'LOADING': 'loading', 'PLAYING': 'playing', 'READY': 'ready', 'ENDED': 'ended', 'RESETTING': 'resetting' };
        this.blocks = [];
        this.state = this.STATES.LOADING;
        this.isPaused = false; 
        this.stage = new Stage();
        this.mainContainer = document.getElementById('container');
        this.scoreContainer = document.getElementById('score');
        this.startButton = document.getElementById('start-button');
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

        document.addEventListener('keydown', e => {
            if (!this.isPaused && e.keyCode == 32) this.onAction();
        });
        document.addEventListener('click', e => {
            if (!this.isPaused &&
                document.getElementById("game").classList.contains("active") &&
                e.target.tagName.toLowerCase() === "canvas") {
                this.onAction();
            }
        });

        document.addEventListener('touchstart', e => e.preventDefault());

        document.querySelectorAll('.tab-link').forEach(btn => {
            btn.addEventListener('click', () => {
                const activeTab = document.querySelector('.tab-content.active');
                this.isPaused = activeTab.id !== "game";
            });
        });
    }

    updateState(newState) {
        for (let key in this.STATES) this.mainContainer.classList.remove(this.STATES[key]);
        this.mainContainer.classList.add(newState);
        this.state = newState;
    }
    onAction() {
        switch (this.state) {
            case this.STATES.READY: this.startGame(); break;
            case this.STATES.PLAYING: this.placeBlock(); break;
            case this.STATES.ENDED: this.restartGame(); break;
        }
    }
    startGame() {
        if (this.state != this.STATES.PLAYING) {
            this.scoreContainer.innerHTML = '0';
            this.updateState(this.STATES.PLAYING);
            this.addBlock();
        }
    }
    restartGame() {
        this.updateState(this.STATES.RESETTING);
        let oldBlocks = this.placedBlocks.children;
        let removeSpeed = 0.2;
        let delayAmount = 0.02;
        for (let i = 0; i < oldBlocks.length; i++) {
            TweenLite.to(oldBlocks[i].scale, removeSpeed, { x: 0, y: 0, z: 0, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn, onComplete: () => this.placedBlocks.remove(oldBlocks[i]) });
            TweenLite.to(oldBlocks[i].rotation, removeSpeed, { y: 0.5, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn });
        }
        let cameraMoveSpeed = removeSpeed * 2 + (oldBlocks.length * delayAmount);
        this.stage.setCamera(2, cameraMoveSpeed);
        let countdown = { value: this.blocks.length - 1 };
        TweenLite.to(countdown, cameraMoveSpeed, { value: 0, onUpdate: () => { this.scoreContainer.innerHTML = String(Math.round(countdown.value)); } });
        this.blocks = this.blocks.slice(0, 1);
        setTimeout(() => { this.startGame(); }, cameraMoveSpeed * 1000);
    }
    placeBlock() {
        let currentBlock = this.blocks[this.blocks.length - 1];
        let newBlocks = currentBlock.place();
        this.newBlocks.remove(currentBlock.mesh);
        if (newBlocks.placed) this.placedBlocks.add(newBlocks.placed);
        if (newBlocks.chopped) {
            this.choppedBlocks.add(newBlocks.chopped);
            let positionParams = { y: '-=30', ease: Power1.easeIn, onComplete: () => this.choppedBlocks.remove(newBlocks.chopped) };
            let rotateRandomness = 10;
            let rotationParams = {
                delay: 0.05,
                x: newBlocks.plane == 'z' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
                z: newBlocks.plane == 'x' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
                y: Math.random() * 0.1,
            };
            if (newBlocks.chopped.position[newBlocks.plane] > newBlocks.placed.position[newBlocks.plane]) {
                positionParams[newBlocks.plane] = '+=' + (40 * Math.abs(newBlocks.direction));
            } else {
                positionParams[newBlocks.plane] = '-=' + (40 * Math.abs(newBlocks.direction));
            }
            TweenLite.to(newBlocks.chopped.position, 1, positionParams);
            TweenLite.to(newBlocks.chopped.rotation, 1, rotationParams);
        }
        this.addBlock();
    }
    addBlock() {
        let lastBlock = this.blocks[this.blocks.length - 1];
        if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
            return this.endGame();
        }
        this.scoreContainer.innerHTML = String(this.blocks.length - 1);
        let newKidOnTheBlock = new Block(lastBlock);
        this.newBlocks.add(newKidOnTheBlock.mesh);
        this.blocks.push(newKidOnTheBlock);
        this.stage.setCamera(this.blocks.length * 2);
        if (this.blocks.length >= 5) this.instructions.classList.add('hide');
    }
    endGame() {
        this.updateState(this.STATES.ENDED);
        let currentScore = parseInt(this.scoreContainer.innerText);
        updateHighscore(currentScore);

        // === Показ реклами після поразки ===
        if (AdController) {
            AdController.show()
                .then(() => console.log("Реклама показана"))
                .catch(err => console.warn("Реклама не завантажилась:", err));
        }
    }
    tick() {
        if (!this.isPaused) {
            this.blocks[this.blocks.length - 1].tick();
            this.stage.render();
        }
        requestAnimationFrame(() => { this.tick(); });
    }
}

let game = new Game();
