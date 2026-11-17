// Card decks: Kartu Kejutan Desa (chance) and Kartu Warga (community).
// A deck is a shuffled pile; drawing the last card reshuffles it.

import { CHANCE_CARDS, COMMUNITY_CARDS } from './config.js';
import { shuffle } from './random.js';

export function newDeck(rng, cards) {
  return { pile: shuffle(rng, cards), discard: [] };
}

export function drawCard(deck, rng) {
  if (deck.pile.length === 0) {
    deck.pile = shuffle(rng, deck.discard);
    deck.discard = [];
  }
  const card = deck.pile.pop();
  deck.discard.push(card);
  return card;
}

// Human-readable effect line used in the log and the card popup.
export function describeEffect(card) {
  const e = card.effect;
  if (e.type === 'money') return e.amount > 0 ? `+Rp${e.amount}` : `−Rp${-e.amount}`;
  if (e.type === 'goto') return 'Pindah petak';
  if (e.type === 'move') return e.steps > 0 ? `Maju ${e.steps}` : `Mundur ${-e.steps}`;
  if (e.type === 'jail') return 'Ke Pos Ronda!';
  if (e.type === 'collectAll') return `Terima Rp${e.amount} dari tiap pemain`;
  if (e.type === 'jailCard') return 'Simpan kartu bebas ronda';
  return '';
}
