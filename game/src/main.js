// Monopoli Desa Seblak — game loop, state machine and turn flow.
// Owns the whole game state; render.js only draws it, bots.js only decides.

import { SQUARES, PLAYER_DEFS, START_MONEY_QUICK, START_MONEY_CLASSIC, QUICK_TARGET, GO_SALARY, JAIL_FINE, JAIL_TURNS_MAX } from './config.js';
import { makeRng, rollDie, seedFromUrl } from './random.js';
import { newBoardState, rentFor, netWorth, ownedSquares, canBuildHouse, houseCost, ownsFullSet } from './board.js';
import { newDeck, drawCard } from './cards.js';
import { CHANCE_CARDS, COMMUNITY_CARDS } from './config.js';
import { sfx, setMuted } from './audio.js';
import { bindInput } from './input.js';
import { drawGame, computeHotspots } from './render.js';
import { botShouldBuy, botBuildChoice, botPaysJailFine, botTradeResponse } from './bots.js';
import { applyShot } from './shots.js';

export const game = {
  screen: 'title',
  mode: 'quick',
  playerCount: 4,
  players: [],
  current: 0,
  phase: 'roll',
  dice: [3, 4],
  doublesCount: 0,
  board: newBoardState(),
  chanceDeck: null,
  communityDeck: null,
  log: [],
  popup: null,
  tradeOpen: false,
  trade: { target: -1, wantSquare: -1, giveMoney: 0, giveSquares: [], response: null },
  buildOpen: false,
  winner: null,
  turnCount: 0,
  hint: '',
  soundOn: true,
  rng: makeRng(seedFromUrl()),
  epoch: 0,
  pendingCard: null,
};

export function pushLog(msg) {
  game.log.push(msg);
  if (game.log.length > 40) game.log.shift();
}

function after(ms, fn) {
  const epoch = game.epoch;
  setTimeout(() => {
    if (game.epoch === epoch) fn();
  }, ms);
}

export function newPlayer(def, index, money) {
  return {
    index,
    name: def.name,
    token: def.token,
    color: def.color,
    human: def.human,
    money,
    pos: 0,
    inJail: false,
    jailTurns: 0,
    jailCard: 0,
    bankrupt: false,
  };
}

export function startGame() {
  game.epoch++;
  const money = game.mode === 'quick' ? START_MONEY_QUICK : START_MONEY_CLASSIC;
  game.players = PLAYER_DEFS.slice(0, game.playerCount).map((def, i) => newPlayer(def, i, money));
  game.current = 0;
  game.phase = 'roll';
  game.dice = [3, 4];
  game.doublesCount = 0;
  game.board = newBoardState();
  game.chanceDeck = newDeck(game.rng, CHANCE_CARDS);
  game.communityDeck = newDeck(game.rng, COMMUNITY_CARDS);
  game.log = [];
  game.popup = null;
  game.tradeOpen = false;
  game.trade = { target: -1, wantSquare: -1, giveMoney: 0, giveSquares: [], response: null };
  game.buildOpen = false;
  game.winner = null;
  game.turnCount = 0;
  game.screen = 'play';
  game.hint = 'Giliranmu! Lempar dadu untuk mulai.';
  pushLog(`🎲 Permainan dimulai! Mode ${game.mode === 'quick' ? 'Quick Match' : 'Classic'} — ${game.playerCount} pemain.`);
  pushLog(`💰 Semua pemain mulai dengan Rp${money}.`);
  maybeBotAct();
}

// --- money ---------------------------------------------------------------
function payAmount(player, amount, toPlayer) {
  const paid = Math.min(amount, player.money);
  player.money -= paid;
  if (toPlayer) toPlayer.money += paid;
  return paid;
}

function checkBankruptcy(player) {
  if (player.money > 0 || player.bankrupt) return false;
  player.bankrupt = true;
  for (let i = 0; i < SQUARES.length; i++) {
    if (game.board.owner[i] === player.index) {
      game.board.owner[i] = -1;
      game.board.houses[i] = 0;
    }
  }
  pushLog(`💸 ${player.name} BANGKRUT! Semua propertinya kembali ke bank.`);
  sfx.bad();
  if (player.human) {
    const alive = game.players.filter((p) => !p.bankrupt);
    const winner = alive.sort((a, b) => netWorth(game.board, b) - netWorth(game.board, a))[0];
    endGame(winner);
    return true;
  }
  return checkWin();
}

