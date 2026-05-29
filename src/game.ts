import { Application, Container } from 'pixi.js';
import { Player, GROUND_Y } from './entities/Player';
import { Enemy } from './entities/Enemy';
import { InputManager } from './systems/InputManager';
import { UIManager } from './ui/UIManager';
import { SoundEngine } from './systems/SoundEngine';
import { buildArena } from './Arena';
import { rectsOverlap } from './systems/CollisionSystem';

type GamePhase = 'mainMenu' | 'announce' | 'fighting' | 'roundEnd' | 'gameEnd' | 'paused';

const CANVAS_W = 800;
const CANVAS_H = 450;
const ROUND_TIME = 99;
const MAX_ROUNDS = 3;
const WIN_ROUNDS = 2;

// Fixed timestep at 60 fps
const FIXED_STEP = 1000 / 60;

export class Game {
  private app: Application;
  private input: InputManager;
  private ui: UIManager;
  private sound: SoundEngine;
  private world: Container;

  private player1!: Player;
  private player2!: Enemy;

  private phase: GamePhase = 'mainMenu';
  private prevPhase: GamePhase = 'fighting';
  private round = 1;
  private p1RoundWins = 0;
  private p2RoundWins = 0;
  private timeRemaining = ROUND_TIME;
  private timeAccum = 0; // for timer (in ms)

  private fixedAccum = 0;
  private lastTimestamp = 0;

  // FPS tracking
  private fpsSamples: number[] = [];
  private fpsTimer = 0;

  constructor(app: Application) {
    this.app = app;
    this.input = new InputManager();
    this.ui = new UIManager();
    this.sound = new SoundEngine();
    this.world = new Container();
    this.app.stage.addChild(this.world);
  }

  async init() {
    buildArena(this.world, CANVAS_W, CANVAS_H);
    this.spawnCharacters();
    this.ui.showMainMenu();
    this.app.ticker.add(this.loop.bind(this));
  }

  private spawnCharacters() {
    if (this.player1) this.world.removeChild(this.player1.container);
    if (this.player2) this.world.removeChild(this.player2.container);

    this.player1 = new Player(200, true,  0x3366ff, this.sound);
    this.player2 = new Enemy(600, false, 0xff3333, this.sound, 0.55);

    this.world.addChild(this.player1.container);
    this.world.addChild(this.player2.container);
  }

  private resetRound() {
    this.player1.reset(200, true);
    this.player2.reset(600, false);
    this.timeRemaining = ROUND_TIME;
    this.timeAccum = 0;
    this.ui.setHealth(1, 1);
    this.ui.setHealth(2, 1);
    this.ui.setTimer(ROUND_TIME);
  }

  // ─── Main Loop ────────────────────────────────────────────────────────────────

  private loop(ticker: { deltaMS: number }) {
    const dt = Math.min(ticker.deltaMS, 50); // cap to avoid spiral of death

    // FPS tracking
    this.fpsSamples.push(1000 / ticker.deltaMS);
    this.fpsTimer += ticker.deltaMS;
    if (this.fpsTimer > 500) {
      const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
      this.ui.setFps(Math.round(avg));
      this.fpsSamples = [];
      this.fpsTimer = 0;
    }

    // Main menu
    if (this.phase === 'mainMenu') {
      if (this.input.isStartPressed()) this.startGame();
      this.input.flush();
      return;
    }

    // Pause toggle
    if (this.input.isPausePressed() && (this.phase === 'fighting' || this.phase === 'paused')) {
      this.togglePause();
    }

    if (this.phase === 'gameEnd') {
      if (this.input.isRestartPressed()) this.restart();
      this.input.flush();
      return;
    }

    if (this.phase === 'paused') {
      this.input.flush();
      return;
    }

    if (this.phase !== 'fighting') {
      this.input.flush();
      return;
    }

    // Fixed timestep accumulator
    this.fixedAccum += dt;
    while (this.fixedAccum >= FIXED_STEP) {
      this.fixedUpdate();
      this.fixedAccum -= FIXED_STEP;
    }

    this.input.flush();
    this.ui.update();
  }

