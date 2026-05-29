export type CharacterState =
  | 'idle'
  | 'walkForward'
  | 'walkBackward'
  | 'jump'
  | 'crouch'
  | 'lightPunch'
  | 'heavyPunch'
  | 'lightKick'
  | 'heavyKick'
  | 'block'
  | 'crouchBlock'
  | 'hit'
  | 'knockdown'
  | 'dead';

export interface StateConfig {
  duration: number;       // frames (-1 = looping)
  cancelable: boolean;    // can transition mid-anim
  interruptBy: CharacterState[];
}

const STATE_CONFIGS: Record<CharacterState, StateConfig> = {
  idle:         { duration: -1, cancelable: true,  interruptBy: [] },
  walkForward:  { duration: -1, cancelable: true,  interruptBy: [] },
  walkBackward: { duration: -1, cancelable: true,  interruptBy: [] },
  jump:         { duration: 40, cancelable: false, interruptBy: [] },
  crouch:       { duration: -1, cancelable: true,  interruptBy: [] },
  lightPunch:   { duration: 18, cancelable: false, interruptBy: ['heavyPunch', 'heavyKick'] },
  heavyPunch:   { duration: 28, cancelable: false, interruptBy: [] },
  lightKick:    { duration: 18, cancelable: false, interruptBy: ['heavyPunch', 'heavyKick'] },
  heavyKick:    { duration: 30, cancelable: false, interruptBy: [] },
  block:        { duration: -1, cancelable: true,  interruptBy: [] },
  crouchBlock:  { duration: -1, cancelable: true,  interruptBy: [] },
  hit:          { duration: 16, cancelable: false, interruptBy: [] },
  knockdown:    { duration: 50, cancelable: false, interruptBy: [] },
  dead:         { duration: -1, cancelable: false, interruptBy: [] },
};

export class CharacterStateMachine {
  current: CharacterState = 'idle';
  private frameTimer = 0;
  private onEnterCallbacks: Partial<Record<CharacterState, () => void>> = {};
  private onExitCallbacks:  Partial<Record<CharacterState, () => void>> = {};

  get config(): StateConfig {
    return STATE_CONFIGS[this.current];
  }

  get isAttacking(): boolean {
    return ['lightPunch', 'heavyPunch', 'lightKick', 'heavyKick'].includes(this.current);
  }

  get isBlocking(): boolean {
    return this.current === 'block' || this.current === 'crouchBlock';
  }

  get isAirborne(): boolean {
    return this.current === 'jump';
  }

  get isCrouching(): boolean {
    return this.current === 'crouch' || this.current === 'crouchBlock';
  }

  onEnter(state: CharacterState, cb: () => void) { this.onEnterCallbacks[state] = cb; }
  onExit(state:  CharacterState, cb: () => void) { this.onExitCallbacks[state]  = cb; }

  transition(next: CharacterState): boolean {
    const cfg = STATE_CONFIGS[this.current];
    if (this.current === next) return false;
    if (this.current === 'dead') return false;

    const canTransition =
      cfg.cancelable ||
      cfg.interruptBy.includes(next) ||
      (this.frameTimer >= cfg.duration && cfg.duration !== -1);

    if (!canTransition) return false;

    this.onExitCallbacks[this.current]?.();
    this.current = next;
    this.frameTimer = 0;
    this.onEnterCallbacks[this.current]?.();
    return true;
  }

  // Force transition regardless of rules (for hit/knockdown)
  forceTransition(next: CharacterState) {
    this.onExitCallbacks[this.current]?.();
    this.current = next;
    this.frameTimer = 0;
    this.onEnterCallbacks[this.current]?.();
  }

  update() {
    this.frameTimer++;
    const cfg = STATE_CONFIGS[this.current];
    if (cfg.duration !== -1 && this.frameTimer >= cfg.duration) {
      // Auto-return to idle when timed states finish
      if (!['dead', 'idle'].includes(this.current)) {
        this.forceTransition('idle');
      }
    }
  }

  isInState(...states: CharacterState[]): boolean {
    return states.includes(this.current);
  }

  get frameTimer_(): number { return this.frameTimer; }
}
