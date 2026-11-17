// Canvas renderer: board, tokens, dice, HUD, popups and screens.
// All art is procedural (drawn shapes) — no image assets. The layout is a
// fixed 1280x800 logical canvas; input.js maps clicks back into it.

import { SQUARES, GROUPS, PALETTE, QUICK_TARGET, HOUSE_MAX } from './config.js';
import { netWorth, ownedSquares, rentFor, houseCost, canBuildHouse, ownsFullSet } from './board.js';

export const BX = 8; // board origin
export const BY = 8;
export const BS = 704; // board size
export const SQ = BS / 11; // square size (64)
export const PX = 724; // right panel x
export const PW = 548; // right panel width

// Square i -> {x, y, w, h} in logical coordinates. Index 0 (Balai Desa) is
// the bottom-right corner; the loop runs counter-clockwise.
export function squareRect(i) {
  if (i === 0) return { x: BX + 10 * SQ, y: BY + 10 * SQ, w: SQ, h: SQ };
  if (i < 10) return { x: BX + (10 - i) * SQ, y: BY + 10 * SQ, w: SQ, h: SQ };
  if (i === 10) return { x: BX, y: BY + 10 * SQ, w: SQ, h: SQ };
  if (i < 20) return { x: BX, y: BY + (20 - i) * SQ, w: SQ, h: SQ };
  if (i === 20) return { x: BX, y: BY, w: SQ, h: SQ };
  if (i < 30) return { x: BX + (i - 20) * SQ, y: BY, w: SQ, h: SQ };
  if (i === 30) return { x: BX + 10 * SQ, y: BY, w: SQ, h: SQ };
  return { x: BX + 10 * SQ, y: BY + (i - 30) * SQ, w: SQ, h: SQ };
}

