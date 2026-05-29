import { Player } from './Player';
import type { AttackData } from './Player';
import { GROUND_Y } from './Player';
import type { SoundEngine } from '../systems/SoundEngine';

type AIPhase = 'idle' | 'approach' | 'attack' | 'retreat' | 'block';

export class Enemy extends Player {
  private aiTimer = 0;
  private aiPhase: AIPhase = 'idle';
  private reactionDelay = 0;
  private readonly difficulty: number; // 0-1

  constructor(x: number, facingRight: boolean, color: number, sound: SoundEngine, difficulty = 0.5) {
    super(x, facingRight, color, sound);
    this.difficulty = difficulty;
  }

  updateAI(opponent: Player) {
    if (this.state.isInState('dead', 'hit', 'knockdown')) return;

    const dist = Math.abs(this.x - opponent.x);
    const onGround = this.y >= GROUND_Y;

    this.aiTimer++;
    if (this.reactionDelay > 0) { this.reactionDelay--; return; }

    // Phase transitions
    const rand = Math.random();

    if (opponent.isDead) {
      this.aiPhase = 'idle';
    } else if (dist > 220) {
      this.aiPhase = 'approach';
    } else if (dist < 60) {
      // Too close — either attack or retreat
      this.aiPhase = rand < 0.6 * this.difficulty ? 'attack' : 'retreat';
    } else if (dist < 140) {
      // Attack range
      if (rand < 0.55 * this.difficulty) this.aiPhase = 'attack';
      else if (rand < 0.7) this.aiPhase = 'block';
      else this.aiPhase = 'approach';
    }

    // Synthesize input
    const toLeft  = this.x > opponent.x;
    const toRight = this.x < opponent.x;

    let left = false, right = false, up = false, down = false;
    let lightAtk = false, heavyAtk = false, block = false;

    switch (this.aiPhase) {
      case 'approach':
        left  = toLeft;
        right = toRight;
        break;

      case 'retreat':
        left  = toRight; // move away
        right = toLeft;
        if (rand < 0.3) block = true;
        break;

      case 'attack':
        if (dist < 120 && onGround) {
          if (rand < 0.4) lightAtk = true;
          else if (rand < 0.7) heavyAtk = true;
          else { left = toLeft; right = toRight; } // advance then attack next tick
          // Occasionally jump-in
          if (rand < 0.08 * this.difficulty && dist > 80) up = true;
        }
        break;

      case 'block':
        block = true;
        if (opponent.state.isAttacking) block = true;
        break;

      case 'idle':
        break;
    }

    // Add deliberate reaction delay to feel less robotic
    this.reactionDelay = Math.floor(6 + (1 - this.difficulty) * 10 + Math.random() * 4);

    this.applyInputs(left, right, up, down, lightAtk, heavyAtk, block, opponent.x);
  }
}
