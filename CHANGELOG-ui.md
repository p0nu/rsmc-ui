# Changelog

## [0.12.0] - accessibility contrast, workspace menu, profile popover, name display

### Added
- **Workspace menu.** The "RSMC" wordmark in the sidebar header is now a menu
  with Browse channels, Invite people (copies the app URL for open signup), and
  About. This replaces the standalone search icon in the sidebar header, which
  was easy to confuse with the message-search icon, so browsing channels and
  searching messages are no longer two identical-looking icons.
- **Profile popover.** Clicking a message author's name or avatar in a channel,
  a member's avatar in the channel members list, or the person's name in a
  direct-message header, opens a small card with their avatar, online or
  last-seen status, full name, @username, email, and (except in a DM you're
  already in) a Message button that opens a direct message.
- **Name display setting.** A new General tab in the admin console lets an admin
  choose whether channel message authors are shown by full name or by username.
  The setting applies to channel messages only; direct messages and the members
  list are unchanged.

### Changed
- **"Full name" instead of "Display name".** The signup and profile fields are
  now labelled "Full name", which is clearer and less easily confused with the
  username.
- **User name display in people lists.** People pickers (new direct message, and
  the add-member search) now show `Full name @username` on one line, with the
  `@username` omitted when it would just repeat the name (so a user with no full
  name shows only their username, not `user1 @user1`). The channel members list
  (the roster) now shows just `@username` to stay uncluttered, with Owner/Admin
  badges beside it. This replaces the earlier mashed-together `Name@username`.
- **Muted text contrast.** The muted text color (`--ink-3`), used for sidebar
  channel names, system messages, attachment filenames and rail labels, was
  below the WCAG AA contrast ratio (4.5:1) in both light and dark themes. It is
  now darkened (light) and lightened (dark) to meet AA, while staying visually
  muted. High-contrast themes were already compliant and are unchanged.

## [0.11.0] - uploads, lightbox, join/leave messages, and quality-of-life

### Added
- **Drag-and-drop and paste to upload.** Drop files anywhere over the channel
  (a "Drop files to upload" overlay appears), or paste an image straight into
  the composer, to attach them. Files dropped outside the app no longer open in
  a new tab.
- **Image lightbox.** Clicking an inline image opens it full-screen in an overlay
  (click or Escape to close) instead of opening a new browser tab.
- **Copy message.** A copy action in the message hover toolbar copies the message
  text to the clipboard.
- **Join/leave messages.** System messages ("`<name>` joined the channel", "left",
  or "was removed") render as a quiet, centered line with no author or actions.

### Fixed
- **Active sessions error state.** A failed load of the sessions list now shows a
  clear error with a Retry action, instead of silently reading as "No active
  sessions".
- **Sign-in screen theming.** The auth screen now uses the app's base surface and
  text colors so it stays consistent with the rest of the product, including in
  dark mode.

## [0.10.1] - composer fixes

### Fixed
- Added the missing emoji picker to the main message field (a smiley button in the composer opens a quick-emoji popover; picks insert at the cursor).
- Fixed the text field staying expanded after sending a multi-line message; it now returns to its normal size once the message is sent.

## [0.10.0] - security & privacy UI, accessibility, and unread surfacing

### Added
- **Security & Privacy modal.** A new surface (opened via the lock icon in the
  profile) for the 0.10.0 account features: MFA enrollment with a scannable QR
  code (via the zero-dependency `qrcode-generator`) plus manual-key fallback,
  enable/disable; active-session list with per-device revoke and revoke-all; and
  GDPR data export (JSON download) and account deletion.
- **MFA login challenge.** When a sign-in returns a second-factor challenge, the
  auth view prompts for the 6-digit code and completes login on success.
- **Admin audit log tab.** A viewer in the admin console listing recorded actions
  (when / action / actor / target / details) with an action filter.
- **Notification settings.** Per-user server-side toggles (broadcast, thread
  replies, DMs) plus client-side sound and desktop-notification controls.
- **Accessibility cluster.** Colorblind-safe status palette (Okabe-Ito derived
  hues, kept conventions, light and dark), redundant shape encoding for the
  presence dot (filled = online, hollow ring = offline) with ARIA labels, a
  high-contrast theme on an orthogonal axis, px-to-rem conversion, and a
  Small/Default/Large font-scale control.
- **Unread in the tab title.** The browser tab shows an unread count
  ("(3) RSMC") so activity is visible from another tab.

### Changed
- **Status shown in one place.** A user's custom status now appears in the DM
  header (live-updated) rather than being repeated next to every message.
