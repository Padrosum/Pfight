export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  lightAttack: boolean;
  heavyAttack: boolean;
  block: boolean;
}

export class InputManager {
  private keys = new Set<string>();
  private justPressed = new Set<string>();
  private justReleased = new Set<string>();
  private prevKeys = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.justPressed.add(e.code);
      }
      this.keys.add(e.code);
      // Prevent default for game keys
      if (['KeyW','KeyA','KeyS','KeyD','KeyJ','KeyK','KeyL','Space','KeyP','Enter'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.justReleased.add(e.code);
    });
  }

  isDown(code: string): boolean { return this.keys.has(code); }
  wasJustPressed(code: string): boolean { return this.justPressed.has(code); }
  wasJustReleased(code: string): boolean { return this.justReleased.has(code); }

  // Call once per game frame after all systems have read input
  flush() {
    this.justPressed.clear();
    this.justReleased.clear();
  }

  getP1State(): InputState {
    return {
      left:        this.isDown('KeyA'),
      right:       this.isDown('KeyD'),
      up:          this.wasJustPressed('KeyW'),
      down:        this.isDown('KeyS'),
      lightAttack: this.wasJustPressed('KeyJ'),
      heavyAttack: this.wasJustPressed('KeyK'),
      block:       this.isDown('KeyL'),
    };
  }

  isPausePressed(): boolean   { return this.wasJustPressed('KeyP'); }
  isRestartPressed(): boolean { return this.wasJustPressed('Enter'); }
  isStartPressed(): boolean   { return this.wasJustPressed('Enter') || this.wasJustPressed('Space'); }
}
