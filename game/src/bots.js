// Bot heuristics: buy, build, jail and trade decisions.
// Bots play the same rules as the human, with a short visible delay handled
// by main.js — this file only decides WHAT a bot does.

import { SQUARES } from './config.js';
import { canBuildHouse, houseCost, ownedSquares, propertyValue, setCompletingSquare } from './board.js';
import { evaluateOffer } from './trade.js';

const CASH_RESERVE = 120; // bots keep this much back for rent and fines

export function botShouldBuy(board, player, squareIndex) {
  const sq = SQUARES[squareIndex];
  if (!sq.price) return false;
  const completes = setCompletingSquare(board, player.index, squareIndex);
  const reserve = completes ? 40 : CASH_RESERVE;
  return player.money - sq.price >= reserve;
}

// Pick the cheapest buildable house on a full set, if the bot can afford it
// and still keep a reserve. Returns a square index, or -1.
export function botBuildChoice(board, player) {
  const owned = ownedSquares(board, player.index);
  let best = -1;
  let bestCost = Infinity;
  for (const i of owned) {
    if (!canBuildHouse(board, player.index, i)) continue;
    const cost = houseCost(i);
    if (cost < bestCost && player.money - cost >= 200) {
      best = i;
      bestCost = cost;
    }
  }
  return best;
}

// Jail: pay the fine when rich or on the last turn, otherwise try the dice.
export function botPaysJailFine(player) {
  return player.money > 400 || player.jailTurns >= 2;
}

// Trade: accept, counter or decline an offer aimed at this bot.
// offer = { giveMoney, giveSquares, wantSquare }
export function botTradeResponse(board, bot, offer) {
  const verdict = evaluateOffer(board, bot.index, offer);
  if (verdict === 'accept') return { decision: 'accept' };
  if (verdict === 'counter') {
    const wantValue = propertyValue(board, offer.wantSquare);
    const giveValue = offer.giveMoney + offer.giveSquares.reduce((s, i) => s + propertyValue(board, i), 0);
    const askMore = Math.max(25, Math.round((wantValue - giveValue) * 0.5));
    return { decision: 'counter', askMore };
  }
  return { decision: 'decline' };
}

// Which square would this bot most like to buy from a human, for a rare
// bot-to-bot / bot-to-human nudge (kept simple: only set-completing ones).
export function botWantsSquare(board, bot, ownerIndex) {
  const owned = ownedSquares(board, ownerIndex);
  for (const i of owned) {
    if (setCompletingSquare(board, bot.index, i)) return i;
  }
  return -1;
}
