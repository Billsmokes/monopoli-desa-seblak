// Deterministic screenshot states (?shot=title|play|card|results&seed=1).
// Each builds a fixed, good-looking game state with the seeded RNG so the
// screenshots are reproducible and show the full loop: title, mid-game
// play, a chance-card popup, and the results screen.

import { CHANCE_CARDS, PLAYER_DEFS, START_MONEY_QUICK } from './config.js';
import { makeRng } from './random.js';
import { newBoardState, netWorth } from './board.js';
import { newDeck } from './cards.js';
import { COMMUNITY_CARDS } from './config.js';

function midGamePlayers(game) {
  const money = [1840, 2210, 1475, 980];
  const pos = [6, 24, 11, 31];
  game.players = PLAYER_DEFS.map((def, i) => ({
    index: i,
    name: def.name,
    token: def.token,
    color: def.color,
    human: def.human,
    money: money[i],
    pos: pos[i],
    inJail: false,
    jailTurns: 0,
    jailCard: i === 0 ? 1 : 0,
    bankrupt: false,
  }));
  game.board = newBoardState();
  // You own the whole Combro set (with houses) + one Seblak property;
  // bots own a spread of the rest, so the board reads as mid-game.
  const own = {
    0: [6, 8, 9, 21],
    1: [16, 18, 19, 26],
    2: [1, 3, 11, 13],
    3: [31, 32, 37],
  };
  for (const [p, squares] of Object.entries(own)) {
    for (const sq of squares) game.board.owner[sq] = Number(p);
  }
  game.board.houses[6] = 2;
  game.board.houses[8] = 2;
  game.board.houses[9] = 1;
  game.board.houses[16] = 1;
  game.board.houses[31] = 3;
}

function basePlay(game) {
  game.rng = makeRng(1);
  game.mode = 'quick';
  game.playerCount = 4;
  game.screen = 'play';
  game.current = 0;
  game.phase = 'roll';
  game.dice = [4, 3];
  game.doublesCount = 0;
  game.chanceDeck = newDeck(game.rng, CHANCE_CARDS);
  game.communityDeck = newDeck(game.rng, COMMUNITY_CARDS);
  game.turnCount = 14;
  game.popup = null;
  game.tradeOpen = false;
  game.buildOpen = false;
  game.winner = null;
  game.hint = 'Giliranmu! Lempar dadu untuk mulai.';
  midGamePlayers(game);
  game.log = [
    '🎲 Permainan dimulai! Mode Quick Match — 4 pemain.',
    '💰 Semua pemain mulai dengan Rp2000.',
    '🏠 Kamu membeli Sawah Combro seharga Rp100!',
    '🏠 Pak Darma membeli Bukit Peuyeum seharga Rp180.',
    '💰 Bu Ratna bayar sewa Rp16 ke Kamu (Sawah Combro).',
    '🃏 Mang Udin mengambil Kartu Kejutan Desa: Panen Raya!',
    '🏠 Kamu membangun rumah ke-2 di Sawah Combro (Rp50).',
    '🎲 Kamu melempar 4 + 3 = 7.',
  ];
}

export function applyShot(game, shot) {
  if (shot === 'title') {
    game.mode = 'quick';
    game.playerCount = 4;
    game.screen = 'title';
    return;
  }
  if (shot === 'play') {
    basePlay(game);
    return;
  }
  if (shot === 'card') {
    basePlay(game);
    game.players[0].pos = 7; // Kartu Kejutan Desa square
    game.phase = 'card';
    game.popup = { kind: 'card', card: CHANCE_CARDS[0], deck: 'chance', landDepth: 0, isDouble: false };
    game.pendingCard = { card: CHANCE_CARDS[0], depth: 0, isDouble: false };
    game.log.push('🃏 Kamu mengambil Kartu Kejutan Desa: Panen Raya!');
    return;
  }
  if (shot === 'results') {
    basePlay(game);
    game.players[0].money = 3900; // net worth 4565: above the Rp4500 Quick target
    game.players[1].money = 640;
    game.players[2].money = 210;
    game.players[3].money = 0;
    game.players[3].bankrupt = true;
    for (let i = 0; i < 40; i++) {
      if (game.board.owner[i] === 3) game.board.owner[i] = -1;
    }
    game.turnCount = 38;
    game.screen = 'over';
    game.phase = 'over';
    game.winner = game.players[0];
    game.popup = null;
    return;
  }
  // unknown ?shot= falls back to the plain title screen
  game.screen = 'title';
}

// Keep netWorth import used by future shot variants.
export { netWorth };
