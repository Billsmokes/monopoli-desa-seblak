# Monopoli Desa Seblak

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Billsmokes/monopoli-desa-seblak/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Billsmokes/monopoli-desa-seblak/reward.svg)](https://make.fun/c/best-game-01)

An original property-trading board game set in the fictional village of
**Desa Seblak**. Walk the 40-square loop, buy snack-named places (Pasar
Cireng, Sawah Combro, Jembatan Batagor…), build houses and hotels, draw
Kartu Kejutan Desa and Kartu Warga, dodge the Pos Ronda, and become the
richest villager — against 1–3 bot neighbours.

This is an original game with original names, art and sounds. It is not
affiliated with, and does not copy, any published board game.

## How to play

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser. No build step,
no network — every script, sound and pixel is a file in `game/`.

- **Title screen:** pick Quick Match (first to Rp4.500 net worth) or
  Classic (last player standing), choose 2–4 players, press Start.
- **Your turn:** click **Lempar Dadu** (or press Space). Your token walks
  the board step by step. Land on an unowned place to buy it (B), pay rent
  on someone else's, draw a card, pay tax, or get sent to Pos Ronda.
- **Build:** own a full colour set, then use **Bangun Rumah** — 4 houses,
  then a hotel. Rent grows with every house.
- **Trade:** use **Tawar-menawar** to offer a bot money and/or properties
  for one of theirs. Bots accept fair deals, counter close ones, and
  refuse cheap ones.
- **Pos Ronda (jail):** pay the Rp50 fine, roll doubles, or use a Surat
  Bebas Ronda to get out. Three failed turns and you pay the fine.
- **Win:** Quick Match ends the moment someone reaches Rp4.500 net worth;
  Classic ends when one player is left standing. Bankruptcy returns your
  properties to the bank.

Controls: mouse for everything, plus **Space** = roll, **B** = buy,
**Enter** = end turn, **T** = trade, **M** = mute. Sound is synthesised
with WebAudio — no audio files.

## Layout

```
game/
  index.html        page + canvas shell
  src/
    config.js       board data: 40 squares, card decks, tuning, palette
    random.js       seeded RNG (mulberry32) + shuffles
    input.js        mouse / keyboard → logical game actions
    audio.js        WebAudio sound effects, synthesised only
    board.js        ownership, rent, colour sets, houses, net worth
    cards.js        chance / community decks and effects
    bots.js         bot heuristics: buy, build, jail, trade
    trade.js        trade valuation and accept / counter / decline
    render.js       canvas board, tokens, dice, HUD, popups, screens
    shots.js        deterministic ?shot= states for screenshots
    main.js         game loop, state machine and turn flow
```

## Screenshots

Taken from the game itself in headless Chromium (see `shots.json`):

1. `1-title.jpg` — title screen with mode and player select
2. `2-play.jpg` — mid-game board, tokens, dice, HUD and property card
3. `3-card.jpg` — a Kartu Kejutan Desa popup mid-game
4. `4-results.jpg` — winner screen with final standings and restart

## Entry

Built for the make.fun bounty **best-game-01** ("Make the best game").
`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with
the vendored library in `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
