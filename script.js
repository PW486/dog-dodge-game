const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const highEl = document.getElementById('highscore');
const msgEl = document.getElementById('message');
const startScreen = document.getElementById('startScreen');
const playButton = document.getElementById('playButton');
const touchControls = document.getElementById('touchControls');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

class Sprite {
  constructor(imagePath) {
    this.image = new Image();
    this.image.src = imagePath;
    this.width = 40;
    this.height = 40;
    this.loaded = false;
    this.image.onload = () => this.loaded = true;
  }

  draw(ctx, x, y, w = this.width, h = this.height, options = {}) {
    if (!this.loaded) return;
    
    ctx.save();
    ctx.translate(x + w/2, y + h/2);
    if (options.bounce !== false) {
      const bounce = Math.sin(Date.now() / 150) * 2;
      ctx.translate(0, bounce);
    }
    if (options.tilt) {
      ctx.rotate(Math.sin(Date.now() / 100) * 0.1);
    }
    
    ctx.drawImage(this.image, -w/2, -h/2, w, h);
    
    ctx.restore();
  }
}

let player, obstacles, keys, lastSpawn, spawnInterval, score, lastTime, gameOver, level, highScore;
let audioCtx;
let gameStarted = false;

 
const playerSprite = new Sprite('src/images/player-dog.svg');
const obstacleSprite = new Sprite('src/images/obstacle-dog.svg');

function ensureAudio(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type){
  try{
    ensureAudio();
    const now = audioCtx.currentTime;
    if(type === 'score'){
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(800, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now + 0.26);
    } else if(type === 'hit'){
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(120, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now + 0.5);
    }
  }catch(e){}
}

function startGame() {
  gameStarted = true;
  startScreen.style.display = 'none';
  reset();
}

function reset() {
  gameOver = false;
  player = { x: WIDTH/2 - 20, y: HEIGHT - 70, w: 40, h: 40, speed: 280 };
  obstacles = [];
  keys = { left:false, right:false };
  lastSpawn = 0;
  spawnInterval = 800;
  score = 0;
  level = 1;
  lastTime = null;
  
  highScore = parseInt(localStorage.getItem('dodge_highscore') || '0', 10) || 0;
  updateHUD();
  msgEl.classList.add('hidden');
  
  if(window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches){
    touchControls.classList.remove('hidden');
  } else {
    touchControls.classList.add('hidden');
  }

  if (!gameStarted) {
    startScreen.style.display = 'block';
  }
}

function spawnObstacle() {
  const w = 30 + Math.random()*40;
  const x = Math.max(5, Math.random()*(WIDTH - w - 10));
  const baseSpeed = 120 + Math.random()*140;
  const speed = baseSpeed + (level-1)*30 + score*0.15;
  obstacles.push({ x, y:-w, w, h:w, speed });
}

function updateHUD() {
  scoreEl.textContent = `Score: ${Math.floor(score)}`;
  levelEl.textContent = `Level: ${level}`;
  highEl.textContent = `High: ${highScore}`;
}

function rectsCollide(a,b){
  const margin = 0.15;
  const ax = a.x + a.w * margin;
  const ay = a.y + a.h * margin;
    const aw = a.w * (1 - margin * 2);  
  const ah = a.h * (1 - margin * 2);
  
  const bx = b.x + b.w * margin;
  const by = b.y + b.h * margin;
  const bw = b.w * (1 - margin * 2);
  const bh = b.h * (1 - margin * 2);
  
  return !(ax + aw < bx || ax > bx + bw || ay + ah < by || ay > by + bh);
}

function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);

  playerSprite.draw(ctx, player.x, player.y, player.w, player.h, {
    tilt: keys.left || keys.right
  });

  for(const ob of obstacles){
    obstacleSprite.draw(ctx, ob.x, ob.y, ob.w, ob.h);
  }

  if(gameOver){
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0,0,WIDTH,HEIGHT);
  }
}

function loop(ts){
  if(!lastTime) lastTime = ts;
  const dt = Math.min(0.05, (ts - lastTime)/1000);
  lastTime = ts;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}
window.addEventListener('keydown', (e)=>{
  if(e.code === 'ArrowLeft') keys.left = true;
  if(e.code === 'ArrowRight') keys.right = true;
  if((e.code === 'KeyR' || e.code === 'Space') && gameOver) startGame();
});
window.addEventListener('keyup', (e)=>{
  if(e.code === 'ArrowLeft') keys.left = false;
  if(e.code === 'ArrowRight') keys.right = false;
});
 
btnLeft.addEventListener('touchstart', (e)=>{ e.preventDefault(); keys.left = true; });
btnLeft.addEventListener('touchend', (e)=>{ e.preventDefault(); keys.left = false; });
btnLeft.addEventListener('mousedown', ()=> keys.left = true);
btnLeft.addEventListener('mouseup', ()=> keys.left = false);

btnRight.addEventListener('touchstart', (e)=>{ e.preventDefault(); keys.right = true; });
btnRight.addEventListener('touchend', (e)=>{ e.preventDefault(); keys.right = false; });
btnRight.addEventListener('mousedown', ()=> keys.right = true);
btnRight.addEventListener('mouseup', ()=> keys.right = false);

canvas.addEventListener('touchstart',(e)=>{
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = t.clientX - rect.left;
  keys.left = x < WIDTH/2;
  keys.right = x >= WIDTH/2;
});
canvas.addEventListener('touchend',()=>{ keys.left=false; keys.right=false; });

function update(dt) {
  if (!gameStarted || gameOver) return;

  if(keys.left) player.x -= player.speed * dt;
  if(keys.right) player.x += player.speed * dt;
  player.x = Math.max(5, Math.min(WIDTH - player.w - 5, player.x));

  lastSpawn += dt*1000;
  if(lastSpawn > spawnInterval){
    spawnObstacle();
    lastSpawn = 0;
    if(spawnInterval > 350) spawnInterval *= 0.98;
  }

  for(let i=obstacles.length-1; i>=0; i--){
    const ob = obstacles[i];
    ob.y += ob.speed * dt;
    if(rectsCollide(ob, player)) {
      gameOver = true;
      msgEl.classList.remove('hidden');
      playSound('hit');
      if(Math.floor(score) > highScore){
        highScore = Math.floor(score);
        localStorage.setItem('dodge_highscore', String(highScore));
      }
      updateHUD();
    }
    if(ob.y > HEIGHT + 50) {
      obstacles.splice(i,1);
      score += 10;
      playSound('score');
      const newLevel = Math.floor(score / 100) + 1;
      if(newLevel > level){ level = newLevel; }
      updateHUD();
    }
  }
}

playButton.addEventListener('click', startGame);
const restartButton = document.getElementById('restartButton');
if (restartButton) {
  restartButton.addEventListener('click', () => {
    startGame();
  });
}

reset();
startScreen.style.display = 'block';
gameStarted = false;
requestAnimationFrame(loop);