- **Active-channel unread respects tab visibility.** While the tab is hidden, the
  open channel accumulates unread and shows its badge; on refocus it is marked
  read and clears. Messages arriving while the tab is hidden are no longer
  silently marked read.

### Fixed
- **Composer no longer clipped by the verification banner.** The channel screen
  fills the space left after the banner instead of claiming full height, so the
  message input and Send button stay visible for unverified users.

### Notes
- Requires **rsmc-engine v0.10.0** for MFA, sessions, GDPR, audit, and metrics.
- Run `npm install` to pick up the new `qrcode-generator` dependency.

## [0.9.0] - email flow support and resilient realtime reconnect

### Added
- **Email flow API.** Client methods for email verification, password reset
  (request and confirm), and email change (request and confirm), targeting the
  engine's 0.9.0 endpoints.

### Fixed
- **Realtime reconnect uses the freshest token.** The WebSocket client now reads
  the current access token on every reconnect via a token provider, so a socket
  that drops after the access token was refreshed reconnects with the new token
  instead of a stale one (closing an idle-expiry edge case that could leave the
  presence dot grey).

### Notes
- Requires **rsmc-engine v0.9.0** for the email endpoints.

## [0.8.0] - search filters, quick switcher, resilient sends, and pagination

### Added
- **Search filters.** The search dialog accepts `from:name`, `in:#channel`,
  `has:file`, and `after:`/`before:` date operators (shown as inline hints), and
  passes them through to the engine so results narrow by author, channel,
  attachments, and date range.
- **Quick switcher.** Cmd/Ctrl+K opens a keyboard-first switcher to jump to any
  channel or DM by typing; arrow keys and Enter navigate, Esc closes.
- **Edit last message with Up arrow.** Pressing Up in an empty composer opens
  your most recent message for editing.

### Changed
- **Paginated member and pin lists.** The members hook and pins panel read the
  new `{ members|pins, next_cursor }` shape (with a fallback to the old array
  form), so large channels load without pulling everything at once.
- **Send failures are recoverable.** A failed send (network error, rate limit,
  server error) now keeps your text and shows an inline Retry instead of losing
  the message. Rate-limited sends surface a friendly "try again in Ns" message
  from the engine's `Retry-After`.

### Notes
- Requires **rsmc-engine v0.8.0** for the search operators, pagination shapes,
  and rate-limit responses.

## [0.7.0] - lifecycle, status, scheduling, drafts, avatars, and polish

### Added
- **Channel archival** - an archive/unarchive toggle in channel settings
  (admins, not DMs) with a confirm prompt. Archived channels show an "Archived"
  badge in the header and a read-only composer explaining the channel is
  archived. Archived channels are hidden from the sidebar by default.
- **Browse & join** - the Browse Channels dialog is now a real public-channel
  directory with member counts and Join / Open actions; joining opens the
  channel.
- **Custom status** - a status editor in your profile (emoji + text, one-tap
  presets, and a clear button). A status badge shows next to the author's name
  on their messages, and DM peers' statuses propagate live.
- **Scheduled messages** - a clock button in the composer opens a schedule
  popover (in 1 hour / tomorrow 9am / Monday 9am / custom time). A **Scheduled**
  side panel (clock icon in the channel header) lists pending scheduled messages
  with a cancel action.
- **Drafts** - the composer auto-saves an unsent draft per channel and restores
  it when you return; sending or scheduling clears it.
- **Markdown rendering** - messages render **bold**, *italic*, ~~strike~~,
  `inline code`, code fences, blockquotes, lists, auto-linked URLs, and
  highlighted @mentions, via a safe, dependency-free renderer (no
  `dangerouslySetInnerHTML`).
- **Uploaded avatars** - your profile now takes a real image upload
  (change / remove) instead of an avatar URL field.

### Changed
- Membership rosters update live from `member_joined` / `member_left` events.
- Message authors, DM peers, and member lists patch in place on
  `profile_updated` and `status_changed`, so name/avatar/status changes appear
  without a reload.
- DM headers and the conversation intro now show the peer's avatar instead of a
  bare dot/@ glyph.
- The collapsed-sidebar toggle in the channel header uses a hamburger (menu)
  icon instead of the misleading back-arrow.

### Fixed
- Late-loading images no longer push the latest messages out of view: a
  `ResizeObserver` keeps the conversation pinned to the bottom when content
  height changes, coordinated with "load older" so the two don't fight.
- Presence dots now update for other users (paired with the engine's presence
  broadcast fix).

### Notes
- Requires the matching **`rsmc-engine` v0.7.0** for the archival, status,
  scheduled-message, draft, and avatar endpoints and the new realtime events.

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
