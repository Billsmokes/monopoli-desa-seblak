// Board model: ownership, rent, colour sets, houses and net worth.
// Pure logic — no drawing, no DOM — so the bots, the trade dialog and the
// screenshot states all read the same truth.

import { SQUARES, GROUP_SQUARES, TRANSPORT_SQUARES, UTILITY_SQUARES, GROUPS, HOUSE_MAX } from './config.js';

export function newBoardState() {
  return {
    // owner[square] = player index, or -1 for the bank
    owner: new Array(SQUARES.length).fill(-1),
    // houses[square] = 0..4 houses, 5 = hotel (properties only)
    houses: new Array(SQUARES.length).fill(0),
  };
}

// Rent multipliers by house level: 0 = bare, 1..4 houses, 5 = hotel.
const LEVEL_MULT = [1, 3, 5, 8, 12, 18];

export function rentFor(board, squareIndex, diceTotal) {
  const sq = SQUARES[squareIndex];
  if (sq.kind === 'property') {
    const level = board.houses[squareIndex];
    let rent = sq.rent * LEVEL_MULT[level];
    if (level === 0 && ownsFullSet(board, board.owner[squareIndex], sq.group)) rent *= 2;
    return rent;
  }
  if (sq.kind === 'transport') {
    const owned = TRANSPORT_SQUARES.filter((i) => board.owner[i] === board.owner[squareIndex]).length;
    return 25 * owned;
  }
  if (sq.kind === 'utility') {
    const owned = UTILITY_SQUARES.filter((i) => board.owner[i] === board.owner[squareIndex]).length;
    return diceTotal * (owned === 2 ? 10 : 4);
  }
  return 0;
}

export function ownsFullSet(board, playerIndex, group) {
  const squares = GROUP_SQUARES[group];
  return squares.every((i) => board.owner[i] === playerIndex);
}

export function groupOf(squareIndex) {
  return SQUARES[squareIndex].group;
}

export function houseCost(squareIndex) {
  const group = SQUARES[squareIndex].group;
  return group === undefined ? 0 : GROUPS[group].houseCost;
}

export function canBuildHouse(board, playerIndex, squareIndex) {
  const sq = SQUARES[squareIndex];
  if (sq.kind !== 'property') return false;
  if (board.owner[squareIndex] !== playerIndex) return false;
  if (!ownsFullSet(board, playerIndex, sq.group)) return false;
  const level = board.houses[squareIndex];
  if (level >= 5) return false;
  // Build evenly: never more than one level above the group's lowest.
  const levels = GROUP_SQUARES[sq.group].map((i) => board.houses[i]);
  return level <= Math.min(...levels);
}

export function propertyValue(board, squareIndex) {
  const sq = SQUARES[squareIndex];
  if (!sq.price) return 0;
  // Transports and utilities have a price but never carry houses.
  if (sq.kind !== 'property') return sq.price;
  return sq.price + board.houses[squareIndex] * houseCost(squareIndex);
}

// A player's net worth: cash + property prices + half the house money back.
export function netWorth(board, player) {
  let worth = player.money;
  for (let i = 0; i < SQUARES.length; i++) {
    if (board.owner[i] === player.index) {
      worth += SQUARES[i].price || 0;
      if (SQUARES[i].kind === 'property') {
        worth += Math.floor((board.houses[i] * houseCost(i)) / 2);
      }
    }
  }
  return worth;
}

export function ownedSquares(board, playerIndex) {
  const out = [];
  for (let i = 0; i < SQUARES.length; i++) {
    if (board.owner[i] === playerIndex) out.push(i);
  }
  return out;
}

export function countByKind(board, playerIndex, kind) {
  let n = 0;
  for (let i = 0; i < SQUARES.length; i++) {
    if (SQUARES[i].kind === kind && board.owner[i] === playerIndex) n++;
  }
  return n;
}

// Does this player own every square of the group except `exceptSquare`?
export function setCompletingSquare(board, playerIndex, squareIndex) {
  const sq = SQUARES[squareIndex];
  if (sq.kind !== 'property') return false;
  return GROUP_SQUARES[sq.group].every((i) => i === squareIndex || board.owner[i] === playerIndex);
}
