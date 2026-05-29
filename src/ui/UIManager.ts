export class UIManager {
  private mainMenuEl = document.getElementById('main-menu') as HTMLElement;
  private hudEl      = document.getElementById('hud')       as HTMLElement;
  private p1Bar = document.getElementById('p1-health-bar') as HTMLElement;
  private p2Bar = document.getElementById('p2-health-bar') as HTMLElement;
  private timerEl = document.getElementById('timer') as HTMLElement;
  private roundTextEl = document.getElementById('round-text') as HTMLElement;
  private announceScreen = document.getElementById('announce-screen') as HTMLElement;
  private announceText = document.getElementById('announce-text') as HTMLElement;
  private announceSub = document.getElementById('announce-sub') as HTMLElement;
  private pauseScreen = document.getElementById('pause-screen') as HTMLElement;
  private winScreen = document.getElementById('win-screen') as HTMLElement;
  private winText = document.getElementById('win-text') as HTMLElement;
  private fpsEl = document.getElementById('fps') as HTMLElement;
  private p1R1 = document.getElementById('p1-r1') as HTMLElement;
  private p1R2 = document.getElementById('p1-r2') as HTMLElement;
  private p2R1 = document.getElementById('p2-r1') as HTMLElement;
  private p2R2 = document.getElementById('p2-r2') as HTMLElement;
  private comboP1 = document.getElementById('combo-p1') as HTMLElement;
  private comboP2 = document.getElementById('combo-p2') as HTMLElement;
  private comboTimer1 = 0;
  private comboTimer2 = 0;

  showMainMenu() {
    this.mainMenuEl.classList.remove('hidden');
    this.hudEl.style.display = 'none';
  }

  hideMainMenu() {
    this.mainMenuEl.classList.add('hidden');
    this.hudEl.style.display = '';
  }

  setHealth(player: 1 | 2, pct: number) {
    const bar = player === 1 ? this.p1Bar : this.p2Bar;
    bar.style.width = `${Math.max(0, pct * 100)}%`;
    // Color shift: green → yellow → red
    const r = pct < 0.5 ? 255 : Math.round(255 * (1 - pct) * 2);
    const g = pct > 0.5 ? 255 : Math.round(255 * pct * 2);
    bar.style.background = `linear-gradient(to bottom, rgb(${r},${g},0), rgb(${Math.round(r*0.8)},${Math.round(g*0.8)},0))`;
  }

  setTimer(seconds: number) {
    this.timerEl.textContent = String(Math.ceil(seconds));
    this.timerEl.classList.toggle('urgent', seconds <= 10);
  }

  setRound(round: number) {
    this.roundTextEl.textContent = `ROUND ${round}`;
  }

  setRoundWins(p1wins: number, p2wins: number) {
    this.p1R1.classList.toggle('filled', p1wins >= 1);
    this.p1R2.classList.toggle('filled', p1wins >= 2);
    this.p2R1.classList.toggle('filled', p2wins >= 1);
    this.p2R2.classList.toggle('filled', p2wins >= 2);
  }

  showAnnounce(text: string, sub: string, duration: number): Promise<void> {
    this.announceText.textContent = text;
    this.announceSub.textContent = sub;
    this.announceScreen.classList.remove('hidden');
    return new Promise(resolve => setTimeout(() => {
      this.announceScreen.classList.add('hidden');
      resolve();
    }, duration));
  }

  setPause(paused: boolean) {
    this.pauseScreen.classList.toggle('hidden', !paused);
  }

  showWin(text: string) {
    this.winText.textContent = text;
    this.winScreen.classList.remove('hidden');
  }

  hideWin() {
    this.winScreen.classList.add('hidden');
  }

  setFps(fps: number) {
    this.fpsEl.textContent = `FPS: ${fps}`;
  }

  showCombo(player: 1 | 2, count: number) {
    if (count < 2) return;
    const el = player === 1 ? this.comboP1 : this.comboP2;
    el.textContent = `${count} HIT COMBO!`;
    el.classList.add('visible');
    if (player === 1) {
      this.comboTimer1 = 90;
    } else {
      this.comboTimer2 = 90;
    }
  }

  update() {
    if (this.comboTimer1 > 0) {
      this.comboTimer1--;
      if (this.comboTimer1 === 0) this.comboP1.classList.remove('visible');
    }
    if (this.comboTimer2 > 0) {
      this.comboTimer2--;
      if (this.comboTimer2 === 0) this.comboP2.classList.remove('visible');
    }
  }
}
