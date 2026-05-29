import { Container } from 'pixi.js';
import { CharacterStateMachine } from '../states/CharacterStateMachine';
import type { CharacterState } from '../states/CharacterStateMachine';
import { AnimationManager } from '../systems/AnimationManager';
import type { HitboxDef } from '../systems/CollisionSystem';
import { SoundEngine } from '../systems/SoundEngine';

export const GROUND_Y = 300;
const GRAVITY     = 0.6;
const JUMP_VEL    = -14;
const WALK_SPEED  = 3.2;
const ARENA_LEFT  = 40;
const ARENA_RIGHT = 760;

export interface AttackData {
  damage: number;
  hitstun: number;
  knockbackX: number;
  knockbackY: number;
  isHigh: boolean;
  isLow: boolean;
  sfx: 'punch' | 'kick' | 'heavyPunch' | 'heavyKick';
}

const ATTACK_DATA: Partial<Record<CharacterState, AttackData>> = {
  lightPunch: { damage: 5,  hitstun: 14, knockbackX: 3, knockbackY:  0, isHigh: true,  isLow: false, sfx: 'punch'      },
  heavyPunch: { damage: 12, hitstun: 22, knockbackX: 6, knockbackY: -2, isHigh: true,  isLow: false, sfx: 'heavyPunch' },
  lightKick:  { damage: 6,  hitstun: 16, knockbackX: 4, knockbackY:  0, isHigh: false, isLow: false, sfx: 'kick'       },
  heavyKick:  { damage: 15, hitstun: 26, knockbackX: 8, knockbackY: -3, isHigh: false, isLow: false, sfx: 'heavyKick'  },
};

// Hitbox is active on anim frame index 1 (middle frame) for all attacks
const HITBOX_FRAME = 1;

// Hitbox rects relative to character origin, drawn "facing right" (positive x = forward)
const HITBOX_RECTS: Partial<Record<CharacterState, HitboxDef['rect']>> = {
  lightPunch: { x: 18, y: -68, w: 36, h: 20 },
  heavyPunch: { x: 16, y: -72, w: 44, h: 24 },
  lightKick:  { x: 20, y: -32, w: 40, h: 20 },
  heavyKick:  { x: 18, y: -64, w: 50, h: 24 },
};

const HURTBOX        = { x: -16, y: -80, w: 32, h: 80 };
const HURTBOX_CROUCH = { x: -16, y: -52, w: 32, h: 52 };

export class Player {
  container: Container;
  x: number;
  y: number;
  velX = 0;
  velY = 0;
  facingRight: boolean;
  health = 100;
  maxHealth = 100;
  comboCount = 0;

  private hitCooldown = 0;
  private hitConfirmed = false;

  state: CharacterStateMachine;
  protected anim: AnimationManager;
  protected sound: SoundEngine;

  constructor(x: number, facingRight: boolean, color: number, sound: SoundEngine) {
    this.x = x;
    this.y = GROUND_Y;
    this.facingRight = facingRight;
    this.sound = sound;

    this.container = new Container();
    this.container.x = x;
    this.container.y = GROUND_Y;

    this.state = new CharacterStateMachine();
    this.anim = new AnimationManager(this.container, color);

    this.registerAnimations(color);
    this.anim.setFacing(facingRight);
    this.anim.start(); // draw initial frame immediately
  }

  // ─── Pixel Art Drawing ────────────────────────────────────────────────────────
  // All draw functions draw facing RIGHT.
  // AnimationManager flips the inner container via scale.x for left-facing.

