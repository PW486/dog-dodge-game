import { Game } from './src/game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

const touchControls = document.getElementById('touchControls');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); game.keys.left = true; });
btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); game.keys.left = false; });
btnLeft.addEventListener('mousedown', () => game.keys.left = true);
btnLeft.addEventListener('mouseup', () => game.keys.left = false);

btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); game.keys.right = true; });
btnRight.addEventListener('touchend', (e) => { e.preventDefault(); game.keys.right = false; });
btnRight.addEventListener('mousedown', () => game.keys.right = true);
btnRight.addEventListener('mouseup', () => game.keys.right = false);

canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = t.clientX - rect.left;
  game.keys.left = x < canvas.width/2;
  game.keys.right = x >= canvas.width/2;
});
canvas.addEventListener('touchend', () => { game.keys.left = false; game.keys.right = false; });

if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) {
  touchControls.classList.remove('hidden');
} else {
  touchControls.classList.add('hidden');
}

game.start();