  private fixedUpdate() {
    // Timer
    this.timeAccum += FIXED_STEP;
    if (this.timeAccum >= 1000) {
      this.timeAccum -= 1000;
      this.timeRemaining = Math.max(0, this.timeRemaining - 1);
      this.ui.setTimer(this.timeRemaining);
    }

    // Player 1 input
    const p1Input = this.input.getP1State();
    this.player1.applyInputs(
      p1Input.left, p1Input.right, p1Input.up, p1Input.down,
      p1Input.lightAttack, p1Input.heavyAttack, p1Input.block,
      this.player2.x
    );

    // CPU AI
    this.player2.updateAI(this.player1);

    // Update entities
    this.player1.update();
    this.player2.update();

    // Push apart if overlapping (body collision)
    this.resolveBodyCollision();

    // Hit detection
    this.resolveHits();

    // UI health bars
    this.ui.setHealth(1, this.player1.health / this.player1.maxHealth);
    this.ui.setHealth(2, this.player2.health / this.player2.maxHealth);

    // Combo display
    if (this.player1.comboCount >= 2) this.ui.showCombo(1, this.player1.comboCount);
    if (this.player2.comboCount >= 2) this.ui.showCombo(2, this.player2.comboCount);

    // Check round-end conditions
    if (this.player1.isDead || this.player2.isDead || this.timeRemaining <= 0) {
      this.endRound();
    }
  }

  private resolveBodyCollision() {
    const minDist = 44;
    const dx = this.player2.x - this.player1.x;
    if (Math.abs(dx) < minDist) {
      const push = (minDist - Math.abs(dx)) / 2;
      const dir = dx >= 0 ? 1 : -1;
      this.player1.x -= push * dir;
      this.player2.x += push * dir;
    }
  }

  private resolveHits() {
    // P1 hits P2
    const p1Hit = this.player1.getActiveHitbox();
    if (p1Hit) {
      const hurtbox2 = this.player2.getHurtbox();
      if (rectsOverlap(p1Hit.rect, hurtbox2)) {
        const hit = this.player2.receiveHit(p1Hit.data, this.player1.facingRight);
        if (hit) {
          this.player1.confirmHit();
          this.sound.play('hit');
          if (this.player2.isDead) this.sound.play('ko');
        }
      }
    }

    // P2 hits P1
    const p2Hit = this.player2.getActiveHitbox();
    if (p2Hit) {
      const hurtbox1 = this.player1.getHurtbox();
      if (rectsOverlap(p2Hit.rect, hurtbox1)) {
        const hit = this.player1.receiveHit(p2Hit.data, this.player2.facingRight);
        if (hit) {
          this.player2.confirmHit();
          this.sound.play('hit');
          if (this.player1.isDead) this.sound.play('ko');
        }
      }
    }
  }

  private async endRound() {
    if (this.phase !== 'fighting') return;
    this.phase = 'roundEnd';

    // Determine winner
    let p1Wins: boolean;
    if (this.timeRemaining <= 0) {
      // Time out — higher health wins
      p1Wins = this.player1.health >= this.player2.health;
    } else {
      p1Wins = !this.player1.isDead;
    }

    if (p1Wins) this.p1RoundWins++;
    else         this.p2RoundWins++;

    this.ui.setRoundWins(this.p1RoundWins, this.p2RoundWins);

    const roundWinner = p1Wins ? 'P1 WINS ROUND!' : 'CPU WINS ROUND!';
    await this.ui.showAnnounce(roundWinner, '', 1800);

    if (this.p1RoundWins >= WIN_ROUNDS || this.p2RoundWins >= WIN_ROUNDS || this.round >= MAX_ROUNDS) {
      this.endGame();
    } else {
      this.round++;
      this.ui.setRound(this.round);
      this.resetRound();
      this.player1.resetCombo();
      this.player2.resetCombo();
      await this.ui.showAnnounce(`ROUND ${this.round}`, 'FIGHT!', 1800);
      this.phase = 'fighting';
    }
  }

  private endGame() {
    this.phase = 'gameEnd';
    const winner = this.p1RoundWins > this.p2RoundWins ? 'PLAYER 1 WINS!' : 'CPU WINS!';
    this.ui.showWin(winner);
  }

  private togglePause() {
    if (this.phase === 'fighting') {
      this.prevPhase = this.phase;
      this.phase = 'paused';
      this.ui.setPause(true);
    } else if (this.phase === 'paused') {
      this.phase = this.prevPhase;
      this.ui.setPause(false);
    }
  }

  private async startGame() {
    this.phase = 'announce';
    this.ui.hideMainMenu();
    this.ui.setRound(this.round);
    this.ui.setTimer(ROUND_TIME);
    this.ui.setRoundWins(0, 0);
    await this.ui.showAnnounce('ROUND 1', 'FIGHT!', 1800);
    this.phase = 'fighting';
  }

  private restart() {
    this.round = 1;
    this.p1RoundWins = 0;
    this.p2RoundWins = 0;
    this.ui.hideWin();
    this.ui.setPause(false);
    this.resetRound();
    this.player1.resetCombo();
    this.player2.resetCombo();
    this.phase = 'mainMenu';
    this.ui.showMainMenu();
  }
}
