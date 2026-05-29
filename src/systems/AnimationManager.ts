import { Graphics, Container } from 'pixi.js';
import type { CharacterState } from '../states/CharacterStateMachine';

// Draw functions always draw facing RIGHT — mirroring is handled by scale.x
export type DrawFn = (g: Graphics, color: number) => void;

export interface AnimFrame {
  draw: DrawFn;
  duration: number;
}

export interface AnimDef {
  frames: AnimFrame[];
  loop: boolean;
}

export class AnimationManager {
  private anims: Map<CharacterState, AnimDef> = new Map();
  private current: CharacterState = 'idle';
  private frameIndex = 0;
  private frameTimer = 0;
  private g: Graphics;
  private gfxContainer: Container; // scale.x = -1 when facing left
  private color: number;

  constructor(container: Container, color: number) {
    this.color = color;
    this.gfxContainer = new Container();
    container.addChild(this.gfxContainer);
    this.g = new Graphics();
    this.gfxContainer.addChild(this.g);
  }

  register(state: CharacterState, anim: AnimDef) {
    this.anims.set(state, anim);
  }

  // Call after all animations are registered to draw the initial frame
  start() {
    this.render();
  }

  setState(state: CharacterState) {
    if (this.current === state) return;
    this.current = state;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.render();
  }

  setFacing(right: boolean) {
    this.gfxContainer.scale.x = right ? 1 : -1;
  }

  update() {
    const anim = this.anims.get(this.current);
    if (!anim || anim.frames.length === 0) return;

    this.frameTimer++;
    const frame = anim.frames[this.frameIndex];
    if (this.frameTimer >= frame.duration) {
      this.frameTimer = 0;
      if (this.frameIndex < anim.frames.length - 1) {
        this.frameIndex++;
      } else if (anim.loop) {
        this.frameIndex = 0;
      }
      this.render();
    }
  }

  private render() {
    const anim = this.anims.get(this.current);
    if (!anim || anim.frames.length === 0) return;
    const frame = anim.frames[Math.min(this.frameIndex, anim.frames.length - 1)];
    this.g.clear();
    frame.draw(this.g, this.color);
  }

  get currentFrameIndex(): number { return this.frameIndex; }
}
