// 간단한 강아지 회피 게임 (Canvas) — 기능 확장: 터치 버튼, 사운드, 레벨, 최고점, 파티클
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

// Sprite 시스템
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
    
    // 통통 튀는 효과
    if (options.bounce !== false) {
      const bounce = Math.sin(Date.now() / 150) * 2;
      ctx.translate(0, bounce);
    }
    
    // 달리는 효과 (좌우 기울기)
    if (options.tilt) {
      ctx.rotate(Math.sin(Date.now() / 100) * 0.1);
    }
    
    ctx.drawImage(this.image, -w/2, -h/2, w, h);
    
    ctx.restore();
  }
}

let player, obstacles, keys, lastSpawn, spawnInterval, score, lastTime, gameOver, level, highScore, particles;
let audioCtx;
let gameStarted = false;

// 파티클 시스템 확장
class BoneParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 15;
    this.vy = (Math.random() - 0.5) * 15 - (isGameOver ? 15 : 5);
    const speed = isGameOver ? 30 : 15;
    this.rotationSpeed = (Math.random() - 0.5) * (isGameOver ? 0.8 : 0.4);
    this.alpha = 1;
    this.size = isGameOver ? 25 + Math.random() * 15 : 15 + Math.random() * 10;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.4;
    this.alpha = 1;
    this.size = 20 + Math.random() * 10;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.8; // 중력
    this.vx *= 0.99; // 공기 저항
    this.rotation += this.rotationSpeed;
    this.alpha *= 0.97;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    boneSprite.draw(ctx, -this.size/2, -this.size/2, this.size, this.size, { bounce: false });
    ctx.restore();
  }
}

// 스프라이트 로드
const playerSprite = new Sprite('src/images/player-dog.svg');
const obstacleSprite = new Sprite('src/images/obstacle-dog.svg');
const boneSprite = new Sprite('src/images/particle-bone.svg');

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
  }catch(e){ /* Audio not available */ }
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
  particles = [];
  keys = { left:false, right:false };
  lastSpawn = 0;
  spawnInterval = 800;
  score = 0;
  level = 1;
  lastTime = null;
  
  // load highscore
  highScore = parseInt(localStorage.getItem('dodge_highscore') || '0', 10) || 0;
  updateHUD();
  msgEl.classList.add('hidden');
  
  // show touch controls on small screens
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
  scoreEl.textContent = `점수: ${Math.floor(score)}`;
  levelEl.textContent = `레벨: ${level}`;
  highEl.textContent = `최고: ${highScore}`;
}

