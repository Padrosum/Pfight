import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export function buildArena(container: Container, width: number, height: number) {
  const g = new Graphics();

  // Sky gradient (simulated with bands)
  const skyColors = [0x1a0533, 0x2a0844, 0x3b0f5e, 0x4a1575];
  const bandH = height * 0.6 / skyColors.length;
  skyColors.forEach((col, i) => {
    g.rect(0, i * bandH, width, bandH).fill(col);
  });

  // Ground
  g.rect(0, height * 0.6, width, height * 0.4).fill(0x1a1a2e);
  // Ground highlight stripe
  g.rect(0, height * 0.6, width, 4).fill(0x4444aa);
  g.rect(0, height * 0.6 + 4, width, 2).fill(0x222266);

  // Floor tiles
  const tileW = 40;
  for (let tx = 0; tx < width; tx += tileW) {
    const shade = (Math.floor(tx / tileW) % 2 === 0) ? 0x1e1e32 : 0x16162a;
    g.rect(tx, height * 0.6 + 6, tileW, height * 0.4 - 6).fill(shade);
    // Tile gap
    g.rect(tx + tileW - 1, height * 0.6 + 6, 1, height * 0.4 - 6).fill(0x0a0a18);
  }

  // Neon horizon line glow
  for (let i = 0; i < 6; i++) {
    g.rect(0, height * 0.6 - i, width, 1).fill({ color: 0xaa44ff, alpha: (6 - i) / 12 });
  }

  // Background buildings (silhouette)
  const buildings = [
    { x: 10,  w: 60,  h: 120, col: 0x110022 },
    { x: 80,  w: 40,  h: 90,  col: 0x0d001e },
    { x: 130, w: 80,  h: 140, col: 0x110022 },
    { x: 240, w: 50,  h: 100, col: 0x0d001e },
    { x: 310, w: 90,  h: 160, col: 0x110022 },
    { x: 430, w: 60,  h: 110, col: 0x0d001e },
    { x: 510, w: 80,  h: 145, col: 0x110022 },
    { x: 610, w: 45,  h: 95,  col: 0x0d001e },
    { x: 670, w: 70,  h: 130, col: 0x110022 },
    { x: 750, w: 55,  h: 105, col: 0x0d001e },
  ];

  const groundTop = height * 0.6;
  buildings.forEach(b => {
    g.rect(b.x, groundTop - b.h, b.w, b.h).fill(b.col);
    // Windows
    for (let wy = groundTop - b.h + 8; wy < groundTop - 8; wy += 16) {
      for (let wx = b.x + 6; wx < b.x + b.w - 10; wx += 12) {
        const lit = Math.random() < 0.45;
        if (lit) {
          const wcol = Math.random() < 0.5 ? 0xffee88 : 0x88aaff;
          g.rect(wx, wy, 6, 8).fill({ color: wcol, alpha: 0.6 });
        }
      }
    }
  });

  // Stars
  for (let i = 0; i < 60; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height * 0.45;
    const br = Math.random() < 0.2 ? 0xffffff : 0xaaaacc;
    g.rect(sx, sy, 1, 1).fill(br);
  }

  // Neon sign on a building
  const signX = 310;
  const signY = groundTop - 170;
  g.rect(signX + 5, signY, 80, 20).fill(0x220033);
  g.rect(signX + 5, signY, 80, 2).fill(0xff44ff);
  g.rect(signX + 5, signY + 18, 80, 2).fill(0xff44ff);
  g.rect(signX + 5, signY, 2, 20).fill(0xff44ff);
  g.rect(signX + 83, signY, 2, 20).fill(0xff44ff);

  container.addChildAt(g, 0);

  // Sign text (pixel style)
  const signStyle = new TextStyle({
    fontFamily: 'monospace',
    fontSize: 10,
    fill: 0xff88ff,
    letterSpacing: 1,
  });
  const signText = new Text({ text: 'PFIGHT', style: signStyle });
  signText.x = signX + 12;
  signText.y = signY + 5;
  container.addChildAt(signText, 1);
}