export function checkWin() {
  const alive = game.players.filter((p) => !p.bankrupt);
  if (alive.length === 1) {
    endGame(alive[0]);
    return true;
  }
  if (game.mode === 'quick') {
    const rich = alive.filter((p) => netWorth(game.board, p) >= QUICK_TARGET);
    if (rich.length > 0) {
      rich.sort((a, b) => netWorth(game.board, b) - netWorth(game.board, a));
      endGame(rich[0]);
      return true;
    }
  }
  return false;
}

function endGame(winner) {
  game.winner = winner;
  game.screen = 'over';
  game.phase = 'over';
  game.popup = null;
  game.tradeOpen = false;
  game.buildOpen = false;
  pushLog(`🏆 ${winner.name} memenangkan permainan!`);
  if (winner.human) sfx.win();
  else sfx.bad();
}

// --- dice & movement -------------------------------------------------------
export function rollDice() {
  const me = game.players[game.current];
  if (!me || game.phase !== 'roll') return;
  game.phase = 'rolling';
  game.hint = 'Dadu berputar…';
  sfx.dice();
  after(750, () => {
    const d1 = rollDie(game.rng);
    const d2 = rollDie(game.rng);
    game.dice = [d1, d2];
    pushLog(`🎲 ${me.name} melempar ${d1} + ${d2} = ${d1 + d2}.`);
    if (me.inJail) {
      resolveJailRoll(me, d1, d2);
      return;
    }
    const isDouble = d1 === d2;
    if (isDouble) {
      game.doublesCount++;
      if (game.doublesCount >= 3) {
        pushLog(`🎲🎲🎲 Tiga dadu ganda berturut-turut! ${me.name} kena razia.`);
        sendToJail(me);
        finishLanding(me, false);
        return;
      }
      pushLog(`🎲 Dadu ganda! ${me.name} boleh lempar lagi nanti.`);
    } else {
      game.doublesCount = 0;
    }
    moveSteps(me, d1 + d2, isDouble);
  });
}

function moveSteps(player, steps, isDouble) {
  game.phase = 'moving';
  let remaining = steps;
  const step = () => {
    if (remaining <= 0) {
      land(player, isDouble);
      return;
    }
    player.pos = (player.pos + 1) % 40;
    if (player.pos === 0) {
      player.money += GO_SALARY;
      pushLog(`🏛️ ${player.name} lewat Balai Desa, terima gaji Rp${GO_SALARY}.`);
      sfx.coin();
    }
    remaining--;
    after(170, step);
  };
  step();
}

function sendToJail(player) {
  player.pos = 10;
  player.inJail = true;
  player.jailTurns = 0;
  game.doublesCount = 0;
  sfx.jail();
}

function resolveJailRoll(me, d1, d2) {
  if (d1 === d2) {
    me.inJail = false;
    me.jailTurns = 0;
    game.doublesCount = 0;
    pushLog(`🔓 ${me.name} lempar ganda — bebas dari Pos Ronda!`);
    moveSteps(me, d1 + d2, false);
  } else {
    me.jailTurns++;
    if (me.jailTurns >= JAIL_TURNS_MAX) {
      payAmount(me, JAIL_FINE, null);
      me.inJail = false;
      me.jailTurns = 0;
      pushLog(`💸 ${me.name} sudah 3 giliran di Pos Ronda — bayar denda Rp${JAIL_FINE} dan keluar.`);
      if (checkBankruptcy(me)) return;
      moveSteps(me, d1 + d2, false);
    } else {
      pushLog(`🚔 ${me.name} gagal lempar ganda di Pos Ronda (giliran ${me.jailTurns}/3).`);
      finishLanding(me, false);
    }
  }
}

