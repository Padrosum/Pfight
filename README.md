# PFight

A retro 2D side-view fighting game built with PixiJS v8, TypeScript, and Parcel. Inspired by classic arcade fighters like Street Fighter II — pixel art style, synthesized sound effects, and a simple CPU opponent.

![PFight screenshot placeholder](https://placehold.co/800x450/0d001e/ffdd00?text=PFIGHT&font=monospace)

## Features

- **2 Characters** — Player 1 (blue) vs CPU (red) with phase-based AI
- **4 Attack types** — Light punch, heavy punch, light kick, heavy kick
- **Combo system** — Chain light → heavy attacks for bonus damage
- **Block mechanic** — Reduces incoming damage by 85%
- **Round system** — Best of 3 rounds, 99-second timer
- **Hitstun & knockback** — Attacks launch opponents with physics
- **Synthesized SFX** — All sounds generated via Web Audio API (no audio files)
- **CRT scanline overlay** — Authentic retro monitor feel
- **Pixel-perfect scaling** — Canvas scales to any viewport while staying crisp
- **FPS counter** — Built-in dev performance display

## Controls

| Key | Action |
|-----|--------|
| `A` / `D` | Walk left / right |
| `W` | Jump |
| `S` | Crouch |
| `J` | Light attack |
| `K` | Heavy attack |
| `J` → `K` | Combo (chain light into heavy) |
| `L` | Block |
| `P` | Pause / Resume |
| `Enter` | Start game / Return to menu |

## Tech Stack

| | |
|---|---|
| **Renderer** | [PixiJS v8](https://pixijs.com/) — WebGL/WebGPU 2D graphics |
| **Language** | TypeScript 5 |
| **Bundler** | [Parcel v2](https://parceljs.org/) — zero-config builds |
| **Audio** | Web Audio API — procedurally synthesized SFX |
| **Font** | Press Start 2P (Google Fonts) |

## Project Structure

```
src/
├── main.ts                      # Entry point — PixiJS app init & viewport scaling
├── game.ts                      # Game class — phase FSM, fixed timestep loop
├── Arena.ts                     # Procedural cyberpunk arena background
├── entities/
│   ├── Player.ts                # Physics, input, pixel-art drawing, hitboxes
│   └── Enemy.ts                 # Extends Player with phase-based CPU AI
├── states/
│   └── CharacterStateMachine.ts # State pattern (idle/walk/jump/attack/hit/…)
├── systems/
│   ├── InputManager.ts          # Keyboard just-pressed tracking
│   ├── CollisionSystem.ts       # Rect overlap + world hitbox helpers
│   ├── AnimationManager.ts      # Per-state animation playback via Graphics draw fns
│   └── SoundEngine.ts           # Web Audio API synthesized sound effects
└── ui/
    └── UIManager.ts             # DOM health bars, timer, round dots, overlays
```

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build → dist/
npm run build
```

## Architecture Notes

**Fixed timestep loop** — Physics and game logic run at a locked 60 fps step (`1000/16.67ms`), decoupled from render frame rate. This makes gameplay deterministic regardless of monitor refresh rate.

**State machine per character** — Each character has a `CharacterStateMachine` that enforces valid transitions. Attack states can only be interrupted by combo-chained moves; hit/knockdown states cannot be cancelled.

**Scale.x mirroring** — Pixel-art characters are always drawn facing right. The `AnimationManager` wraps graphics in a sub-container and sets `scale.x = -1` when the character faces left — no duplicate draw code needed.

**Hitbox windows** — Each attack has an active hitbox only on a specific animation frame index. A `hitConfirmed` flag prevents the same swing from registering multiple hits.

**Procedural SFX** — `SoundEngine` synthesizes all sounds on the fly using `OscillatorNode` and noise buffers. No audio files required.

