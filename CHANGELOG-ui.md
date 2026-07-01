# Changelog

## [0.3.0] — read-receipt indicators

### Added
- **Read receipts** — the message view now shows who has read your latest
  message. Direct messages show **"Seen"**; group channels show **"Seen by N"**
  with the reader names on hover. Indicators update in realtime.
- Receipts are seeded on channel open from `GET /channels/:id/receipts` and kept
  current from the `read` WebSocket event.

### Changed
- Removed the unused `unreadCount()` API wrapper. The Chat-button count has been
  derived from per-channel unread counts since 0.2.0, so the wrapper was dead
  and only invited reintroducing the retired pattern.

### Notes
- Requires the matching `rsmc-engine` v0.3.0 (or newer) for the receipts
  endpoint and the `read` event.

## [0.2.0]

### Added
- **Message reactions** UI, **unread badges** and a **"new messages" divider**,
  **@mention autocomplete** in the composer, and **desktop notifications**
  surfaced from realtime notification events.

## [0.1.0]

### Added
- Initial React/Vite frontend: channels, direct messages, threads, file
  attachments, presence, and the admin surface, talking to `rsmc-engine` over
  REST + WebSocket.