// --- landing ---------------------------------------------------------------
function land(player, isDouble, depth = 0) {
  if (depth > 3) {
    finishLanding(player, isDouble);
    return;
  }
  const sq = SQUARES[player.pos];
  pushLog(`📍 ${player.name} berhenti di ${sq.name}.`);
  if (sq.kind === 'property' || sq.kind === 'transport' || sq.kind === 'utility') {
    const owner = game.board.owner[player.pos];
    if (owner === -1) {
      openBuy(player);
      return;
    }
    if (owner === player.index) {
      pushLog(`🏠 ${sq.name} milikmu sendiri. Santai saja.`);
      finishLanding(player, isDouble);
      return;
    }
    const rent = rentFor(game.board, player.pos, game.dice[0] + game.dice[1]);
    const ownerPlayer = game.players[owner];
    const paid = payAmount(player, rent, ownerPlayer);
    pushLog(`💰 ${player.name} bayar sewa Rp${paid} ke ${ownerPlayer.name} (${sq.name}).`);
    sfx.coin();
    if (checkBankruptcy(player)) return;
    checkWin();
    finishLanding(player, isDouble);
    return;
  }
  if (sq.kind === 'chance' || sq.kind === 'community') {
    const deck = sq.kind === 'chance' ? game.chanceDeck : game.communityDeck;
    const card = drawCard(deck, game.rng);
    game.popup = { kind: 'card', card, deck: sq.kind, landDepth: depth, isDouble };
    game.phase = 'card';
    game.pendingCard = { card, depth, isDouble };
    sfx.card();
    pushLog(`🃏 ${player.name} mengambil ${sq.kind === 'chance' ? 'Kartu Kejutan Desa' : 'Kartu Warga'}: ${card.title}.`);
    maybeBotAct();
    return;
  }
  if (sq.kind === 'tax') {
    const paid = payAmount(player, sq.amount, null);
    pushLog(`🧾 ${player.name} bayar ${sq.name} Rp${paid}.`);
    sfx.bad();
    if (checkBankruptcy(player)) return;
    finishLanding(player, isDouble);
    return;
  }
  if (sq.kind === 'gotojail') {
    pushLog(`🚔 ${player.name} kena razia! Dibawa ke Pos Ronda.`);
    sendToJail(player);
    finishLanding(player, false);
    return;
  }
  // go, jail (just visiting), parking: nothing happens
  finishLanding(player, isDouble);
}

function openBuy(player) {
  const sq = SQUARES[player.pos];
  game.popup = { kind: 'buy', square: player.pos };
  game.phase = 'buy';
  game.hint = `${sq.name} — Rp${sq.price}. Beli atau lewati?`;
  if (!player.human) {
    after(800, () => {
      if (game.phase !== 'buy' || game.popup?.kind !== 'buy') return;
      if (botShouldBuy(game.board, player, player.pos)) buyProperty(player);
      else {
        pushLog(`🤔 ${player.name} tidak membeli ${sq.name}.`);
        closeBuy(player, false);
      }
    });
  }
}

export function buyProperty(player) {
  const sq = SQUARES[player.pos];
  player.money -= sq.price;
  game.board.owner[player.pos] = player.index;
  pushLog(`🏠 ${player.name} membeli ${sq.name} seharga Rp${sq.price}!`);
  sfx.buy();
  closeBuy(player, true);
  checkWin();
}

function closeBuy(player, bought) {
  game.popup = null;
  const wasDouble = game.doublesCount > 0 && game.dice[0] === game.dice[1];
  finishLanding(player, wasDouble);
}

function finishLanding(player, isDouble) {
  if (game.screen !== 'play') return;
  if (isDouble && !player.inJail && !player.bankrupt) {
    game.phase = 'roll';
    game.hint = 'Dadu ganda! Lempar lagi.';
    maybeBotAct();
    return;
  }
  game.phase = 'after';
  game.hint = player.human ? 'Selesai giliran, atau tawar-menawar / bangun dulu.' : `${player.name} menyelesaikan gilirannya…`;
  maybeBotAct();
}

