# Changelog

## [0.6.0] - admin console overview

### Added
- **Overview tab** in the admin console, now the default landing tab. Headline
  figures for members, channels, messages, and files, plus detail cards for the
  workspace breakdown, server build and uptime, online members, and database
  status. Refreshes automatically while open.

### Changed
- Admin console restructured to four tabs: **Overview**, **Members & roles**,
  **Backup & restore**, and **Integrations**.
- The former **System** tab is renamed **Backup & restore** - what it actually
  does.
- **Webhooks** and **Apps** are merged into a single **Integrations** tab with
  sub-tabs.

### Notes
- Requires the matching `rsmc-engine` v0.6.0 for the `/system/stats` endpoint.

## [0.5.0] - jump to message, channel mute

### Added
- **Jump to message** - clicking a search result or a pinned message now
  scrolls to that message in the conversation and briefly highlights it. If the
  message lives in a different channel, that channel opens first; if it's a
  thread reply, the thread panel opens instead. Older messages outside the
  loaded window are paged in automatically.
- **Mute channel** - a notifications toggle in channel settings silences a
  channel completely, including `@channel` broadcasts. Muted channels are
  dimmed in the sidebar, their unread badge is shown in a subdued style, and
  they no longer contribute to the Chat button's total count.

### Notes
- Requires the matching `rsmc-engine` v0.5.0 for the mute endpoint and the
  `muted` flag in the channel list.

## [0.4.0] — search, pins, broadcast mentions

### Added
- **Message search** — a search dialog (opened from the channel header) runs
  full-text search over messages, scoped to the current conversation or across
  all channels, with debounced typeahead results.
- **Pinned messages** — a pin action on each message, a "Pinned" marker on
  pinned messages, and a **Pins panel** (channel header) listing a channel's
  pinned messages with jump-to and unpin. Updates live via the message-updated
  event.
- **Broadcast mentions** — `@channel`, `@here`, and `@everyone` now appear in
  the composer's mention autocomplete, styled distinctly from user mentions.

### Notes
- Requires the matching `rsmc-engine` v0.4.0 for the search, pins, and broadcast
  endpoints/behavior.

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
