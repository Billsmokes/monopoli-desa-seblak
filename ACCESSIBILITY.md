# Accessibility — Monopoli Desa Seblak

Monopoli Desa Seblak is an original property-trading board game set in the
fictional village of Desa Seblak. Players walk a 40-square loop, buy
snack-named places, build houses and hotels, draw village cards, and play
against 1–3 bot neighbours. The game runs entirely in the browser with no
build step and no network.

## Goals

Accessibility matters because games should be playable by as many people as
possible, including people who navigate by keyboard, use screen readers, or
rely on high-contrast and reduced-motion settings. Our target is to meet
**WCAG 2.2 Level AA** over time, as far as a canvas-based board game allows.

That target is an aim, not a conformance claim. No formal accessibility
audit or evaluation has been carried out yet, so we do not claim conformance
with any WCAG version or level.

## What this covers

- The game interface: title screen, board, dice, HUD, property cards,
  trade dialog, and results screen.
- Keyboard shortcuts for core actions: **Space** = roll the dice,
  **B** = buy, **Enter** = end turn, **T** = trade, **M** = mute.
- Sound is synthesised with WebAudio and can be muted at any time (M).

## Reporting an accessibility barrier

If you hit a barrier while playing Monopoli Desa Seblak, please open a
[GitHub Issue](https://github.com/Billsmokes/monopoli-desa-seblak/issues/new)
in this repository and add the `accessibility` label. If the label is not
available, put the word "accessibility" in the issue title.

You do **not** need to disclose a disability, and screenshots or recordings
are optional. The following details help us reproduce the problem:

- The screen or action affected (for example, "trade dialog" or "buying a
  property")
- What you expected to happen and what happened instead
- Browser and operating system
- Assistive technology used, if any (for example, a screen reader or
  keyboard-only navigation)

## What happens after you report

1. The maintainer acknowledges the issue and triages it.
2. The issue is tracked with the `accessibility` label, and status updates
   are posted on the issue as work progresses.
3. If a fix is made, the reporter is invited to verify it.

We aim to acknowledge reports promptly, but this is a one-maintainer project,
so triage and fix times vary.

## Supported environments

- Modern browsers: Chrome, Firefox, Safari, Edge (latest versions)
- Desktop (the game is designed for a desktop browser; mobile play has not
  been tested)

## Known limitations

- The board is rendered on a **canvas**, so screen readers cannot read the
  board state directly. The game has **not yet been tested with screen
  readers**, and there is currently no text alternative for the live board.
- Keyboard shortcuts cover the core actions (roll, buy, end turn, trade,
  mute), but **full keyboard-only play has not been verified** — some
  dialogs and board interactions may still need a mouse.
- Sound effects are synthesised and mutable, but there is no visual
  equivalent for every sound cue yet.
- This list will be updated as testing is done and issues are found.

## Contributor expectations

Contributors changing the game should:

- Keep the keyboard shortcuts working for every action that has one, and
  add a shortcut (or an equivalent reachable control) for new actions.
- Not rely on colour alone to convey meaning (for example, property
  ownership or card type).
- Keep text labels on buttons, dialogs, and HUD elements.
- Check their changes with a keyboard and, where possible, a screen reader,
  and note the results in the pull request.

## Ownership and feedback

This statement is maintained by **Billsmoke** (Billsmokes), the maintainer of
Monopoli Desa Seblak. Suggestions to improve this statement or the game's
accessibility practices are welcome as an Issue or a pull request.