// --- cards -----------------------------------------------------------------
export function dismissCard() {
  const pending = game.pendingCard;
  game.popup = null;
  game.pendingCard = null;
  if (!pending) {
    game.phase = 'after';
    maybeBotAct();
    return;
  }
  const player = game.players[game.current];
  const { card, depth, isDouble } = pending;
  const e = card.effect;
  if (e.type === 'money') {
    if (e.amount >= 0) {
      player.money += e.amount;
      pushLog(`💰 ${player.name} terima Rp${e.amount}.`);
      sfx.coin();
    } else {
      const paid = payAmount(player, -e.amount, null);
      pushLog(`💸 ${player.name} bayar Rp${paid}.`);
      if (checkBankruptcy(player)) return;
    }
    checkWin();
    finishLanding(player, isDouble);
  } else if (e.type === 'collectAll') {
    for (const other of game.players) {
      if (other.index === player.index || other.bankrupt) continue;
      const paid = payAmount(other, e.amount, player);
      pushLog(`🤝 ${other.name} membayar Rp${paid} ke ${player.name}.`);
      if (checkBankruptcy(other)) return;
    }
    sfx.coin();
    checkWin();
    finishLanding(player, isDouble);
  } else if (e.type === 'jailCard') {
    player.jailCard++;
    pushLog(`📜 ${player.name} menyimpan Surat Bebas Ronda (${player.jailCard}).`);
    finishLanding(player, isDouble);
  } else if (e.type === 'jail') {
    sendToJail(player);
    finishLanding(player, false);
  } else if (e.type === 'goto') {
    const passedGo = e.square < player.pos;
    player.pos = e.square;
    if (passedGo) {
      player.money += GO_SALARY;
      pushLog(`🏛️ ${player.name} lewat Balai Desa, terima gaji Rp${GO_SALARY}.`);
    }
    land(player, isDouble, depth + 1);
  } else if (e.type === 'move') {
    let steps = e.steps;
    while (steps > 0) {
      player.pos = (player.pos + 1) % 40;
      if (player.pos === 0) player.money += GO_SALARY;
      steps--;
    }
    while (steps < 0) {
      player.pos = (player.pos + 39) % 40;
      steps++;
    }
    land(player, isDouble, depth + 1);
  } else {
    finishLanding(player, isDouble);
  }
}

// --- jail choices ------------------------------------------------------------
export function jailPayFine() {
  const me = game.players[game.current];
  if (!me || game.phase !== 'jail') return;
  payAmount(me, JAIL_FINE, null);
  me.inJail = false;
  me.jailTurns = 0;
  game.popup = null;
  pushLog(`💸 ${me.name} bayar denda Rp${JAIL_FINE} dan keluar dari Pos Ronda.`);
  if (checkBankruptcy(me)) return;
  game.phase = 'roll';
  game.hint = 'Kamu bebas! Lempar dadu.';
  maybeBotAct();
}

export function jailUseCard() {
  const me = game.players[game.current];
  if (!me || game.phase !== 'jail' || me.jailCard <= 0) return;
  me.jailCard--;
  me.inJail = false;
  me.jailTurns = 0;
  game.popup = null;
  pushLog(`📜 ${me.name} memakai Surat Bebas Ronda dan keluar!`);
  game.phase = 'roll';
  game.hint = 'Kamu bebas! Lempar dadu.';
  maybeBotAct();
}

export function jailRollDice() {
  const me = game.players[game.current];
  if (!me || game.phase !== 'jail') return;
  game.popup = null;
  game.phase = 'roll';
  rollDice();
}

// --- end turn ---------------------------------------------------------------
export function endTurn() {
  const me = game.players[game.current];
  if (!me || game.phase !== 'after') return;
  game.doublesCount = 0;
  game.tradeOpen = false;
  game.buildOpen = false;
  let next = game.current;
  for (let k = 0; k < game.players.length; k++) {
    next = (next + 1) % game.players.length;
    if (!game.players[next].bankrupt) break;
  }
  if (next === 0 || next < game.current) game.turnCount++;
  game.current = next;
  const p = game.players[next];
  pushLog(`➡️ Giliran ${p.name}.`);
  if (p.inJail) {
    game.phase = 'jail';
    game.popup = { kind: 'jail' };
    game.hint = `${p.name} sedang di Pos Ronda.`;
    if (!p.human) {
      after(900, () => {
        if (game.phase !== 'jail') return;
        if (p.jailCard > 0 && p.money < 300) jailUseCard();
        else if (botPaysJailFine(p)) jailPayFine();
        else jailRollDice();
      });
    }
  } else {
    game.phase = 'roll';
    game.hint = p.human ? 'Giliranmu! Lempar dadu.' : `${p.name} bersiap melempar dadu…`;
  }
  maybeBotAct();
}

