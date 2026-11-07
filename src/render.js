import { drawAnimal, drawAvatar, drawCottage, drawSymbol, drawTree } from './art.js';
import { normaliseAvatar } from './avatar.js';
import { jobById, animalById } from './data.js';
import { createTrail, tileAt } from './world.js';

export function cameraFor(player, cssW, cssH) {
  const tile = Math.max(48, Math.min(cssW / 6.2, cssH / 9.2));
  const ox = cssW / 2 - (player.x + 0.5) * tile;
  const oy = cssH * 0.46 - (player.y + 0.5) * tile;
  return { tile, ox, oy };
}

export function tileFromPoint(cam, px, py) {
  return {
    x: Math.floor((px - cam.ox) / cam.tile),
    y: Math.floor((py - cam.oy) / cam.tile),
  };
}

export function tileCenter(cam, x, y) {
  return { x: cam.ox + (x + 0.5) * cam.tile, y: cam.oy + (y + 0.5) * cam.tile };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawWorld(ctx, cssW, cssH, state, pos, time, motion = {}) {
  const active = state.active;
  const job = jobById(active.jobId);
  const animal = animalById(job.animalId);
  const trail = createTrail(job);
  const cam = cameraFor(pos, cssW, cssH);
  const { tile, ox, oy } = cam;
  const easy = active.difficulty === 'easy';
  const bob = Math.sin(time / 380) * 2;

  const sky = ctx.createLinearGradient(0, 0, 0, cssH);
  sky.addColorStop(0, '#7FD3FF');
  sky.addColorStop(0.35, '#8EE07A');
  sky.addColorStop(1, '#62c85c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssW, cssH);

  for (let y = 0; y < trail.height; y++) {
    for (let x = 0; x < trail.width; x++) {
      const t = trail.tiles[y][x];
      const px = ox + x * tile;
      const py = oy + y * tile;
      if (px > cssW || py > cssH || px + tile < 0 || py + tile < 0) continue;
      if (t.kind === 'tree') continue;
      ctx.fillStyle = t.kind === 'den' ? '#d7e7a4' : t.kind === 'grove' ? '#c5dd8c' : '#e4c07a';
      ctx.beginPath();
      ctx.ellipse(px + tile / 2, py + tile * 0.62, tile * 0.46, tile * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,60,30,0.25)';
      ctx.stroke();
      if (t.clueId && activeClueVisible(active, t.clueId)) {
        const glow = easy && !active.cluesFound.includes(t.clueId);
        if (glow) {
          ctx.fillStyle = 'rgba(242,181,68,0.55)';
          ctx.beginPath();
          ctx.arc(px + tile / 2, py + tile * 0.62, tile * 0.28 + Math.sin(time / 200) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        drawSymbol(ctx, symbolForClue(t.clueId, job), px + tile / 2, py + tile * 0.58, tile * 0.28);
      }
    }
  }

  const sprites = [];
  for (let y = 0; y < trail.height; y++) {
    for (let x = 0; x < trail.width; x++) {
      const t = tileAt(trail, x, y);
      sprites.push({ y, x, t });
    }
  }
  const lift = motion.walking ? (motion.bob || 0) * tile * 0.2 : bob;
  const lean = motion.walking ? (motion.dirx || 0) * tile * 0.05 : 0;
  sprites.push({ y: pos.y + 0.01, x: pos.x, actor: 'hero', lift, lean });
  const follow = active.following ? (motion.follow || idleFollow(trail, pos)) : null;
  if (follow) sprites.push({ y: follow.y + 0.01, x: follow.x, actor: 'pet', follow });
  sprites.sort((a, b) => a.y - b.y || a.x - b.x);

  for (const item of sprites) {
    if (item.actor === 'hero') {
      const c = tileCenter(cam, pos.x, pos.y);
      drawAvatar(ctx, normaliseAvatar(state.avatar), c.x + item.lean, c.y - tile * 0.28 - item.lift, tile * 1.45, 'map', job.itemId);
      continue;
    }
    if (item.actor === 'pet') {
      const pet = item.follow;
      const c = tileCenter(cam, pet.x, pet.y);
      const hop = (pet.hop || 0) * tile * 0.62;
      drawAnimal(ctx, animal.kind, c.x, c.y - tile * 0.1, tile * 0.7, 'happy', hop);
      continue;
    }
    const { t } = item;
    const px = ox + t.x * tile;
    const py = oy + t.y * tile;
    const cx = px + tile / 2;
    const cy = py + tile * 0.55;
    if (t.kind === 'tree') drawTree(ctx, cx, cy + tile * 0.15, tile * 0.95, t.x * 3 + t.y);
    else if (t.kind === 'log' && !active.solved.log) {
      ctx.fillStyle = '#8a5a32';
      roundRect(ctx, px + 2, cy, tile - 4, tile * 0.28, 8);
      ctx.fill();
      ctx.strokeStyle = '#1c2a22';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (easy) glowRing(ctx, cx, cy + tile * 0.1, tile * 0.4, time);
    } else if (t.kind === 'crawl') {
      ctx.fillStyle = '#2a241c';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 6, tile * 0.28, tile * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!easy && !active.solved.log) glowRing(ctx, cx, cy, tile * 0.34, time);
    } else if (t.kind === 'picture') {
      ctx.fillStyle = '#d9d3c5';
      roundRect(ctx, cx - tile * 0.28, cy - tile * 0.2, tile * 0.56, tile * 0.42, 6);
      ctx.fill();
      ctx.strokeStyle = '#1c2a22';
      ctx.stroke();
      drawSymbol(ctx, job.pictureOrder[0], cx, cy, tile * 0.32);
      if (easy && !active.solved.picture) glowRing(ctx, cx, cy, tile * 0.4, time);
    } else if (t.kind === 'pictureDoor' && !active.solved.picture) {
      ctx.fillStyle = '#8d8a82';
      roundRect(ctx, cx - tile * 0.2, cy - tile * 0.35, tile * 0.4, tile * 0.55, 6);
      ctx.fill();
    } else if (t.kind === 'switch') {
      const on = active.solved.switches || active.switchSeq.includes(t.symbol);
      ctx.fillStyle = on ? '#8d9a7a' : '#c9c2b2';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, tile * 0.28, tile * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1c2a22';
      ctx.stroke();
      drawSymbol(ctx, t.symbol, cx, cy - tile * 0.08, tile * 0.34);
      if (easy && !active.solved.switches && t.symbol === job.switchOrder[0]) glowRing(ctx, cx, cy, tile * 0.36, time);
    } else if (t.kind === 'switchDoor' && !active.solved.switches) {
      ctx.fillStyle = '#6d6458';
      roundRect(ctx, cx - tile * 0.22, cy - tile * 0.3, tile * 0.44, tile * 0.5, 4);
      ctx.fill();
    } else if (t.kind === 'fern' && !(active.solved.fern && t.opens)) {
      ctx.fillStyle = '#1f6b3a';
      for (const dx of [-0.15, 0, 0.15]) {
        ctx.beginPath();
        ctx.ellipse(cx + dx * tile, cy, tile * 0.16, tile * 0.28, dx * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (easy && t.opens) glowRing(ctx, cx, cy, tile * 0.4, time);
    } else if (t.kind === 'gate') {
      drawCottage(ctx, cx, cy + tile * 0.08, tile * 1.7, time);
    }

    if (active.glowTile && t.x === active.glowTile.x && t.y === active.glowTile.y) {
      glowRing(ctx, cx, cy - tile * 0.05, tile * 0.46, time);
    }
    const wild = animalById(active.wildId);
    if (wild && active.wildWhere === 'grove' && t.kind === 'grove') {
      drawAnimal(ctx, wild.kind, cx, cy - tile * 0.2, tile * 0.7, 'scared');
    }
    if (wild && active.wildWhere === 'hidden' && t.x === trail.wildHide.x && t.y === trail.wildHide.y) {
      drawAnimal(ctx, wild.kind, cx + 6, cy - tile * 0.05, tile * 0.55, 'scared');
    }
    if (active.petWhere === 'den' && t.kind === 'den') {
      drawAnimal(ctx, animal.kind, cx, cy - tile * 0.28, tile * 0.8, 'scared');
    }
    if (active.petWhere === 'hidden' && t.x === trail.hideSpot.x && t.y === trail.hideSpot.y) {
      drawAnimal(ctx, animal.kind, cx - 8, cy - tile * 0.1, tile * 0.62, 'scared');
    }
  }

  return cam;
}

function idleFollow(trail, pos) {
  if (tileAt(trail, pos.x, pos.y + 1)) return { x: pos.x, y: pos.y + 1, hop: 0 };
  return { x: pos.x + 0.35, y: pos.y, hop: 0 };
}

function activeClueVisible(active, id) {
  if (active.cluesFound.includes(id)) return false;
  if (active.difficulty === 'easy') return id === 'paw' || id === 'log';
  return true;
}

function symbolForClue(id, job) {
  if (id === 'paw') return 'paw';
  if (id === 'favourite') return job.animalId === 'luma' ? 'moon' : job.animalId === 'bramble' ? 'bone' : 'fish';
  if (id === 'picture') return job.pictureOrder[0];
  if (id === 'fern') return 'leaf';
  if (id === 'switches') return 'star';
  return 'paw';
}

function glowRing(ctx, x, y, r, time) {
  ctx.strokeStyle = `rgba(242,181,68,${0.45 + Math.sin(time / 180) * 0.35})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
