// Trade offers: valuation and the accept / counter / decline logic.
// Both the bot heuristics (bots.js) and the human trade dialog read this.

import { propertyValue, setCompletingSquare } from './board.js';

// Value of an offer from the receiver's point of view.
// offer = { giveMoney, giveSquares, wantSquare }
export function offerValue(board, offer) {
  return offer.giveMoney + offer.giveSquares.reduce((s, i) => s + propertyValue(board, i), 0);
}

export function evaluateOffer(board, receiverIndex, offer) {
  const wantValue = propertyValue(board, offer.wantSquare);
  const giveValue = offerValue(board, offer);
  // A square that completes the receiver's set is worth more to them.
  const completesReceiverSet = setCompletingSquare(board, receiverIndex, offer.wantSquare);
  const fair = completesReceiverSet ? wantValue * 0.9 : wantValue * 1.1;
  if (giveValue >= fair) return 'accept';
  // Close enough to haggle over.
  if (giveValue >= wantValue * 0.8) return 'counter';
  return 'decline';
}

// A counter-offer: same squares, but the receiver asks for more money.
export function counterOffer(offer, askMore) {
  return {
    giveMoney: offer.giveMoney + askMore,
    giveSquares: offer.giveSquares.slice(),
    wantSquare: offer.wantSquare,
  };
}