// --- bots --------------------------------------------------------------------
function maybeBotAct() {
  const me = game.players[game.current];
  if (!me || me.human || me.bankrupt || game.screen !== 'play') return;
  if (game.phase === 'roll') {
    after(850, () => {
      if (game.phase === 'roll' && game.players[game.current] === me) rollDice();
    });
  } else if (game.phase === 'card') {
    after(1100, () => {
      if (game.phase === 'card' && game.players[game.current] === me) dismissCard();
    });
  } else if (game.phase === 'after') {
    after(900, () => {
      if (game.phase !== 'after' || game.players[game.current] !== me) return;
      const sq = botBuildChoice(game.board, me);
      if (sq >= 0) {
        const cost = houseCost(sq);
        me.money -= cost;
        game.board.houses[sq]++;
        const level = game.board.houses[sq];
        pushLog(`🏠 ${me.name} membangun ${level === 5 ? 'hotel' : 'rumah'} di ${SQUARES[sq].name} (Rp${cost}).`);
        sfx.build();
        checkWin();
        after(700, () => {
          if (game.phase === 'after' && game.players[game.current] === me) endTurn();
        });
        return;
      }
      endTurn();
    });
  }
}

// --- trade -------------------------------------------------------------------
export function openTrade() {
  game.tradeOpen = true;
  game.trade = { target: -1, wantSquare: -1, giveMoney: 0, giveSquares: [], response: null };
}

export function closeTrade() {
  game.tradeOpen = false;
  game.trade.response = null;
}

export function sendTradeOffer() {
  const me = game.players[game.current];
  const t = game.trade;
  if (t.target < 0 || t.wantSquare < 0) return;
  const bot = game.players[t.target];
  const offer = { giveMoney: t.giveMoney, giveSquares: t.giveSquares.slice(), wantSquare: t.wantSquare };
  const res = botTradeResponse(game.board, bot, offer);
  t.response = res;
  if (res.decision === 'accept') {
    pushLog(`🤝 ${bot.name} menerima tawaranmu!`);
    sfx.buy();
    after(900, () => {
      if (!game.tradeOpen) return;
      applyTrade(me, bot, offer);
      closeTrade();
    });
  } else if (res.decision === 'counter') {
    pushLog(`🤔 ${bot.name} menawar balik: minta tambah Rp${res.askMore}.`);
  } else {
    pushLog(`❌ ${bot.name} menolak tawaranmu.`);
    sfx.bad();
  }
}

export function acceptCounter() {
  const me = game.players[game.current];
  const t = game.trade;
  if (!t.response || t.response.decision !== 'counter') return;
  const bot = game.players[t.target];
  const offer = {
    giveMoney: t.giveMoney + t.response.askMore,
    giveSquares: t.giveSquares.slice(),
    wantSquare: t.wantSquare,
  };
  if (me.money < offer.giveMoney) {
    pushLog(`💸 Uangmu tidak cukup untuk tawaran balik Rp${offer.giveMoney}.`);
    t.response = null;
    return;
  }
  pushLog(`🤝 Kamu menerima tawaran balik ${bot.name}.`);
  sfx.buy();
  applyTrade(me, bot, offer);
  closeTrade();
}

function applyTrade(me, bot, offer) {
  game.board.owner[offer.wantSquare] = me.index;
  for (const sqIdx of offer.giveSquares) game.board.owner[sqIdx] = bot.index;
  me.money -= offer.giveMoney;
  bot.money += offer.giveMoney;
  pushLog(`🔄 ${me.name} mendapat ${SQUARES[offer.wantSquare].name} dari ${bot.name}.`);
  checkWin();
}

// --- build -------------------------------------------------------------------
export function buildHouse(squareIndex) {
  const me = game.players[game.current];
  if (!me || !canBuildHouse(game.board, me.index, squareIndex)) return;
  const cost = houseCost(squareIndex);
  if (me.money < cost) {
    pushLog(`💸 Uangmu tidak cukup untuk membangun (butuh Rp${cost}).`);
    return;
  }
  me.money -= cost;
  game.board.houses[squareIndex]++;
  const level = game.board.houses[squareIndex];
  pushLog(`🏠 ${me.name} membangun ${level === 5 ? 'hotel' : `rumah ke-${level}`} di ${SQUARES[squareIndex].name} (Rp${cost}).`);
  sfx.build();
  checkWin();
}