function rectsCollide(a,b){
  // 실제 캐릭터 크기의 70%만 충돌 영역으로 사용
  const margin = 0.15; // 15% 여백
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

function spawnParticles(x, y, color, count=12, size=4){
  for(let i=0; i<count; i++){
    const angle = Math.random()*Math.PI*2;
    const speed = 40 + Math.random()*180;
    particles.push({ 
      x, y, 
      vx: Math.cos(angle)*speed, 
      vy: Math.sin(angle)*speed, 
      life: 0.6 + Math.random()*0.6, 
      color,
      size,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 5
    });
  }
}

function updateParticles(dt){
  for(let i=particles.length-1; i>=0; i--){
    const p = particles[i];
    p.life -= dt;
    if(p.life <= 0) { particles.splice(i,1); continue; }
    p.vy += 300 * dt; // gravity
    p.vx *= 0.99; // air resistance
    p.vy *= 0.99;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rotation += p.rotationSpeed * dt;
  }
}

function update(dt){
  if(gameOver) return;

  // player movement
  if(keys.left) player.x -= player.speed * dt;
  if(keys.right) player.x += player.speed * dt;
  player.x = Math.max(5, Math.min(WIDTH - player.w - 5, player.x));

  // spawn
  lastSpawn += dt*1000;
  if(lastSpawn > spawnInterval){
    spawnObstacle();
    lastSpawn = 0;
    // 점점 빨라짐
    if(spawnInterval > 350) spawnInterval *= 0.98;
  }

  // move obstacles
  for(let i=obstacles.length-1;i>=0;i--){
    const ob = obstacles[i];
    ob.y += ob.speed * dt;
    if(rectsCollide(ob, player)) {
      gameOver = true;
      msgEl.classList.remove('hidden');
      playSound('hit');
      spawnParticles(player.x + player.w/2, player.y + player.h/2, '#ff8b8b', 28, 12);
      createBoneParticles(); // 뼈 파티클 생성
      // save highscore
      if(Math.floor(score) > highScore){
        highScore = Math.floor(score);
        localStorage.setItem('dodge_highscore', String(highScore));
      }
      updateHUD();
    }
    if(ob.y > HEIGHT + 50) {
      obstacles.splice(i,1);
      score += 10; // 피할 때마다 점수
      playSound('score');
      // spawn small particles to celebrate
      spawnParticles(ob.x + ob.w/2, HEIGHT - 10, '#9bffb3', 8, 8);
      // level up for every 100 points
      const newLevel = Math.floor(score / 100) + 1;
      if(newLevel > level){ level = newLevel; }
      updateHUD();
    }
  }

  updateParticles(dt);
}

function draw(){
  // 배경
  ctx.clearRect(0,0,WIDTH,HEIGHT);

  // 플레이어
  playerSprite.draw(ctx, player.x, player.y, player.w, player.h, {
    tilt: keys.left || keys.right
  });

  // 장애물
  for(const ob of obstacles){
    obstacleSprite.draw(ctx, ob.x, ob.y, ob.w, ob.h);
  }

  // 파티클
  for(const p of particles){
    const alpha = Math.max(0, Math.min(1, p.life));
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    boneSprite.draw(ctx, -p.size/2, -p.size/2, p.size, p.size);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // if game over overlay
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

// 입력
window.addEventListener('keydown', (e)=>{
  if(e.code === 'ArrowLeft') keys.left = true;
  if(e.code === 'ArrowRight') keys.right = true;
  if((e.code === 'KeyR' || e.code === 'Space') && gameOver) start();
});
window.addEventListener('keyup', (e)=>{
  if(e.code === 'ArrowLeft') keys.left = false;
  if(e.code === 'ArrowRight') keys.right = false;
});

canvas.addEventListener('click', ()=>{
  if(gameOver) start();
});

// 터치/버튼 입력 처리 (지속 이동 지원)
btnLeft.addEventListener('touchstart', (e)=>{ e.preventDefault(); keys.left = true; });
btnLeft.addEventListener('touchend', (e)=>{ e.preventDefault(); keys.left = false; });
btnLeft.addEventListener('mousedown', ()=> keys.left = true);
btnLeft.addEventListener('mouseup', ()=> keys.left = false);

btnRight.addEventListener('touchstart', (e)=>{ e.preventDefault(); keys.right = true; });
btnRight.addEventListener('touchend', (e)=>{ e.preventDefault(); keys.right = false; });
btnRight.addEventListener('mousedown', ()=> keys.right = true);
btnRight.addEventListener('mouseup', ()=> keys.right = false);

// 기존 터치(화면 어디든지 누름)도 지원: 좌/우 반으로 나눠 처리
canvas.addEventListener('touchstart',(e)=>{
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = t.clientX - rect.left;
  keys.left = x < WIDTH/2;
  keys.right = x >= WIDTH/2;
});
canvas.addEventListener('touchend',()=>{ keys.left=false; keys.right=false; });

function createBoneParticles() {
  for (let i = 0; i < 10; i++) {
     particles.push(new BoneParticle(player.x + player.w/2, player.y + player.h/2, true));
  }
}

function start() {
  if (gameOver) {
    reset();
  }
}

function update(dt) {
  if (!gameStarted || gameOver) return;
  
  // 플레이어 이동
  if(keys.left) player.x -= player.speed * dt;
  if(keys.right) player.x += player.speed * dt;
  player.x = Math.max(5, Math.min(WIDTH - player.w - 5, player.x));

  // spawn
  lastSpawn += dt*1000;
  if(lastSpawn > spawnInterval){
    spawnObstacle();
    lastSpawn = 0;
    // 점점 빨라짐
    if(spawnInterval > 350) spawnInterval *= 0.98;
  }

  // 장애물 이동 및 충돌 체크
  for(let i=obstacles.length-1; i>=0; i--){
    const ob = obstacles[i];
    ob.y += ob.speed * dt;
    if(rectsCollide(ob, player)) {
      gameOver = true;
      msgEl.classList.remove('hidden');
      playSound('hit');
      createBoneParticles();
      if(score > highScore){
        highScore = Math.floor(score);
        localStorage.setItem('dodge_highscore', highScore.toString());
        updateHUD();
      }
    }
    if(ob.y > HEIGHT + 50) {
      obstacles.splice(i,1);
      score += 10;
      playSound('score');
      spawnParticles(ob.x + ob.w/2, HEIGHT - 10, '#9bffb3', 8, 8);
      const newLevel = Math.floor(score / 100) + 1;
      if(newLevel > level){ level = newLevel; }
      updateHUD();
    }
  }

  // 파티클 업데이트
  for(let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    if(p.update) {
      p.update();
      if(p.alpha <= 0.1) particles.splice(i, 1);
    }
  }
}

// 게임 시작 버튼 이벤트 리스너
playButton.addEventListener('click', startGame);

// 초기 상태 설정
reset();
startScreen.style.display = 'block';
gameStarted = false;
requestAnimationFrame(loop);
