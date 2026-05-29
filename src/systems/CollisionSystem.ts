export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HitboxDef {
  active: boolean;
  rect: Rect;      // relative to character origin (facing right)
  damage: number;
  hitstun: number; // frames
  knockbackX: number;
  knockbackY: number;
  isHigh: boolean; // can be blocked standing
  isLow: boolean;  // must be crouched to block
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function getWorldHitbox(
  charX: number,
  charY: number,
  facingRight: boolean,
  def: HitboxDef
): Rect {
  const rx = facingRight ? def.rect.x : -(def.rect.x + def.rect.w);
  return {
    x: charX + rx,
    y: charY + def.rect.y,
    w: def.rect.w,
    h: def.rect.h,
  };
}
