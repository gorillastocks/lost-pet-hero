// Original drawings made of simple shapes. No outside art files.

export const INK = '#4A3B6B';

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function eye(ctx, x, y, s, mood) {
  const r = Math.max(2.2, s * 0.075);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.15, r * 1.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, s * 0.03);
  ctx.stroke();
  ctx.fillStyle = mood === 'happy' ? '#4A3B6B' : '#3a2d55';
  ctx.beginPath();
  ctx.arc(x + r * 0.15, y + r * 0.15, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - r * 0.15, y - r * 0.25, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  if (mood === 'scared') {
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 1.1);
    ctx.lineTo(x + r * 0.8, y - r * 1.5);
    ctx.stroke();
  }
}

function blush(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,143,199,0.5)';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.16, y + s * 0.08, s * 0.07, s * 0.04, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.16, y + s * 0.08, s * 0.07, s * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
}

function mouth(ctx, x, y, s, mood) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, s * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'happy' || mood === 'calm') {
    ctx.arc(x, y, s * 0.08, 0.15 * Math.PI, 0.85 * Math.PI);
  } else {
    ctx.arc(x, y + s * 0.08, s * 0.07, 1.15 * Math.PI, 1.85 * Math.PI);
  }
  ctx.stroke();
}

export function drawShadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(20,40,24,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.42, w * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawKid(ctx, x, y, s, itemId) {
  drawShadow(ctx, x, y + s * 0.42, s);
  ctx.fillStyle = '#3a2a22';
  rr(ctx, x - s * 0.16, y + s * 0.22, s * 0.14, s * 0.16, 3);
  rr(ctx, x + s * 0.02, y + s * 0.22, s * 0.14, s * 0.16, 3);
  ctx.fill();
  ctx.fillStyle = '#2f7d4a';
  rr(ctx, x - s * 0.2, y - s * 0.02, s * 0.4, s * 0.32, s * 0.1);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f2b544';
  ctx.beginPath();
  ctx.arc(x, y - s * 0.16, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f6d7b8';
  ctx.beginPath();
  ctx.arc(x, y - s * 0.12, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  eye(ctx, x - s * 0.05, y - s * 0.14, s * 1.2, 'happy');
  eye(ctx, x + s * 0.05, y - s * 0.14, s * 1.2, 'happy');
  mouth(ctx, x, y - s * 0.08, s * 0.9, 'happy');
  ctx.fillStyle = '#8a5a32';
  rr(ctx, x + s * 0.12, y - s * 0.02, s * 0.16, s * 0.2, 4);
  ctx.fill();
  if (itemId === 'scarf') {
    ctx.strokeStyle = '#e36b4f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.22, y + s * 0.02);
    ctx.quadraticCurveTo(x - s * 0.34, y + s * 0.2, x - s * 0.18, y + s * 0.28);
    ctx.stroke();
  } else if (itemId === 'ball') {
    ctx.fillStyle = '#e36b4f';
    ctx.beginPath();
    ctx.arc(x - s * 0.28, y + s * 0.12, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'bell') {
    ctx.fillStyle = '#f2d56b';
    ctx.beginPath();
    ctx.arc(x - s * 0.28, y + s * 0.08, s * 0.07, Math.PI, 0);
    ctx.fill();
  }
}

function ears(ctx, x, y, s, color, droop) {
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (droop) {
    ctx.ellipse(x - s * 0.16, y - s * 0.02, s * 0.1, s * 0.16, -0.6, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.16, y - s * 0.02, s * 0.1, s * 0.16, 0.6, 0, Math.PI * 2);
  } else {
    ctx.moveTo(x - s * 0.16, y - s * 0.08);
    ctx.lineTo(x - s * 0.08, y - s * 0.42);
    ctx.lineTo(x, y - s * 0.1);
    ctx.moveTo(x + s * 0.16, y - s * 0.08);
    ctx.lineTo(x + s * 0.08, y - s * 0.42);
    ctx.lineTo(x, y - s * 0.1);
  }
  ctx.fill();
  ctx.stroke();
}

export function drawAnimal(ctx, kind, x, y, s, mood = 'scared') {
  drawShadow(ctx, x, y + s * 0.34, s * 1.1);
  ctx.lineJoin = 'round';
  if (kind === 'kitten') {
    ears(ctx, x, y, s, '#e8923a', false);
    ctx.fillStyle = '#f0a04a';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.08, s * 0.22, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.22, s * 0.26, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c56d28';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, y + s * 0.22);
    ctx.quadraticCurveTo(x + s * 0.42, y, x + s * 0.28, y - s * 0.1);
    ctx.stroke();
  } else if (kind === 'puppy') {
    ears(ctx, x, y, s * 1.05, '#8a5a32', true);
    ctx.fillStyle = '#a56b3c';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.06, s * 0.22, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.24, s * 0.28, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6d7b8';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.1, s * 0.1, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'owl') {
    ctx.fillStyle = '#6b5a86';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.08, s * 0.28, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#f4e2a8';
    ctx.beginPath();
    ctx.arc(x - s * 0.1, y, s * 0.1, 0, Math.PI * 2);
    ctx.arc(x + s * 0.1, y, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2b544';
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.02);
    ctx.lineTo(x - s * 0.06, y + s * 0.1);
    ctx.lineTo(x + s * 0.06, y + s * 0.1);
    ctx.fill();
    eye(ctx, x - s * 0.1, y, s, mood);
    eye(ctx, x + s * 0.1, y, s, mood);
    return;
  } else if (kind === 'frog') {
    ctx.fillStyle = '#3e9a4a';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.12, s * 0.28, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#b7e38a';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.16, s * 0.14, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f6c8';
    ctx.beginPath();
    ctx.arc(x - s * 0.12, y - s * 0.12, s * 0.1, 0, Math.PI * 2);
    ctx.arc(x + s * 0.12, y - s * 0.12, s * 0.1, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    eye(ctx, x - s * 0.12, y - s * 0.12, s, mood);
    eye(ctx, x + s * 0.12, y - s * 0.12, s, mood);
    return;
  } else if (kind === 'fox') {
    ears(ctx, x, y, s, '#e07a32', false);
    ctx.fillStyle = '#e07a32';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.08, s * 0.2, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff6e4';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.12, s * 0.09, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e07a32';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.16, y + s * 0.2);
    ctx.quadraticCurveTo(x + s * 0.4, y + s * 0.3, x + s * 0.3, y - s * 0.05);
    ctx.stroke();
  } else if (kind === 'bird') {
    ctx.fillStyle = '#4aa3c7';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.08, s * 0.2, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#f2b544';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.16, y + s * 0.06);
    ctx.lineTo(x + s * 0.32, y + s * 0.1);
    ctx.lineTo(x + s * 0.16, y + s * 0.14);
    ctx.fill();
    ctx.fillStyle = '#2f7d4a';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.02, y - s * 0.08);
    ctx.lineTo(x + s * 0.04, y - s * 0.28);
    ctx.lineTo(x + s * 0.1, y - s * 0.06);
    ctx.fill();
    eye(ctx, x + s * 0.06, y + s * 0.04, s, mood);
    return;
  }
  blush(ctx, x, y, s);
  eye(ctx, x - s * 0.07, y + s * 0.02, s, mood);
  eye(ctx, x + s * 0.07, y + s * 0.02, s, mood);
  ctx.fillStyle = '#e36b4f';
  ctx.beginPath();
  ctx.arc(x, y + s * 0.1, s * 0.035, 0, Math.PI * 2);
  ctx.fill();
  mouth(ctx, x, y + s * 0.12, s, mood);
}

/** Cozy cottage. Reads as a house even when `s` is about one map tile. */
export function drawCottage(ctx, x, y, s, time = 0) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const ink = Math.max(2, s * 0.045);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink;
  ctx.fillStyle = '#C6E28A';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.34, s * 0.52, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.46, y + s * 0.28);
  ctx.lineTo(x + s * 0.46, y + s * 0.28);
  ctx.stroke();
  for (const dx of [-0.4, -0.16, 0.22, 0.42]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y + s * 0.38);
    ctx.lineTo(x + dx * s, y + s * 0.18);
    ctx.stroke();
  }
  for (const [dx, col] of [[-0.32, '#FF8FC7'], [0.34, '#FFD84D'], [-0.18, '#FF8A3D']]) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + dx * s, y + s * 0.32, Math.max(2.5, s * 0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.fillStyle = '#FFF6EA';
  rr(ctx, x - s * 0.26, y - s * 0.08, s * 0.52, s * 0.36, s * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FF7EB3';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.38, y - s * 0.04);
  ctx.lineTo(x, y - s * 0.42);
  ctx.lineTo(x + s * 0.38, y - s * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#E7B48A';
  rr(ctx, x + s * 0.1, y - s * 0.4, s * 0.1, s * 0.16, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const puff = Math.sin(time / 420) * s * 0.03;
  ctx.beginPath();
  ctx.arc(x + s * 0.16, y - s * 0.48 + puff, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  for (const dx of [-0.12, 0.12]) {
    ctx.fillStyle = '#FFE27A';
    rr(ctx, x + dx * s - s * 0.055, y - s * 0.02, s * 0.11, s * 0.09, s * 0.03);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.fillStyle = '#C4783A';
  ctx.beginPath();
  ctx.arc(x, y + s * 0.1, s * 0.08, Math.PI, 0);
  ctx.lineTo(x + s * 0.08, y + s * 0.24);
  ctx.lineTo(x - s * 0.08, y + s * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F6D7A8';
  ctx.beginPath();
  ctx.arc(x + s * 0.03, y + s * 0.16, s * 0.012, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5EB7F2';
  rr(ctx, x + s * 0.34, y + s * 0.1, s * 0.14, s * 0.1, 3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.41, y + s * 0.2);
  ctx.lineTo(x + s * 0.41, y + s * 0.36);
  ctx.stroke();
  ctx.restore();
}

/** A grown-up standing in the cottage doorway. */
export function drawOwner(ctx, x, y, s, skin = '#F3C39A') {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, s * 0.05);
  drawShadow(ctx, x, y + s * 0.42, s * 0.8);
  ctx.fillStyle = '#4A3B6B';
  rr(ctx, x - s * 0.1, y + s * 0.16, s * 0.08, s * 0.18, 3);
  rr(ctx, x + s * 0.02, y + s * 0.16, s * 0.08, s * 0.18, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7FD3FF';
  rr(ctx, x - s * 0.16, y - s * 0.08, s * 0.32, s * 0.28, s * 0.1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.22, s * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - s * 0.05, y - s * 0.24, s * 0.035, 0, Math.PI * 2);
  ctx.arc(x + s * 0.05, y - s * 0.24, s * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x - s * 0.05, y - s * 0.23, s * 0.016, 0, Math.PI * 2);
  ctx.arc(x + s * 0.05, y - s * 0.23, s * 0.016, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - s * 0.16, s * 0.05, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

export function drawTree(ctx, x, y, s, n) {
  const lean = ((n * 17) % 7) - 3;
  ctx.fillStyle = '#6b4228';
  rr(ctx, x - s * 0.08, y - s * 0.05, s * 0.16, s * 0.38, 3);
  ctx.fill();
  ctx.fillStyle = n % 2 ? '#22663c' : '#2f7d4a';
  ctx.beginPath();
  ctx.arc(x + lean, y - s * 0.28, s * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,246,228,0.18)';
  ctx.beginPath();
  ctx.arc(x - s * 0.08, y - s * 0.36, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + lean, y - s * 0.28, s * 0.34, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawHeart(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#e36b4f';
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s * 0.55, -s * 0.05, -s * 0.35, -s * 0.5, 0, -s * 0.18);
  ctx.bezierCurveTo(s * 0.35, -s * 0.5, s * 0.55, -s * 0.05, 0, s * 0.3);
  ctx.fill();
  ctx.restore();
}

export function drawFaceIcon(ctx, x, y, s) {
  ctx.fillStyle = '#f6d7b8';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.32, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x - s * 0.1, y - s * 0.04, s * 0.045, 0, Math.PI * 2);
  ctx.arc(x + s * 0.1, y - s * 0.04, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + s * 0.12, s * 0.08, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
}

export function drawSymbol(ctx, id, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#1c2a22';
  if (id === 'paw') {
    ctx.fillStyle = '#c46a3a';
    for (const [px, py] of [[-0.22, -0.18], [0, -0.28], [0.22, -0.18], [0, 0.12]]) {
      ctx.beginPath();
      ctx.ellipse(px * s, py * s, s * (py > 0 ? 0.16 : 0.09), s * (py > 0 ? 0.14 : 0.1), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'fish') {
    ctx.fillStyle = '#4aa3c7';
    ctx.beginPath();
    ctx.ellipse(-s * 0.05, 0, s * 0.28, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.18, 0);
    ctx.lineTo(s * 0.38, -s * 0.16);
    ctx.lineTo(s * 0.38, s * 0.16);
    ctx.fill();
  } else if (id === 'heart') {
    drawHeart(ctx, 0, s * 0.05, s * 0.9);
  } else if (id === 'bone') {
    ctx.strokeStyle = '#f6e2b8';
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, 0);
    ctx.lineTo(s * 0.18, 0);
    ctx.stroke();
    ctx.fillStyle = '#f6e2b8';
    for (const [px, py] of [[-0.22, -0.1], [-0.22, 0.1], [0.22, -0.1], [0.22, 0.1]]) {
      ctx.beginPath();
      ctx.arc(px * s, py * s, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'bell') {
    ctx.fillStyle = '#f2d56b';
    ctx.beginPath();
    ctx.arc(0, -s * 0.02, s * 0.22, Math.PI, 0);
    ctx.lineTo(s * 0.22, s * 0.12);
    ctx.lineTo(-s * 0.22, s * 0.12);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, s * 0.16, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'leaf') {
    ctx.fillStyle = '#3e9a4a';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.16, s * 0.32, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c2a22';
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.16);
    ctx.lineTo(s * 0.14, -s * 0.16);
    ctx.stroke();
  } else if (id === 'moon') {
    ctx.fillStyle = '#f2d56b';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6e4';
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.04, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'log') {
    ctx.fillStyle = '#c9854a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.roundRect?.(-s * 0.4, -s * 0.12, s * 0.8, s * 0.28, s * 0.12);
    if (!ctx.roundRect) ctx.rect(-s * 0.4, -s * 0.12, s * 0.8, s * 0.28);
    ctx.fill(); ctx.stroke();
  } else if (id === 'up') {
    ctx.strokeStyle = '#FF8FC7';
    ctx.fillStyle = '#FF8FC7';
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.28);
    ctx.lineTo(0, -s * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.34);
    ctx.lineTo(-s * 0.18, -s * 0.05);
    ctx.lineTo(s * 0.18, -s * 0.05);
    ctx.fill();
  } else if (id === 'sun') {
    ctx.fillStyle = '#FFD84D';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFA94D';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.24, Math.sin(a) * s * 0.24);
      ctx.lineTo(Math.cos(a) * s * 0.38, Math.sin(a) * s * 0.38);
      ctx.stroke();
    }
  } else if (id === 'star') {
    ctx.fillStyle = '#f2b544';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * 0.12 : s * 0.3;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const HERO = {
  avery: { skin: '#F3C39A', hair: '#C4783A', shirt: '#14B8B0', pants: '#3D6B9A', pack: '#FFD84D' },
  kai: { skin: '#8C5A3C', hair: '#24160F', shirt: '#FFD84D', pants: '#4A3B6B', cape: '#FF4F78' },
  mira: { skin: '#E7B48C', hair: '#4A2714', shirt: '#3AA0E8', pants: '#5C6B3A', hat: '#E2C27A' },
  sam: { skin: '#F6D3B0', hair: '#3A2A22', shirt: '#3ECF9A', pants: '#4A3B6B', scarf: '#FF7EB6' },
  fox: { fur: '#FF8A3D', belly: '#FFF1DC', inner: '#FFB088' },
  bunny: { fur: '#D5D0D8', belly: '#FFFFFF', inner: '#FF8FC7' },
  owl: { fur: '#B48CFF', belly: '#F4ECFF', beak: '#FFD84D' },
  panda: { fur: '#FFFBFA', patch: '#2A2438', blush: '#FFB3C7' },
};

function heroStroke(ctx, s) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(3, s * 0.045);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function heroDisc(ctx, x, y, r, fill, s) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  heroStroke(ctx, s);
}

function heroEyes(ctx, x, y, s) {
  const r = Math.max(3.5, s * 0.085);
  ctx.lineWidth = Math.max(2, s * 0.03);
  for (const dx of [-1, 1]) {
    const ex = x + dx * s * 0.1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(ex, y, r * 1.05, r * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = '#2A2144';
    ctx.beginPath();
    ctx.arc(ex + r * 0.12, y + r * 0.12, r * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex - r * 0.22, y - r * 0.28, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
  }
}

function heroSmile(ctx, x, y, s) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, s * 0.035);
  ctx.beginPath();
  ctx.arc(x, y, s * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawHeldItem(ctx, x, y, s, itemId) {
  if (!itemId) return;
  if (itemId === 'scarf') {
    ctx.strokeStyle = '#E36B4F';
    ctx.lineWidth = Math.max(4, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.28, y - s * 0.2);
    ctx.quadraticCurveTo(x - s * 0.48, y, x - s * 0.3, y + s * 0.12);
    ctx.stroke();
  } else if (itemId === 'ball') {
    heroDisc(ctx, x - s * 0.34, y - s * 0.08, s * 0.09, '#E36B4F', s);
  } else if (itemId === 'bell') {
    heroDisc(ctx, x - s * 0.34, y - s * 0.1, s * 0.08, '#F2D56B', s);
  }
}

function drawKidHero(ctx, id, x, y, s, itemId) {
  const p = HERO[id];
  drawShadow(ctx, x, y + s * 0.02, s * 0.85);
  if (id === 'kai') {
    ctx.fillStyle = p.cape;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.16, y - s * 0.5);
    ctx.lineTo(x + s * 0.16, y - s * 0.5);
    ctx.quadraticCurveTo(x + s * 0.48, y - s * 0.2, x + s * 0.28, y + s * 0.02);
    ctx.lineTo(x - s * 0.28, y + s * 0.02);
    ctx.quadraticCurveTo(x - s * 0.48, y - s * 0.2, x - s * 0.16, y - s * 0.5);
    ctx.fill();
    heroStroke(ctx, s);
  }
  if (id === 'avery') {
    ctx.fillStyle = p.pack;
    rr(ctx, x - s * 0.2, y - s * 0.42, s * 0.4, s * 0.26, s * 0.08);
    ctx.fill();
    heroStroke(ctx, s);
    ctx.strokeStyle = '#C49212';
    ctx.lineWidth = Math.max(2, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.08, y - s * 0.42);
    ctx.lineTo(x - s * 0.08, y - s * 0.16);
    ctx.moveTo(x + s * 0.08, y - s * 0.42);
    ctx.lineTo(x + s * 0.08, y - s * 0.16);
    ctx.stroke();
  }
  ctx.fillStyle = p.pants;
  rr(ctx, x - s * 0.16, y - s * 0.2, s * 0.13, s * 0.2, s * 0.04);
  ctx.fill(); heroStroke(ctx, s);
  rr(ctx, x + s * 0.03, y - s * 0.2, s * 0.13, s * 0.2, s * 0.04);
  ctx.fill(); heroStroke(ctx, s);
  ctx.fillStyle = p.shirt;
  rr(ctx, x - s * 0.2, y - s * 0.46, s * 0.4, s * 0.3, s * 0.12);
  ctx.fill(); heroStroke(ctx, s);
  if (id === 'sam') {
    ctx.fillStyle = p.scarf;
    rr(ctx, x - s * 0.18, y - s * 0.5, s * 0.36, s * 0.11, s * 0.05);
    ctx.fill(); heroStroke(ctx, s);
    rr(ctx, x + s * 0.08, y - s * 0.42, s * 0.1, s * 0.22, s * 0.04);
    ctx.fill(); heroStroke(ctx, s);
  }
  if (id === 'mira') {
    ctx.fillStyle = p.hair;
    for (const [dx, dy] of [[-0.18, -0.58], [0.18, -0.58], [-0.22, -0.72], [0.22, -0.72], [0, -0.8]]) {
      heroDisc(ctx, x + dx * s, y + dy * s, s * 0.09, p.hair, s);
    }
  }
  heroDisc(ctx, x, y - s * 0.66, s * 0.2, p.skin, s);
  if (id === 'avery' || id === 'kai' || id === 'sam') {
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.7, s * 0.2, Math.PI, 0);
    ctx.fill();
    if (id === 'avery') {
      heroDisc(ctx, x - s * 0.16, y - s * 0.62, s * 0.07, p.hair, s);
      heroDisc(ctx, x + s * 0.16, y - s * 0.62, s * 0.07, p.hair, s);
    }
  }
  if (id === 'mira') {
    ctx.fillStyle = p.hat;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.82, s * 0.3, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill(); heroStroke(ctx, s);
    rr(ctx, x - s * 0.12, y - s * 1.02, s * 0.24, s * 0.2, s * 0.06);
    ctx.fill(); heroStroke(ctx, s);
  }
  if (id === 'avery') {
    ctx.fillStyle = '#E08A4F';
    for (const dx of [-0.08, -0.04, 0.05]) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y - s * 0.58, s * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  heroEyes(ctx, x, y - s * 0.66, s);
  heroSmile(ctx, x, y - s * 0.56, s);
  blush(ctx, x, y - s * 0.6, s * 0.9);
  drawHeldItem(ctx, x, y, s, itemId);
}

function drawAnimalHero(ctx, id, x, y, s) {
  drawShadow(ctx, x, y + s * 0.02, s * 0.9);
  if (id === 'fox') {
    const p = HERO.fox;
    ctx.fillStyle = p.fur;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.16, y - s * 0.2);
    ctx.quadraticCurveTo(x + s * 0.55, y - s * 0.05, x + s * 0.48, y + s * 0.02);
    ctx.quadraticCurveTo(x + s * 0.28, y - s * 0.02, x + s * 0.16, y - s * 0.08);
    ctx.fill(); heroStroke(ctx, s);
    ctx.fillStyle = p.belly;
    ctx.beginPath();
    ctx.arc(x + s * 0.46, y - s * 0.02, s * 0.07, 0, Math.PI * 2);
    ctx.fill(); heroStroke(ctx, s);
    heroDisc(ctx, x, y - s * 0.28, s * 0.26, p.fur, s);
    heroDisc(ctx, x, y - s * 0.22, s * 0.14, p.belly, s);
    ctx.fillStyle = p.fur;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.16, y - s * 0.42);
    ctx.lineTo(x - s * 0.28, y - s * 0.78);
    ctx.lineTo(x - s * 0.02, y - s * 0.48);
    ctx.moveTo(x + s * 0.16, y - s * 0.42);
    ctx.lineTo(x + s * 0.28, y - s * 0.78);
    ctx.lineTo(x + s * 0.02, y - s * 0.48);
    ctx.fill(); heroStroke(ctx, s);
    heroEyes(ctx, x, y - s * 0.3, s * 0.95);
    ctx.fillStyle = '#3A2A22';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.2, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'bunny') {
    const p = HERO.bunny;
    ctx.fillStyle = p.inner;
    ctx.beginPath();
    ctx.ellipse(x - s * 0.12, y - s * 0.72, s * 0.07, s * 0.2, 0, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.12, y - s * 0.72, s * 0.07, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill(); heroStroke(ctx, s);
    ctx.fillStyle = p.fur;
    ctx.beginPath();
    ctx.ellipse(x - s * 0.12, y - s * 0.74, s * 0.1, s * 0.26, -0.05, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.12, y - s * 0.74, s * 0.1, s * 0.26, 0.05, 0, Math.PI * 2);
    ctx.fill(); heroStroke(ctx, s);
    heroDisc(ctx, x, y - s * 0.28, s * 0.28, p.fur, s);
    heroDisc(ctx, x, y - s * 0.22, s * 0.14, p.belly, s);
    heroEyes(ctx, x, y - s * 0.32, s);
    ctx.fillStyle = p.inner;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.18, s * 0.045, s * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'owl') {
    const p = HERO.owl;
    ctx.fillStyle = p.fur;
    ctx.beginPath();
    ctx.ellipse(x - s * 0.28, y - s * 0.28, s * 0.1, s * 0.16, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.28, y - s * 0.28, s * 0.1, s * 0.16, 0.4, 0, Math.PI * 2);
    ctx.fill(); heroStroke(ctx, s);
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.32, s * 0.32, s * 0.34, 0, 0, Math.PI * 2);
    ctx.fill(); heroStroke(ctx, s);
    heroDisc(ctx, x, y - s * 0.24, s * 0.16, p.belly, s);
    heroEyes(ctx, x, y - s * 0.36, s * 1.15);
    ctx.fillStyle = p.beak;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.28);
    ctx.lineTo(x - s * 0.06, y - s * 0.2);
    ctx.lineTo(x + s * 0.06, y - s * 0.2);
    ctx.closePath();
    ctx.fill(); heroStroke(ctx, s);
  } else {
    const p = HERO.panda;
    heroDisc(ctx, x - s * 0.18, y - s * 0.62, s * 0.1, p.patch, s);
    heroDisc(ctx, x + s * 0.18, y - s * 0.62, s * 0.1, p.patch, s);
    heroDisc(ctx, x, y - s * 0.28, s * 0.3, p.fur, s);
    ctx.fillStyle = p.patch;
    ctx.beginPath();
    ctx.ellipse(x - s * 0.12, y - s * 0.32, s * 0.09, s * 0.07, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.12, y - s * 0.32, s * 0.09, s * 0.07, 0.4, 0, Math.PI * 2);
    ctx.fill();
    heroEyes(ctx, x, y - s * 0.32, s * 0.85);
    heroDisc(ctx, x - s * 0.22, y - s * 0.12, s * 0.08, p.patch, s);
    heroDisc(ctx, x + s * 0.22, y - s * 0.12, s * 0.08, p.patch, s);
    ctx.fillStyle = p.patch;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.18, s * 0.05, s * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    blush(ctx, x, y - s * 0.2, s);
  }
}

/** Top-down hero. `view` 'portrait' adds a candy disc behind the same sprite. */
export function drawAvatar(ctx, id, x, y, s, view = 'map', itemId) {
  const who = HERO[id] ? id : 'avery';
  ctx.save();
  if (view === 'portrait') {
    ctx.fillStyle = who === 'fox' || who === 'bunny' || who === 'owl' || who === 'panda'
      ? (HERO[who].fur || '#fff')
      : HERO[who].shirt;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.28, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (HERO[who].skin) drawKidHero(ctx, who, x, y, s, itemId);
  else drawAnimalHero(ctx, who, x, y + s * 0.04, s * 1.18);
  ctx.restore();
}

export function paintAnimal(canvas, kind, mood = 'scared') {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  drawAnimal(ctx, kind, w / 2, h * 0.58, Math.min(w, h) * 0.7, mood);
}