  private registerAnimations(c: number) {
    // Darker shade for legs/detail (simple channel dimming)
    const dk = Math.max(0, c - 0x1a1a1a);

    // ── Shared base poses ──

    const idle = (bobY: number) => (g: any, col: number) => {
      g.ellipse(0, 2, 20, 4).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(-10, -36 + bobY, 8, 36 - bobY).fill(dk);
      g.rect(2,   -36, 8, 36).fill(dk);
      g.rect(-10, -40, 20, 4).fill(0x222222);
      g.rect(-10, -72, 20, 32).fill(col);
      g.rect(-4,  -76, 8, 6).fill(col);
      g.rect(-8,  -88, 16, 14).fill(col);
      g.rect(2,   -84, 4, 4).fill(0xffffff);
      g.rect(4,   -82, 2, 2).fill(0x111111);
      g.rect(-8,  -90, 16, 4).fill(0xcc2222);
    };

    this.anim.register('idle', {
      loop: true,
      frames: [
        { draw: idle(0), duration: 22 },
        { draw: idle(2), duration: 22 },
      ],
    });

    // ── Walk ──

    const walk = (phase: number) => (g: any, col: number) => {
      const l0 = Math.round(Math.sin(phase) * 8);
      const l1 = Math.round(Math.sin(phase + Math.PI) * 8);
      g.ellipse(0, 2, 20, 4).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(-10, -36 + l0, 8, 36 - l0).fill(dk);
      g.rect(2,   -36 + l1, 8, 36 - l1).fill(dk);
      g.rect(-10, -40, 20, 4).fill(0x222222);
      g.rect(-10, -72, 20, 32).fill(col);
      g.rect(-4,  -76, 8, 6).fill(col);
      g.rect(-8,  -88, 16, 14).fill(col);
      g.rect(2,   -84, 4, 4).fill(0xffffff);
      g.rect(4,   -82, 2, 2).fill(0x111111);
      g.rect(-8,  -90, 16, 4).fill(0xcc2222);
    };

    const walkFrames = [0, 1, 2, 3].map(i => ({
      draw: walk((i * Math.PI) / 2),
      duration: 6,
    }));
    this.anim.register('walkForward',  { loop: true, frames: walkFrames });
    this.anim.register('walkBackward', { loop: true, frames: walkFrames });

    // ── Jump ──

    const jump = (tuck: number) => (g: any, col: number) => {
      g.rect(-10, -36 + tuck, 8, 36 - tuck).fill(dk);
      g.rect(2,   -36 + tuck, 8, 36 - tuck).fill(dk);
      g.rect(-10, -40 + tuck, 20, 4).fill(0x222222);
      g.rect(-10, -72, 20, 32).fill(col);
      g.rect(-4,  -76, 8, 6).fill(col);
      g.rect(-8,  -90, 16, 14).fill(col);
      g.rect(2,   -86, 4, 4).fill(0xffffff);
      g.rect(4,   -84, 2, 2).fill(0x111111);
      g.rect(-8,  -92, 16, 4).fill(0xcc2222);
    };

    this.anim.register('jump', {
      loop: false,
      frames: [
        { draw: jump(0),   duration: 4  },
        { draw: jump(-14), duration: 32 },
        { draw: jump(0),   duration: 4  },
      ],
    });

    // ── Crouch ──

    const crouch = (g: any, col: number) => {
      g.ellipse(0, 2, 20, 4).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(-10, -18, 8, 18).fill(dk);
      g.rect(2,   -18, 8, 18).fill(dk);
      g.rect(-10, -22, 20, 4).fill(0x222222);
      g.rect(-10, -48, 20, 26).fill(col);
      g.rect(-4,  -52, 8, 6).fill(col);
      g.rect(-8,  -64, 16, 14).fill(col);
      g.rect(2,   -60, 4, 4).fill(0xffffff);
      g.rect(4,   -58, 2, 2).fill(0x111111);
      g.rect(-8,  -66, 16, 4).fill(0xcc2222);
    };

    this.anim.register('crouch',      { loop: false, frames: [{ draw: crouch, duration: 99 }] });
    this.anim.register('crouchBlock', { loop: false, frames: [{ draw: crouch, duration: 99 }] });

    // ── Light Punch ──

    const lPunchThrow = (g: any, col: number) => {
      g.ellipse(0, 2, 20, 4).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(-10, -36, 8, 36).fill(dk);
      g.rect(2,   -36, 8, 36).fill(dk);
      g.rect(-10, -40, 20, 4).fill(0x222222);
      g.rect(-10, -72, 20, 32).fill(col);
      // Punching arm extended right (+x = forward)
      g.rect(10,  -68, 32, 10).fill(Math.min(c + 0x181818, 0xffffff));
      g.rect(42,  -72, 12, 14).fill(col);
      g.rect(-4,  -76, 8,  6).fill(col);
      g.rect(-8,  -88, 16, 14).fill(col);
      g.rect(2,   -84, 4,  4).fill(0xffffff);
      g.rect(4,   -82, 2,  2).fill(0x111111);
      g.rect(-8,  -90, 16, 4).fill(0xcc2222);
    };

    this.anim.register('lightPunch', {
      loop: false,
      frames: [
        { draw: idle(0),     duration: 3  },
        { draw: lPunchThrow, duration: 10 },
        { draw: idle(0),     duration: 5  },
      ],
    });

    // ── Heavy Punch ──

    const hPunchCharge = (g: any, col: number) => {
      g.ellipse(0, 2, 20, 4).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(-10, -36, 8, 36).fill(dk);
      g.rect(2,   -36, 8, 36).fill(dk);
      g.rect(-10, -40, 20, 4).fill(0x222222);
      g.rect(-10, -72, 20, 32).fill(col);
      g.rect(-22, -70, 14, 10).fill(Math.min(c + 0x181818, 0xffffff)); // arm cocked back
      g.rect(-4,  -76, 8,  6).fill(col);
      g.rect(-8,  -88, 16, 14).fill(col);
      g.rect(2,   -84, 4,  4).fill(0xffffff);
      g.rect(-8,  -90, 16, 4).fill(0xcc2222);
    };

    const hPunchThrow = (g: any, col: number) => {
      g.ellipse(0, 2, 20, 4).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(-10, -36, 8, 36).fill(dk);
      g.rect(2,   -36, 8, 36).fill(dk);
      g.rect(-10, -40, 20, 4).fill(0x222222);
      g.rect(-10, -72, 20, 32).fill(col);
      g.rect(10,  -70, 44, 12).fill(Math.min(c + 0x181818, 0xffffff));
      g.rect(54,  -76, 14, 18).fill(0xffcc00); // glowing fist
      g.rect(68,  -70, 6,  6).fill(0xffffff);  // impact flash
      g.rect(-4,  -76, 8,  6).fill(col);
      g.rect(-8,  -88, 16, 14).fill(col);
      g.rect(2,   -84, 4,  4).fill(0xffffff);
      g.rect(-8,  -90, 16, 4).fill(0xcc2222);
    };

    this.anim.register('heavyPunch', {
      loop: false,
      frames: [
        { draw: hPunchCharge, duration: 7  },
        { draw: hPunchThrow,  duration: 14 },
        { draw: idle(0),      duration: 7  },
      ],
    });

    // ── Light Kick ──

    const lKickThrow = (g: any, col: number) => {
      g.ellipse(0, 2, 20, 4).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(-6, -36, 8, 36).fill(dk);           // planted leg
      g.rect(4,  -28, 36, 10).fill(dk);          // kicking shin
      g.rect(40, -34, 10, 14).fill(0xffcc00);    // boot
      g.rect(-10, -40, 20, 4).fill(0x222222);
      g.rect(-10, -72, 20, 32).fill(col);
      g.rect(-4,  -76, 8, 6).fill(col);
      g.rect(-8,  -88, 16, 14).fill(col);
      g.rect(2,   -84, 4, 4).fill(0xffffff);
      g.rect(4,   -82, 2, 2).fill(0x111111);
      g.rect(-8,  -90, 16, 4).fill(0xcc2222);
    };

    this.anim.register('lightKick', {
      loop: false,
      frames: [
        { draw: idle(0),    duration: 3  },
        { draw: lKickThrow, duration: 10 },
        { draw: idle(0),    duration: 5  },
      ],
    });

    // ── Heavy Kick ──

    const hKickThrow = (g: any, col: number) => {
      g.ellipse(0, 2, 20, 4).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(-8, -36, 8, 36).fill(dk);           // planted leg
      g.rect(2,  -52, 12, 40).fill(dk);          // thigh up
      g.rect(10, -64, 42, 12).fill(dk);          // shin extended
      g.rect(52, -70, 12, 16).fill(0xffcc00);    // boot
      g.rect(64, -62, 6,  6).fill(0xffffff);     // impact flash
      g.rect(-10, -40, 20, 4).fill(0x222222);
      g.rect(-10, -72, 20, 32).fill(col);
      g.rect(-4,  -76, 8, 6).fill(col);
      g.rect(-8,  -90, 16, 14).fill(col);
      g.rect(2,   -86, 4, 4).fill(0xffffff);
      g.rect(-8,  -92, 16, 4).fill(0xcc2222);
    };

    this.anim.register('heavyKick', {
      loop: false,
      frames: [
        { draw: idle(0),    duration: 6  },
        { draw: hKickThrow, duration: 16 },
        { draw: idle(0),    duration: 8  },
      ],
    });

    // ── Block ──

    const block = (g: any, col: number) => {
      g.ellipse(0, 2, 20, 4).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(-10, -36, 8, 36).fill(dk);
      g.rect(2,   -36, 8, 36).fill(dk);
      g.rect(-10, -40, 20, 4).fill(0x222222);
      g.rect(-10, -72, 20, 32).fill(col);
      // Guard arms raised
      g.rect(-2,  -78, 20, 10).fill(Math.min(c + 0x181818, 0xffffff));
      g.rect(-4,  -68, 20, 10).fill(Math.min(c + 0x181818, 0xffffff));
      g.rect(-4,  -76, 8,  6).fill(col);
      g.rect(-6,  -90, 14, 14).fill(col);
      g.rect(-6,  -92, 14, 4).fill(0xcc2222);
    };

    this.anim.register('block', { loop: false, frames: [{ draw: block, duration: 99 }] });

    // ── Hit ──

    const hit = (g: any, col: number) => {
      g.ellipse(0, 2, 20, 4).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(-8, -36, 8, 36).fill(dk);
      g.rect(2,  -36, 8, 36).fill(dk);
      g.rect(-10, -40, 20, 4).fill(0x222222);
      // Torso leaning back
      g.rect(-14, -70, 20, 30).fill(col);
      g.rect(-4,  -74, 8,  6).fill(col);
      g.rect(-10, -86, 16, 14).fill(col);
      // Hit sparks
      g.circle(20, -74, 6).fill(0xffff00);
      g.circle(28, -62, 4).fill(0xff8800);
      g.circle(14, -62, 3).fill(0xffffff);
      g.rect(-10, -88, 16, 4).fill(0xcc2222);
    };

    this.anim.register('hit', { loop: false, frames: [{ draw: hit, duration: 16 }] });

    // ── Knockdown ──

    const knockdown = (g: any, col: number) => {
      g.rect(-36, -14, 16, 12).fill(col);
      g.rect(-20, -10, 50, 10).fill(col);
      g.rect(30,  -12, 14, 12).fill(dk);
      g.circle(-28, -26, 6).fill(0xffff00);
      g.circle(-14, -30, 4).fill(0xff8800);
    };

    this.anim.register('knockdown', { loop: false, frames: [{ draw: knockdown, duration: 50 }] });

    // ── Dead ──

    const dead = (g: any, col: number) => {
      g.rect(-36, -12, 16, 10).fill(col);
      g.rect(-20, -8,  50, 8).fill(col);
      g.rect(30,  -10, 14, 10).fill(dk);
    };

    this.anim.register('dead', { loop: false, frames: [{ draw: dead, duration: 99 }] });
  }

