import { Application } from 'pixi.js';
import { Game } from './game';

const CANVAS_W = 800;
const CANVAS_H = 450;

async function main() {
  const app = new Application();

  await app.init({
    width: CANVAS_W,
    height: CANVAS_H,
    backgroundColor: 0x000000,
    antialias: false,      // Keep pixel art crisp
    resolution: 1,
  });

  // Mount canvas
  const container = document.getElementById('game-container')!;
  container.appendChild(app.canvas);

  // Scale to fit viewport while maintaining aspect ratio
  function resize() {
    const scaleX = window.innerWidth / CANVAS_W;
    const scaleY = window.innerHeight / CANVAS_H;
    const scale = Math.min(scaleX, scaleY);
    const w = Math.floor(CANVAS_W * scale);
    const h = Math.floor(CANVAS_H * scale);
    app.canvas.style.width  = `${w}px`;
    app.canvas.style.height = `${h}px`;
    container.style.width   = `${w}px`;
    container.style.height  = `${h}px`;
  }

  resize();
  window.addEventListener('resize', resize);

  // Bootstrap game
  const game = new Game(app);
  await game.init();
}

main().catch(console.error);