// Rotation (radians) and band edge for each square's label.
function squareOrientation(i) {
  if (i === 0 || i < 10) return { rot: 0, band: 'bottom' };
  if (i === 10 || i < 20) return { rot: -Math.PI / 2, band: 'left' };
  if (i === 20 || i < 30) return { rot: 0, band: 'top' };
  return { rot: Math.PI / 2, band: 'right' };
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

function wrapName(name) {
  const words = name.split(' ');
  if (words.length <= 1) return [name];
  if (name.length <= 11) return [name];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

function drawDie(ctx, x, y, size, value, rolling) {
  ctx.save();
  ctx.translate(x, y);
  if (rolling) ctx.rotate((Math.random() - 0.5) * 0.3);
  roundRect(ctx, 0, 0, size, size, 8);
  ctx.fillStyle = '#fffdf5';
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  const p = size / 4;
  const c = size / 2;
  const spots = {
    1: [[c, c]],
    2: [[p, p], [size - p, size - p]],
    3: [[p, p], [c, c], [size - p, size - p]],
    4: [[p, p], [size - p, p], [p, size - p], [size - p, size - p]],
    5: [[p, p], [size - p, p], [c, c], [p, size - p], [size - p, size - p]],
    6: [[p, p], [size - p, p], [p, c], [size - p, c], [p, size - p], [size - p, size - p]],
  }[value] || [];
  ctx.fillStyle = '#c0392b';
  for (const [sx, sy] of spots) {
    ctx.beginPath();
    ctx.arc(sx, sy, size / 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- player tokens: simple drawn shapes -------------------------------
export function drawToken(ctx, x, y, r, token, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  if (token === 'chilli') {
    // red chilli pepper
    ctx.beginPath();
    ctx.ellipse(0, 2, r * 0.9, r * 0.55, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#5a8f4d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.4);
    ctx.quadraticCurveTo(r * 1.1, -r * 0.9, r * 0.5, -r * 1.0);
    ctx.stroke();
  } else if (token === 'coin') {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7a4d00';
    ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Rp', 0, 1);
  } else if (token === 'lantern') {
    roundRect(ctx, -r * 0.75, -r * 0.8, r * 1.5, r * 1.6, r * 0.4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(-r * 0.35, -r * 0.4, r * 0.7, r * 0.8);
    ctx.strokeStyle = '#8d5a2b';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.8);
    ctx.lineTo(0, -r * 1.15);
    ctx.stroke();
  } else {
    // cat
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.3);
    ctx.lineTo(-r * 0.45, -r * 1.05);
    ctx.lineTo(-r * 0.05, -r * 0.55);
    ctx.moveTo(r * 0.7, -r * 0.3);
    ctx.lineTo(r * 0.45, -r * 1.05);
    ctx.lineTo(r * 0.05, -r * 0.55);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3b2f23';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.1, r * 0.11, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.1, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- board -------------------------------------------------------------
function drawSquare(ctx, game, i) {
  const sq = SQUARES[i];
  const r = squareRect(i);
  const o = squareOrientation(i);
  ctx.save();
  ctx.fillStyle = PALETTE.board;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  // colour band on the outer edge (properties) / kind tint
  const bandH = 12;
  let bandColor = null;
  if (sq.kind === 'property') bandColor = GROUPS[sq.group].color;
  else if (sq.kind === 'transport') bandColor = '#5b7a99';
  else if (sq.kind === 'utility') bandColor = '#7a9e7e';
  else if (sq.kind === 'chance') bandColor = '#e8b23a';
  else if (sq.kind === 'community') bandColor = '#8fb8c9';
  else if (sq.kind === 'tax') bandColor = '#b0483e';
  if (bandColor) {
    ctx.fillStyle = bandColor;
    if (o.band === 'bottom') ctx.fillRect(r.x, r.y + r.h - bandH, r.w, bandH);
    else if (o.band === 'top') ctx.fillRect(r.x, r.y, r.w, bandH);
    else if (o.band === 'left') ctx.fillRect(r.x, r.y, bandH, r.h);
    else ctx.fillRect(r.x + r.w - bandH, r.y, bandH, r.h);
  }

  // owner strip on the inner edge
  const owner = game.board.owner[i];
  if (owner >= 0) {
    ctx.fillStyle = game.players[owner].color;
    if (o.band === 'bottom') ctx.fillRect(r.x + 4, r.y + 2, r.w - 8, 4);
    else if (o.band === 'top') ctx.fillRect(r.x + 4, r.y + r.h - 6, r.w - 8, 4);
    else if (o.band === 'left') ctx.fillRect(r.x + r.w - 6, r.y + 4, 4, r.h - 8);
    else ctx.fillRect(r.x + 2, r.y + 4, 4, r.h - 8);
  }

  // houses / hotel along the inner edge
  const level = game.board.houses[i];
  if (level > 0) {
    if (level === 5) {
      ctx.fillStyle = '#c0392b';
      if (o.band === 'bottom') ctx.fillRect(r.x + r.w / 2 - 12, r.y + 4, 24, 10);
      else if (o.band === 'top') ctx.fillRect(r.x + r.w / 2 - 12, r.y + r.h - 14, 24, 10);
      else if (o.band === 'left') ctx.fillRect(r.x + r.w - 14, r.y + r.h / 2 - 12, 10, 24);
      else ctx.fillRect(r.x + 4, r.y + r.h / 2 - 12, 10, 24);
    } else {
      ctx.fillStyle = '#2e7d32';
      for (let h = 0; h < level; h++) {
        if (o.band === 'bottom') ctx.fillRect(r.x + 8 + h * 12, r.y + 4, 9, 8);
        else if (o.band === 'top') ctx.fillRect(r.x + 8 + h * 12, r.y + r.h - 12, 9, 8);
        else if (o.band === 'left') ctx.fillRect(r.x + r.w - 12, r.y + 8 + h * 12, 8, 9);
        else ctx.fillRect(r.x + 4, r.y + 8 + h * 12, 8, 9);
      }
    }
  }

  // label, rotated to read from outside the board
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  ctx.rotate(o.rot);
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const isCorner = [0, 10, 20, 30].includes(i);
  const lines = wrapName(sq.name);
  ctx.font = `bold ${isCorner ? 11 : 9}px sans-serif`;
  const lh = isCorner ? 13 : 11;
  const startY = -(lines.length - 1) * lh / 2 + (sq.price ? -4 : 2);
  lines.forEach((line, k) => ctx.fillText(line, 0, startY + k * lh));
  if (sq.price) {
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#6b5a44';
    ctx.fillText(`Rp${sq.price}`, 0, startY + lines.length * lh - 1);
  } else if (sq.sub) {
    ctx.font = '8px sans-serif';
    ctx.fillStyle = '#6b5a44';
    ctx.fillText(sq.sub, 0, startY + lines.length * lh - 1);
  }
  ctx.restore();
}

function drawBoardCenter(ctx, game) {
  const x0 = BX + SQ;
  const y0 = BY + SQ;
  const w = BS - 2 * SQ;
  const h = BS - 2 * SQ;
  ctx.save();
  // sky + rice fields
  ctx.fillStyle = '#fdf6e3';
  ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(x0 + w - 90, y0 + 80, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8fbf6f';
  ctx.beginPath();
  ctx.moveTo(x0, y0 + h * 0.55);
  ctx.quadraticCurveTo(x0 + w * 0.3, y0 + h * 0.3, x0 + w * 0.55, y0 + h * 0.55);
  ctx.quadraticCurveTo(x0 + w * 0.8, y0 + h * 0.38, x0 + w, y0 + h * 0.55);
  ctx.lineTo(x0 + w, y0 + h);
  ctx.lineTo(x0, y0 + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6aa84f';
  ctx.fillRect(x0, y0 + h * 0.72, w, h * 0.28);
  ctx.strokeStyle = '#4e7d3a';
  ctx.lineWidth = 1.5;
  for (let r = 0; r < 3; r++) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + h * (0.76 + r * 0.07));
    ctx.lineTo(x0 + w, y0 + h * (0.76 + r * 0.07));
    ctx.stroke();
  }
  // little village houses
  const house = (hx, hy, s, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(hx, hy, s, s * 0.7);
    ctx.fillStyle = '#c96f3f';
    ctx.beginPath();
    ctx.moveTo(hx - s * 0.1, hy);
    ctx.lineTo(hx + s * 0.5, hy - s * 0.55);
    ctx.lineTo(hx + s * 1.1, hy);
    ctx.closePath();
    ctx.fill();
  };
  house(x0 + 70, y0 + h * 0.52, 44, '#f2e3c6');
  house(x0 + 150, y0 + h * 0.56, 36, '#e8d3a8');
  house(x0 + w - 190, y0 + h * 0.54, 40, '#f2e3c6');
  // river (kept left of the dice)
  ctx.strokeStyle = '#5fb3c9';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(x0 + w * 0.30, y0 + h * 0.62);
  ctx.quadraticCurveTo(x0 + w * 0.34, y0 + h * 0.8, x0 + w * 0.28, y0 + h);
  ctx.stroke();

  ctx.fillStyle = PALETTE.terracotta;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DESA SEBLAK', x0 + w / 2, y0 + 92);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('Monopoli Desa Seblak', x0 + w / 2, y0 + 128);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#6b5a44';
  ctx.fillText('Beli tanah, bangun rumah, jadi juragan desa!', x0 + w / 2, y0 + 152);

  // dice in the middle of the board
  const dSize = 52;
  const dx = x0 + w / 2 - dSize - 8;
  const dy = y0 + h - 150;
  const rolling = game.phase === 'rolling';
  const [d1, d2] = game.dice;
  drawDie(ctx, dx, dy, dSize, rolling ? 1 + Math.floor(Math.random() * 6) : d1, rolling);
  drawDie(ctx, dx + dSize + 16, dy, dSize, rolling ? 1 + Math.floor(Math.random() * 6) : d2, rolling);
  if (game.phase !== 'title') {
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = PALETTE.ink;
    const p = game.players[game.current];
    ctx.fillText(p ? `${p.name} melempar ${d1 + d2}` : '', x0 + w / 2, dy + dSize + 20);
  }
  ctx.restore();
}

function drawTokens(ctx, game) {
  const offsets = [
    [14, 14], [42, 14], [14, 42], [42, 42],
  ];
  for (const p of game.players) {
    if (p.bankrupt) continue;
    const r = squareRect(p.pos);
    const [ox, oy] = offsets[p.index % 4];
    drawToken(ctx, r.x + ox + 4, r.y + oy + 4, 11, p.token, p.color);
    if (p.inJail) {
      ctx.strokeStyle = '#3b2f23';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + ox - 2, r.y + oy - 2, 32, 32);
    }
  }
}

// --- right panel ---------------------------------------------------------
function drawPanel(ctx, game) {
  ctx.save();
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(PX, BY, PW, BS);
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(PX + 0.5, BY + 0.5, PW - 1, BS - 1);

  // title row
  ctx.fillStyle = PALETTE.terracotta;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MONOPOLI DESA SEBLAK', PX + 14, BY + 22);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#6b5a44';
  const modeLabel = game.mode === 'quick' ? `Quick Match · target Rp${QUICK_TARGET}` : 'Classic · terakhir bertahan menang';
  ctx.fillText(modeLabel, PX + 14, BY + 42);

  // turn banner
  const cur = game.players[game.current];
  ctx.fillStyle = cur ? cur.color : PALETTE.ink;
  roundRect(ctx, PX + 12, BY + 54, PW - 24, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(cur ? `Giliran: ${cur.name}${cur.inJail ? ' (di Pos Ronda)' : ''}` : '', PX + 22, BY + 70);
  ctx.textAlign = 'right';
  ctx.fillText(`Putaran ${game.turnCount + 1}`, PX + PW - 22, BY + 70);
  ctx.textAlign = 'left';

  // player HUD rows
  let y = BY + 96;
  for (const p of game.players) {
    const active = game.current === p.index && game.screen === 'play';
    ctx.fillStyle = active ? '#ffe9a8' : '#fffdf5';
    roundRect(ctx, PX + 12, y, PW - 24, 44, 6);
    ctx.fill();
    if (active) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    drawToken(ctx, PX + 34, y + 22, 12, p.token, p.color);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(p.name + (p.human ? ' ★' : ''), PX + 54, y + 15);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#6b5a44';
    const props = ownedSquares(game.board, p.index).length;
    ctx.fillText(`${props} properti · kekayaan Rp${netWorth(game.board, p)}`, PX + 54, y + 32);
    ctx.textAlign = 'right';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = p.bankrupt ? '#b0483e' : PALETTE.ink;
    ctx.fillText(p.bankrupt ? 'BANGKRUT' : `Rp${p.money}`, PX + PW - 22, y + 22);
    ctx.textAlign = 'left';
    y += 50;
  }

  // current square card
  const sq = SQUARES[game.players[game.current] ? game.players[game.current].pos : 0];
  const cardY = y + 4;
  ctx.fillStyle = '#fffdf5';
  roundRect(ctx, PX + 12, cardY, PW - 24, 96, 8);
  ctx.fill();
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  const bandCol = sq.kind === 'property' ? GROUPS[sq.group].color
    : sq.kind === 'transport' ? '#5b7a99'
    : sq.kind === 'utility' ? '#7a9e7e'
    : sq.kind === 'chance' ? '#e8b23a'
    : sq.kind === 'community' ? '#8fb8c9'
    : sq.kind === 'tax' ? '#b0483e' : PALETTE.terracotta;
  ctx.fillStyle = bandCol;
  roundRect(ctx, PX + 12, cardY, PW - 24, 22, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(sq.name.toUpperCase(), PX + 22, cardY + 12);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '12px sans-serif';
  const owner = sq.price !== undefined || sq.kind === 'property' ? game.board.owner[game.players[game.current].pos] : -1;
  let line1 = '';
  if (sq.kind === 'property') {
    const level = game.board.houses[game.players[game.current].pos];
    line1 = `Harga Rp${sq.price} · Sewa Rp${rentFor(game.board, game.players[game.current].pos, game.dice[0] + game.dice[1])}${level ? ` · ${level === 5 ? 'Hotel' : level + ' rumah'}` : ''} · Kelompok ${GROUPS[sq.group].name}`;
  } else if (sq.kind === 'transport') line1 = 'Harga Rp200 · Sewa Rp25 × jumlah angkot yang dimiliki';
  else if (sq.kind === 'utility') line1 = 'Harga Rp150 · Sewa = dadu × 4 (atau × 10 kalau dua-duanya)';
  else if (sq.kind === 'go') line1 = 'Lewat sini terima gaji Rp200.';
  else if (sq.kind === 'tax') line1 = `Bayar pajak Rp${sq.amount}.`;
  else if (sq.kind === 'jail') line1 = 'Mampir saja — atau ditahan di sini.';
  else if (sq.kind === 'parking') line1 = 'Istirahat. Tidak terjadi apa-apa.';
  else if (sq.kind === 'gotojail') line1 = 'Kena razia! Langsung ke Pos Ronda.';
  else line1 = 'Ambil kartu dan ikuti perintahnya.';
  ctx.fillText(line1, PX + 22, cardY + 42);
  let line2 = '';
  if (owner >= 0) line2 = `Milik ${game.players[owner].name}${owner === game.current ? ' (milikmu)' : ''}`;
  else if (sq.price) line2 = 'Belum dimiliki — bisa dibeli!';
  else line2 = sq.sub || '';
  ctx.fillStyle = '#6b5a44';
  ctx.fillText(line2, PX + 22, cardY + 62);
  const hint = game.hint || '';
  ctx.fillStyle = PALETTE.teal;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(hint, PX + 22, cardY + 82);

  // action buttons
  const btnY = cardY + 108;
  drawButtons(ctx, game, btnY);

  // event log
  const logY = btnY + 92;
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('JURNAL DESA', PX + 14, logY + 8);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#5a4a38';
  const lines = game.log.slice(-8);
  lines.forEach((line, k) => {
    ctx.fillText(line.length > 72 ? line.slice(0, 72) + '…' : line, PX + 14, logY + 28 + k * 17);
  });
  ctx.restore();
}

function button(ctx, h, label, enabled, primary) {
  ctx.save();
  ctx.fillStyle = !enabled ? '#d8cbb2' : primary ? PALETTE.terracotta : '#fffdf5';
  roundRect(ctx, h.x, h.y, h.w, h.h, 8);
  ctx.fill();
  ctx.strokeStyle = !enabled ? '#b99b6b' : primary ? '#a34d24' : PALETTE.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = !enabled ? '#9a8a72' : primary ? '#fff' : PALETTE.ink;
  ctx.font = `bold ${h.h >= 40 ? 15 : 13}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, h.x + h.w / 2, h.y + h.h / 2 + 1);
  ctx.restore();
}

// Hotspots: every clickable control, with its current enabled state.
// main.js hit-tests clicks against this list; render draws the same rects.
export function computeHotspots(game) {
  const hs = [];
  const add = (id, x, y, w, h, enabled = true) => hs.push({ id, x, y, w, h, enabled });
  if (game.screen === 'title') {
    add('mode-quick', 340, 470, 280, 48, true);
    add('mode-classic', 660, 470, 280, 48, true);
    add('count-2', 480, 540, 80, 44, true);
    add('count-3', 580, 540, 80, 44, true);
    add('count-4', 680, 540, 80, 44, true);
    add('start', 490, 610, 300, 56, true);
    add('sound', 1180, 16, 84, 32, true);
    return hs;
  }
  if (game.screen === 'over') {
    add('again', 490, 536, 300, 56, true);
    add('to-title', 490, 604, 300, 44, true);
    return hs;
  }
  // play screen
  const cardY = BY + 96 + game.players.length * 50 + 4;
  const btnY = cardY + 108;
  const bw = (PW - 24 - 16) / 3;
  const bx0 = PX + 12;
  const me = game.players[game.current];
  const myTurn = game.screen === 'play' && me && me.human && !me.bankrupt;
  const canRoll = myTurn && game.phase === 'roll';
  const canBuy = myTurn && game.phase === 'buy' && game.popup && game.popup.kind === 'buy'
    && me.money >= (SQUARES[game.popup.square].price || 0);
  const canEnd = myTurn && game.phase === 'after';
  add('roll', bx0, btnY, bw, 40, canRoll);
  add('buy', bx0 + bw + 8, btnY, bw, 40, canBuy);
  add('pass', bx0 + 2 * (bw + 8), btnY, bw, 40, canBuy);
  add('end', bx0, btnY + 48, bw, 40, canEnd);
  add('trade', bx0 + bw + 8, btnY + 48, bw, 40, myTurn && (game.phase === 'roll' || game.phase === 'after'));
  add('build', bx0 + 2 * (bw + 8), btnY + 48, bw, 40, myTurn && (game.phase === 'roll' || game.phase === 'after') && buildableCount(game) > 0);
  add('sound', PX + PW - 96, BY + 10, 84, 28, true);
  if (game.popup) {
    if (game.popup.kind === 'card') {
      add('card-ok', 490, 560, 300, 48, true);
    } else if (game.popup.kind === 'buy') {
      // buy/pass buttons above cover this; popup has no extra buttons
    } else if (game.popup.kind === 'jail') {
      add('jail-pay', 440, 540, 180, 48, me.money >= 50);
      add('jail-roll', 640, 540, 180, 48, true);
      if (me.jailCard > 0) add('jail-card', 490, 600, 300, 44, true);
    }
  }
  if (game.tradeOpen) {
    const bots = game.players.filter((p) => !p.human && !p.bankrupt);
    bots.forEach((b, k) => add(`trade-partner-${b.index}`, 340 + k * 130, 250, 120, 36, true));
    const target = game.trade.target >= 0 ? game.players[game.trade.target] : null;
    if (target) {
      ownedSquares(game.board, target.index).forEach((sqIdx, k) => {
        add(`trade-want-${sqIdx}`, 340, 300 + k * 30, 300, 26, true);
      });
      ownedSquares(game.board, me.index).forEach((sqIdx, k) => {
        add(`trade-give-${sqIdx}`, 660, 300 + k * 30, 300, 26, true);
      });
    }
    add('trade-money-minus', 340, 640, 44, 36, game.trade.giveMoney >= 25);
    add('trade-money-plus', 540, 640, 44, 36, true);
    add('trade-send', 700, 640, 130, 36, !!target && game.trade.wantSquare >= 0);
    add('trade-cancel', 850, 640, 110, 36, true);
    if (game.trade.response && game.trade.response.decision === 'counter') {
      add('trade-accept-counter', 490, 706, 180, 40, true);
      add('trade-decline-counter', 690, 706, 180, 40, true);
    }
  }
  if (game.buildOpen) {
    const buildable = buildableSquares(game);
    buildable.forEach((sqIdx, k) => {
      add(`build-${sqIdx}`, 860, 250 + k * 34, 110, 28, me.money >= houseCost(sqIdx));
    });
    add('build-close', 490, 640, 300, 44, true);
  }
  return hs;
}

function buildableSquares(game) {
  const me = game.players[game.current];
  if (!me) return [];
  return ownedSquares(game.board, me.index).filter((i) => canBuildHouse(game.board, me.index, i));
}

function buildableCount(game) {
  return buildableSquares(game).length;
}

function drawButtons(ctx, game, btnY) {
  const hs = computeHotspots(game);
  const labels = {
    roll: '🎲 Lempar Dadu',
    buy: 'Beli (B)',
    pass: 'Lewati',
    end: 'Selesai (Enter)',
    trade: 'Tawar-menawar',
    build: 'Bangun Rumah',
  };
  for (const h of hs) {
    if (!labels[h.id]) continue;
    button(ctx, h, labels[h.id], h.enabled, h.id === 'roll' || h.id === 'buy');
  }
  // sound toggle (the controls hint lives on the title screen and in the
  // square card, so nothing else is drawn under the buttons)
  const snd = hs.find((h) => h.id === 'sound');
  if (snd) button(ctx, snd, game.soundOn ? '🔊 Suara' : '🔇 Senyap', true, false);
}

// --- popups --------------------------------------------------------------
function overlay(ctx) {
  ctx.fillStyle = 'rgba(59,47,35,0.55)';
  ctx.fillRect(0, 0, 1280, 800);
}

function popupBox(ctx, x, y, w, h) {
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.terracotta;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawCardPopup(ctx, game) {
  const p = game.popup;
  overlay(ctx);
  popupBox(ctx, 340, 180, 600, 330);
  const card = p.card;
  const isChance = p.deck === 'chance';
  ctx.fillStyle = isChance ? '#e8b23a' : '#8fb8c9';
  roundRect(ctx, 340, 180, 600, 54, 14);
  ctx.fill();
  ctx.fillStyle = '#3b2f23';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isChance ? '🎲 KARTU KEJUTAN DESA' : '🏡 KARTU WARGA', 640, 214);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(card.title, 640, 290);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#5a4a38';
  const words = card.text.split(' ');
  let line = '';
  let ly = 330;
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 52) {
      ctx.fillText(line.trim(), 640, ly);
      line = w;
      ly += 24;
    } else line += ' ' + w;
  }
  ctx.fillText(line.trim(), 640, ly);
  const hs = computeHotspots(game);
  const ok = hs.find((h) => h.id === 'card-ok');
  if (ok) button(ctx, ok, game.players[game.current].human ? 'Lanjut' : '…', true, true);
  ctx.textAlign = 'left';
}

function drawJailPopup(ctx, game) {
  const me = game.players[game.current];
  overlay(ctx);
  popupBox(ctx, 340, 180, 600, 330);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🚔 Kamu di Pos Ronda!', 640, 240);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#5a4a38';
  ctx.fillText(`Giliran ke-${me.jailTurns + 1} dari ${3} di dalam pos ronda.`, 640, 280);
  ctx.fillText('Bayar denda Rp50, lempar dadu ganda, atau pakai surat bebas.', 640, 308);
  const hs = computeHotspots(game);
  for (const id of ['jail-pay', 'jail-roll', 'jail-card']) {
    const h = hs.find((x) => x.id === id);
    if (!h) continue;
    const label = id === 'jail-pay' ? 'Bayar Rp50' : id === 'jail-roll' ? 'Lempar Dadu' : `Pakai Surat (${me.jailCard})`;
    button(ctx, h, label, h.enabled, id === 'jail-roll');
  }
  ctx.textAlign = 'left';
}

function drawTradeDialog(ctx, game) {
  const t = game.trade;
  overlay(ctx);
  popupBox(ctx, 300, 100, 680, 650);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🤝 Tawar-menawar', 640, 160);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#5a4a38';
  ctx.fillText('Pilih lawan, lalu pilih 1 properti yang kamu mau dan tawarkan uang / propertimu.', 640, 188);
  const hs = computeHotspots(game);
  const bots = game.players.filter((p) => !p.human && !p.bankrupt);
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('Lawan:', 340, 240);
  for (const h of hs.filter((x) => x.id.startsWith('trade-partner-'))) {
    const b = game.players[Number(h.id.split('-')[2])];
    button(ctx, h, b.name, h.enabled, t.target === b.index);
  }
  const me = game.players[game.current];
  if (t.target >= 0) {
    const target = game.players[t.target];
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`Properti ${target.name} (klik 1 yang kamu mau):`, 340, 292);
    const wantHs = hs.filter((x) => x.id.startsWith('trade-want-'));
    wantHs.forEach((h) => {
      const sqIdx = Number(h.id.split('-')[2]);
      button(ctx, h, SQUARES[sqIdx].name, true, t.wantSquare === sqIdx);
    });
    if (wantHs.length === 0) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#6b5a44';
      ctx.fillText('(tidak punya properti)', 340, 316);
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Propertimu (klik untuk ditawarkan):', 660, 292);
    const giveHs = hs.filter((x) => x.id.startsWith('trade-give-'));
    giveHs.forEach((h) => {
      const sqIdx = Number(h.id.split('-')[2]);
      button(ctx, h, SQUARES[sqIdx].name, true, t.giveSquares.includes(sqIdx));
    });
    if (giveHs.length === 0) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#6b5a44';
      ctx.fillText('(belum punya properti)', 660, 316);
    }
  }
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`Uang yang ditawarkan: Rp${t.giveMoney}`, 340, 632);
  for (const id of ['trade-money-minus', 'trade-money-plus', 'trade-send', 'trade-cancel']) {
    const h = hs.find((x) => x.id === id);
    if (!h) continue;
    const label = id === 'trade-money-minus' ? '−25' : id === 'trade-money-plus' ? '+25' : id === 'trade-send' ? 'Kirim Tawaran' : 'Batal';
    button(ctx, h, label, h.enabled, id === 'trade-send');
  }
  if (t.response) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px sans-serif';
    if (t.response.decision === 'accept') {
      ctx.fillStyle = '#2e7d32';
      ctx.fillText('✅ Diterima! Properti bertukar tangan.', 640, 694);
    } else if (t.response.decision === 'counter') {
      ctx.fillStyle = '#a34d24';
      ctx.fillText(`🤔 ${game.players[t.target].name} minta tambah Rp${t.response.askMore}.`, 640, 694);
      const acc = hs.find((x) => x.id === 'trade-accept-counter');
      const dec = hs.find((x) => x.id === 'trade-decline-counter');
      if (acc) button(ctx, acc, 'Terima Tawaran Balik', true, true);
      if (dec) button(ctx, dec, 'Tolak', true, false);
    } else {
      ctx.fillStyle = '#b0483e';
      ctx.fillText('❌ Ditolak. Tawaranmu terlalu murah.', 640, 694);
    }
    ctx.textAlign = 'left';
  }
  ctx.textAlign = 'left';
}

function drawBuildDialog(ctx, game) {
  const me = game.players[game.current];
  overlay(ctx);
  popupBox(ctx, 340, 160, 600, 480);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏠 Bangun Rumah', 640, 200);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#5a4a38';
  ctx.fillText('Hanya di kelompok warna yang kamu kuasai penuh. 4 rumah lalu hotel.', 640, 228);
  const hs = computeHotspots(game);
  const list = buildableSquares(game);
  ctx.textAlign = 'left';
  list.forEach((sqIdx, k) => {
    const y = 250 + k * 34;
    const level = game.board.houses[sqIdx];
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '13px sans-serif';
    ctx.fillText(`${SQUARES[sqIdx].name} — ${level === 0 ? 'tanah kosong' : level === 5 ? 'hotel' : level + ' rumah'} · Rp${houseCost(sqIdx)}`, 360, y + 18);
    const h = hs.find((x) => x.id === `build-${sqIdx}`);
    if (h) button(ctx, h, level >= 4 ? 'Bangun Hotel' : 'Bangun', h.enabled, false);
  });
  if (list.length === 0) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#6b5a44';
    ctx.fillText('Belum ada kelompok warna yang kamu kuasai penuh.', 360, 280);
  }
  const close = hs.find((x) => x.id === 'build-close');
  if (close) button(ctx, close, 'Tutup', true, true);
  ctx.textAlign = 'left';
}

// --- screens ----------------------------------------------------------------
function drawTitle(ctx, game) {
  // village backdrop
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#8fbf6f';
  ctx.beginPath();
  ctx.moveTo(0, 560);
  ctx.quadraticCurveTo(320, 420, 640, 540);
  ctx.quadraticCurveTo(960, 660, 1280, 500);
  ctx.lineTo(1280, 800);
  ctx.lineTo(0, 800);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6aa84f';
  ctx.fillRect(0, 640, 1280, 160);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(1080, 120, 55, 0, Math.PI * 2);
  ctx.fill();
  // little houses along the bottom
  const house = (hx, hy, s, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(hx, hy, s, s * 0.7);
    ctx.fillStyle = '#c96f3f';
    ctx.beginPath();
    ctx.moveTo(hx - s * 0.1, hy);
    ctx.lineTo(hx + s * 0.5, hy - s * 0.55);
    ctx.lineTo(hx + s * 1.1, hy);
    ctx.closePath();
    ctx.fill();
  };
  house(80, 600, 90, '#f2e3c6');
  house(220, 620, 70, '#e8d3a8');
  house(980, 610, 80, '#f2e3c6');
  house(1100, 630, 60, '#e8d3a8');
  // tokens parade (below the Start button, above the hint lines)
  drawToken(ctx, 560, 692, 20, 'chilli', '#d64545');
  drawToken(ctx, 610, 692, 20, 'coin', '#e8a13a');
  drawToken(ctx, 660, 692, 20, 'lantern', '#2f7f7a');
  drawToken(ctx, 710, 692, 20, 'cat', '#7a5fc0');

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.terracotta;
  ctx.font = 'bold 76px sans-serif';
  ctx.fillText('MONOPOLI', 640, 190);
  ctx.fillText('DESA SEBLAK', 640, 268);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Beli tanah, bangun rumah, jadi juragan desa!', 640, 320);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#5a4a38';
  ctx.fillText('Lawan 1–3 warga desa (bot). Lempar dadu, kelilingi 40 petak,', 640, 352);
  ctx.fillText('kumpulkan sewa, dan jadilah yang terkaya di desa.', 640, 376);

  const hs = computeHotspots(game);
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('Mode permainan:', 340, 452);
  for (const id of ['mode-quick', 'mode-classic']) {
    const h = hs.find((x) => x.id === id);
    const label = id === 'mode-quick' ? '⚡ Quick Match' : '🏛️ Classic';
    button(ctx, h, label, true, (id === 'mode-quick') === (game.mode === 'quick'));
  }
  ctx.fillStyle = '#5a4a38';
  ctx.font = '13px sans-serif';
  ctx.fillText(game.mode === 'quick' ? 'Target: kekayaan Rp4.500 duluan — selesai dalam hitungan menit.' : 'Terakhir yang bertahan menang — permainan panjang.', 340, 536);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Jumlah pemain:', 340, 566);
  for (const n of [2, 3, 4]) {
    const h = hs.find((x) => x.id === `count-${n}`);
    button(ctx, h, `${n} pemain`, true, game.playerCount === n);
  }
  const start = hs.find((x) => x.id === 'start');
  button(ctx, start, '▶  MULAI BERMAIN', true, true);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5a4a38';
  ctx.font = '13px sans-serif';
  ctx.fillText('Spasi = lempar dadu · B = beli · Enter = selesai giliran · T = tawar-menawar · M = suara', 640, 744);
  ctx.fillText('Permainan orisinal bertema desa — bukan Monopoly Hasbro.', 640, 768);
  const snd = hs.find((x) => x.id === 'sound');
  if (snd) button(ctx, snd, game.soundOn ? '🔊 Suara' : '🔇 Senyap', true, false);
  ctx.textAlign = 'left';
}

function drawGameOver(ctx, game) {
  drawBoard(ctx, game);
  overlay(ctx);
  popupBox(ctx, 340, 90, 600, 560);
  const winner = game.winner;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8b23a';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('🏆', 640, 170);
  ctx.fillStyle = PALETTE.terracotta;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(winner ? `${winner.name.toUpperCase()} MENANG!` : 'PERMAINAN SELESAI', 640, 220);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '16px sans-serif';
  ctx.fillText(
    game.mode === 'quick'
      ? `Mencapai kekayaan Rp${QUICK_TARGET} duluan — juragan baru Desa Seblak!`
      : 'Terakhir yang bertahan di Desa Seblak!',
    640, 252,
  );
  // standings
  const rows = game.players.slice().sort((a, b) => netWorth(game.board, b) - netWorth(game.board, a));
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('KLASEMEN AKHIR', 640, 296);
  let y = 326;
  rows.forEach((p, k) => {
    ctx.fillStyle = p.bankrupt ? '#b0483e' : PALETTE.ink;
    ctx.font = '15px sans-serif';
    ctx.fillText(
      `${k + 1}. ${p.name} — Rp${p.money} · ${ownedSquares(game.board, p.index).length} properti · kekayaan Rp${netWorth(game.board, p)}${p.bankrupt ? ' (bangkrut)' : ''}`,
      640, y,
    );
    y += 28;
  });
  ctx.fillStyle = '#5a4a38';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Permainan berlangsung ${game.turnCount} putaran.`, 640, y + 10);
  const hs = computeHotspots(game);
  const again = hs.find((x) => x.id === 'again');
  const title = hs.find((x) => x.id === 'to-title');
  if (again) button(ctx, again, '↻  Main Lagi', true, true);
  if (title) button(ctx, title, 'Ke Menu Utama', true, false);
  ctx.textAlign = 'left';
}

function drawBoard(ctx, game) {
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(0, 0, 1280, 800);
  ctx.strokeStyle = '#8d6b3f';
  ctx.lineWidth = 3;
  ctx.strokeRect(BX - 2, BY - 2, BS + 4, BS + 4);
  for (let i = 0; i < 40; i++) drawSquare(ctx, game, i);
  drawBoardCenter(ctx, game);
  drawTokens(ctx, game);
}

export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, 1280, 800);
  if (game.screen === 'title') {
    drawTitle(ctx, game);
    return;
  }
  if (game.screen === 'over') {
    drawGameOver(ctx, game);
    return;
  }
  drawBoard(ctx, game);
  drawPanel(ctx, game);
  if (game.popup && game.popup.kind === 'card') drawCardPopup(ctx, game);
  else if (game.popup && game.popup.kind === 'jail') drawJailPopup(ctx, game);
  if (game.tradeOpen) drawTradeDialog(ctx, game);
  if (game.buildOpen) drawBuildDialog(ctx, game);
}