  // ─── Physics & Input ─────────────────────────────────────────────────────────

  applyInputs(
    left: boolean, right: boolean, up: boolean, down: boolean,
    lightAtk: boolean, heavyAtk: boolean, block: boolean,
    opponentX: number
  ) {
    const s = this.state;
    const onGround = this.y >= GROUND_Y;

    if (!s.isAttacking && !s.isInState('hit', 'knockdown', 'dead')) {
      this.facingRight = opponentX > this.x;
    }

    if (lightAtk) {
      if (s.transition('lightPunch') || s.transition('lightKick')) {
        this.hitConfirmed = false;
      }
    }
    if (heavyAtk) {
      if (s.isInState('lightPunch', 'lightKick')) {
        if (s.transition('heavyPunch')) this.hitConfirmed = false;
      } else {
        if (s.transition('heavyPunch') || s.transition('heavyKick')) {
          this.hitConfirmed = false;
        }
      }
    }

    if (block && onGround && !s.isAttacking) {
      s.transition(down ? 'crouchBlock' : 'block');
      this.velX = 0;
      return;
    }

    if (onGround && !s.isAttacking) {
      if (up) {
        if (s.transition('jump')) {
          this.velY = JUMP_VEL;
          this.sound.play('jump');
        }
      } else if (down) {
        s.transition('crouch');
        this.velX = 0;
      } else if (right) {
        s.transition(this.facingRight ? 'walkForward' : 'walkBackward');
        this.velX = WALK_SPEED;
      } else if (left) {
        s.transition(this.facingRight ? 'walkBackward' : 'walkForward');
        this.velX = -WALK_SPEED;
      } else {
        if (!s.isInState('hit', 'knockdown', 'dead', 'crouch')) {
          s.transition('idle');
        }
        this.velX = 0;
      }
    }
  }