// --- input -------------------------------------------------------------------
function hitHotspot(x, y) {
  const hs = computeHotspots(game);
  for (let i = hs.length - 1; i >= 0; i--) {
    const h = hs[i];
    if (h.enabled && x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h.id;
  }
  return null;
}

export function handleClick(x, y) {
  const id = hitHotspot(x, y);
  if (!id) return;
  const me = game.players[game.current];
  if (id === 'sound') {
    game.soundOn = !game.soundOn;
    setMuted(!game.soundOn);
    return;
  }
  if (game.screen === 'title') {
    if (id === 'mode-quick') game.mode = 'quick';
    else if (id === 'mode-classic') game.mode = 'classic';
    else if (id.startsWith('count-')) game.playerCount = Number(id.split('-')[1]);
    else if (id === 'start') {
      sfx.click();
      startGame();
    }
    return;
  }
  if (game.screen === 'over') {
    if (id === 'again') startGame();
    else if (id === 'to-title') {
      game.epoch++;
      game.screen = 'title';
      game.phase = 'roll';
    }
    return;
  }
  // play screen
  if (game.tradeOpen) {
    handleTradeClick(id);
    return;
  }
  if (game.buildOpen) {
    if (id === 'build-close') game.buildOpen = false;
    else if (id.startsWith('build-')) buildHouse(Number(id.split('-')[1]));
    return;
  }
  if (id === 'roll') rollDice();
  else if (id === 'buy' && game.popup?.kind === 'buy') buyProperty(me);
  else if (id === 'pass' && game.popup?.kind === 'buy') closeBuy(me, false);
  else if (id === 'end') endTurn();
  else if (id === 'trade') openTrade();
  else if (id === 'build') game.buildOpen = true;
  else if (id === 'card-ok') dismissCard();
  else if (id === 'jail-pay') jailPayFine();
  else if (id === 'jail-roll') jailRollDice();
  else if (id === 'jail-card') jailUseCard();
}

function handleTradeClick(id) {
  const t = game.trade;
  if (id.startsWith('trade-partner-')) {
    t.target = Number(id.split('-')[2]);
    t.wantSquare = -1;
    t.giveSquares = [];
    t.response = null;
  } else if (id.startsWith('trade-want-')) {
    t.wantSquare = Number(id.split('-')[2]);
    t.response = null;
  } else if (id.startsWith('trade-give-')) {
    const sqIdx = Number(id.split('-')[2]);
    const k = t.giveSquares.indexOf(sqIdx);
    if (k >= 0) t.giveSquares.splice(k, 1);
    else t.giveSquares.push(sqIdx);
    t.response = null;
  } else if (id === 'trade-money-minus') {
    t.giveMoney = Math.max(0, t.giveMoney - 25);
    t.response = null;
  } else if (id === 'trade-money-plus') {
    const me = game.players[game.current];
    t.giveMoney = Math.min(me.money, t.giveMoney + 25);
    t.response = null;
  } else if (id === 'trade-send') sendTradeOffer();
  else if (id === 'trade-cancel') closeTrade();
  else if (id === 'trade-accept-counter') acceptCounter();
  else if (id === 'trade-decline-counter') t.response = null;
}

export function handleKey(key) {
  if (key === 'm') {
    game.soundOn = !game.soundOn;
    setMuted(!game.soundOn);
    return;
  }
  if (game.screen === 'title') {
    if (key === 'enter' || key === 'space') startGame();
    return;
  }
  if (game.screen === 'over') {
    if (key === 'enter' || key === 'space') startGame();
    return;
  }
  if (key === 'escape') {
    game.tradeOpen = false;
    game.buildOpen = false;
    return;
  }
  const me = game.players[game.current];
  if (!me || !me.human) return;
  if (game.tradeOpen || game.buildOpen) return;
  if (key === 'space' && game.phase === 'roll') rollDice();
  else if (key === 'b' && game.phase === 'buy') buyProperty(me);
  else if (key === 'enter' && game.phase === 'after') endTurn();
  else if (key === 'enter' && game.popup?.kind === 'card') dismissCard();
  else if (key === 't' && (game.phase === 'roll' || game.phase === 'after')) openTrade();
}

// --- boot ----------------------------------------------------------------------
function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  bindInput(canvas, { click: handleClick, key: handleKey });
  // Exposed for automated play-testing only; the game never reads it.
  window.__game = game;
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) applyShot(game, shot);
  const loop = () => {
    try {
      drawGame(ctx, game);
    } catch (err) {
      // One bad frame must never freeze the game: log it and keep going.
      console.error('render error', err);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', boot);
