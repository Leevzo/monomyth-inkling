# Inkling — the phone glass

The King's app on the phone, at https://leevzo.github.io/monomyth-inkling/ (a clean copy of Orv, monomyth-orv).

- `index.html` — the app: THE ONE THING, the list (each word on its hex bracket, white until tapped), the crown as the brand
  (double-tap it: the share/save, a QR with Orv in its centre), Orv (bead-pattern 2: a one-pixel breath, sparks off the brass hand),
  Squatch (bead-pattern 3: the cigarette sparks climbing).
- `crown.html` — THE CROWN as the adjuster: drag up and down; the gems light from the heart; they follow with clicky lag;
  they change once a second.
- The kingdom travels only inside links, after the `#` (`#k=…`), which a phone never sends to any server. Nothing personal
  is in this repository. The app keeps its own drawer on the phone (`inkling.*`), apart from Orv's (`orv.*`); the key box is shared.
- `vendor/qrcode.js` — node-qrcode 1.5.4, MIT (`vendor/qrcode.LICENSE`).
- `squatch.html` — the writing inkling (2026-10-03). The script, the talk, and the sky. Squatch's own sprite, and the cigarette for settings.
  Hosted with the app, at https://leevzo.github.io/monomyth-inkling/squatch.html — it is a page, nothing on a server holds his words.
  The mouth is his own key's own door: the page calls Anthropic straight from the phone (anthropic-dangerous-direct-browser-access),
  the key read from the shared key box (monomyth.focus.byok.v1), never sent anywhere else. A key inside a sentence becomes [a key].
  The model is chosen from the door's own list and shared with Inkling (inkling.model). The desk is only a guest's seat and the cast.
- `squatch-desk.py` — the desk on this Mac. A guest at `/s/<token>` gets one scene, read only, and may send a note back. The king key is given only to 127.0.0.1. The store is `~/.kingdom/squatch-desk/`, not this repository.