  update() {
    if (this.y < GROUND_Y || this.velY < 0) {
      this.velY += GRAVITY;
    }

    this.x += this.velX;
    this.y += this.velY;

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.velY = 0;
      if (this.state.isAirborne) this.state.forceTransition('idle');
    }

    this.x = Math.max(ARENA_LEFT + 20, Math.min(ARENA_RIGHT - 20, this.x));

    if (this.state.isInState('hit', 'knockdown') && Math.abs(this.velX) > 0.2) {
      this.velX *= 0.82;
    } else if (this.state.isInState('hit', 'knockdown')) {
      this.velX = 0;
    }

    if (this.hitCooldown > 0) this.hitCooldown--;

    this.state.update();
    this.anim.setState(this.state.current);
    this.anim.setFacing(this.facingRight);
    this.anim.update();

    this.container.x = this.x;
    this.container.y = this.y;
  }

  // ─── Hitbox API ──────────────────────────────────────────────────────────────

  getActiveHitbox(): { rect: { x: number; y: number; w: number; h: number }; data: AttackData } | null {
    const atk = this.state.current;
    if (!this.state.isAttacking) return null;
    if (this.hitConfirmed) return null;
    if (this.anim.currentFrameIndex !== HITBOX_FRAME) return null;

    const relRect = HITBOX_RECTS[atk];
    const data = ATTACK_DATA[atk];
    if (!relRect || !data) return null;

    const rx = this.facingRight ? relRect.x : -(relRect.x + relRect.w);
    return {
      rect: { x: this.x + rx, y: this.y + relRect.y, w: relRect.w, h: relRect.h },
      data,
    };
  }

  getHurtbox() {
    const hb = this.state.isCrouching ? HURTBOX_CROUCH : HURTBOX;
    return { x: this.x + hb.x, y: this.y + hb.y, w: hb.w, h: hb.h };
  }

  confirmHit() { this.hitConfirmed = true; }

  receiveHit(data: AttackData, attackerFacingRight: boolean): boolean {
    if (this.hitCooldown > 0) return false;
    if (this.state.isInState('dead')) return false;

    const isBlocking = this.state.isBlocking;
    const actualDamage = isBlocking ? Math.round(data.damage * 0.15) : data.damage;

    this.health = Math.max(0, this.health - actualDamage);
    this.hitCooldown = 8;

    if (!isBlocking) {
      const dir = attackerFacingRight ? 1 : -1;
      this.velX = data.knockbackX * dir;
      this.velY = data.knockbackY;
      this.comboCount++;
      this.state.forceTransition(data.hitstun > 20 || this.health <= 0 ? 'knockdown' : 'hit');
    } else {
      this.sound.play('block');
      this.velX = (attackerFacingRight ? 1 : -1) * 1.5;
    }

    return true;
  }

  resetCombo() { this.comboCount = 0; }

  reset(x: number, facingRight: boolean) {
    this.x = x;
    this.y = GROUND_Y;
    this.velX = 0;
    this.velY = 0;
    this.health = this.maxHealth;
    this.facingRight = facingRight;
    this.hitCooldown = 0;
    this.hitConfirmed = false;
    this.comboCount = 0;
    this.state.forceTransition('idle');
    this.anim.setFacing(facingRight);
  }

  get isDead() { return this.health <= 0; }
}
