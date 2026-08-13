# RSMC

**RSMC** is a modern team-collaboration client, channels, direct messages,
threads, file sharing, presence, notifications, two-factor auth, and an admin
console, built as a single-page React app on top of the
[`rsmc-engine`](../rsmc-engine) backend.

<p align="center">
  <img src="docs/rsmc-admin-1.png" width="49%" alt="RSMC admin console" />
  <img src="docs/rsmc-admin-2.png" width="49%" alt="RSMC admin audit log" />
  <br/>
  <img src="docs/rsmc-user-1.png" width="49%" alt="RSMC channel view" />
  <img src="docs/rsmc-user-2.png" width="49%" alt="RSMC direct messages" />
</p>

---

> **Status:** v0.10.0 is feature-complete and in testing. It builds and runs, but
> the newer flows (MFA, sessions, data export/delete) still need broad hands-on
> testing across browsers and devices. Requires `rsmc-engine` v0.10.0.

**Highlights:** a full chat surface (channels, DMs, threads, files, reactions,
presence) plus a Cmd/Ctrl+K quick switcher and message search, a Security &
Privacy area (two-factor auth, active sessions, GDPR export/delete), a five-tab
admin console, notification preferences, and an accessibility cluster
(colorblind-safe palette, high-contrast mode, adjustable text size). Light and
dark themes throughout.

## Quick start

RSMC is a frontend; it needs the [`rsmc-engine`](https://github.com/p0nu/rsmc-engine) backend running.

**1. Start the backend.** RSMC needs a running `rsmc-engine` on
`http://localhost:8080`. Start it however you like, the engine's own README
covers the prebuilt binary, Docker Compose, and from-source options. The quickest
is Docker Compose from the `rsmc-engine` directory:

```bash
docker compose up --build
# engine listens on http://localhost:8080
```

**2. Get RSMC and start it.**

You need [Node.js](https://nodejs.org/en/download) (any current LTS release) for
`npm`. Then clone the repo, install dependencies, and start the dev server:

```bash
git clone https://github.com/p0nu/rsmc-ui.git
cd rsmc-ui
npm install
npm run dev
# open http://localhost:5173
```

The Vite dev server proxies `/api`, the WebSocket, `/healthz`, and `/readyz` to
the backend, so the browser talks to a single origin with no CORS setup.

**3. Create the first account.** The first person to sign up becomes the
workspace **admin** automatically (this is enforced by the engine). Everyone who
signs up afterward is a **member**.

### Pointing at a different backend

```bash
VITE_PROXY_TARGET=http://192.168.1.50:8080 npm run dev
```

### Production build

```bash
npm run build      # outputs static assets to dist/
npm run preview    # serve the built bundle locally
```

Serve `dist/` from any static host. In production, put RSMC and the engine
behind the same origin (or configure the engine's `CORS_ORIGINS`) so `/api`
resolves to the backend.

---

## Roles & permissions (why a second user "can't do much")

This is intended behavior from the backend, and RSMC now surfaces it clearly
instead of hiding it. There are two independent layers:

**System roles** (workspace-wide):

| Role | Can do |
| --- | --- |
| **admin** | Everything: manage users & roles, deactivate accounts, manage workspace webhooks, plus all member abilities. The first signup is admin. |
| **member** | Create channels, send messages, upload files, read, manage their own messages. |
| **guest** | Send and read messages, manage their own messages. Cannot create channels or upload files. |

**Channel roles** (per channel membership):

| Role | Can do |
| --- | --- |
| **owner** | The channel's creator. Edit the channel, add/remove members, create channel-scoped webhooks. |
| **admin** | Same channel-management abilities as owner. |
| **member** | Participate (read, post, reply, react) only. |

So a second user who is a plain **member** of the workspace and a plain
**member** of a channel genuinely cannot add others to that channel or change
roles - that requires being the channel owner/admin or a workspace admin. In
RSMC:

- The **Members** panel shows an explanatory note and hides the add/remove
  controls when you lack channel-admin rights.
- **Create channel** is blocked with a message for guests.
- The **Admin** console only appears in the rail for workspace admins, and
  refuses to render for anyone else.

To give another user more power, sign in as an admin → **Admin → Members &
roles** → change their role, or have a channel owner add them and promote them.

### Admin console

The admin console (visible only to workspace admins) has five tabs:

- **Overview:** at-a-glance workspace stats (users, channels, messages) and instance health.
- **Members & roles:** search users, change system roles, deactivate and reactivate accounts. Deactivating ends the user's active sessions and blocks sign-in; reactivating restores access. You can't change your own role or deactivate yourself (prevents self-lockout).
- **Backup & restore:** create database backups and restore from them. Leave the path blank for an auto-named, timestamped dump, or specify a filename/path (constrained to the server's backups directory). Restore is destructive and asks for explicit confirmation. Requires the PostgreSQL client tools on the backend, which the provided Docker image installs.
- **Integrations:** create and manage outgoing webhooks (signed HTTP callbacks on message events), with a one-time signing-secret reveal. **Apps** are admin-curated quick links to your team's tools (GitHub, GitLab, etc.), one click away in the sidebar.
- **Audit log:** an append-only record of security-relevant actions (role changes, activate/deactivate, MFA enable/disable, account deletion) with an action filter.

### Settings, security, and themes

Click your avatar in the bottom-left rail. The **gear** icon opens **Settings**;
the **lock** icon opens **Security & Privacy**.

- **Settings** covers Appearance (Light / Dark / System theme, remembered per
  device), Notifications (which events notify you, plus sound and desktop
  alerts), and Accessibility (a high-contrast mode, adjustable text size, and a
  colorblind-safe palette that is on by default).
- **Security & Privacy** is where a user enables two-factor auth (scan a QR code
  with an authenticator app, or enter the key by hand), reviews and revokes their
  active sessions, and exercises data rights, export a copy of their data, or
  delete their account.

---

## Architecture

```
src/
  api/
    client.js        fetch wrapper: auth headers, JSON, transparent 401 refresh-retry
    endpoints.js     typed map of every rsmc-engine REST endpoint
    realtime.js      WebSocket client: reconnect/backoff, re-subscribe, heartbeat
  app/
    App.jsx          providers + gate (boot -> auth -> workspace)
  context/
    AuthContext.jsx  session, token storage, /users/me boot, socket lifecycle,
                     MFA login challenge
    ThemeContext.jsx theme, high-contrast, font scale, colorblind-safe palette
    ToastContext.jsx lightweight toast notifications
  hooks/
    useRealtime.js   subscribe to socket events / connection status
    useChannelMembers.js  member list + derived channel-admin rights
    useVisibility.js tab-visibility signal (drives unread while backgrounded)
  lib/
    permissions.js   mirrors the engine's authz rules (single source of truth for the UI)
    clientPrefs.js   per-device notification preferences
    notify.js        sound + desktop notifications
    format.js        names, timestamps, file sizes, mentions, avatar colors
  components/
    common/          Icon, Avatar, Modal/Loading/EmptyState/RoleBadge
    sidebar/         WorkspaceRail, Sidebar
    chat/            ChannelScreen, Header, MessageList, Message, Composer,
                     ThreadPanel, MembersPanel, FilesPanel
    modals/          CreateChannel, NewDirect, BrowseChannels, ChannelSettings,
                     Profile, Settings, Security, QuickSwitcher (Cmd/Ctrl+K),
                     Search
    admin/           AdminConsole (tab host), AdminOverview, AdminMembers,
                     AdminIntegrations, AdminWebhooks, AdminAppLinks,
                     AdminSystem, AdminBackup, AdminAudit
  views/
    AuthView.jsx     login / signup / MFA challenge
    Workspace.jsx    main coordinator (channels, presence, unread, modals)
  styles/
    base.css         design tokens + primitives (buttons, fields, badges, toasts)
    app.css          layout + every component's styles
```

### Design notes

- **No router.** RSMC is a single coordinated view (`Workspace`) that swaps
  between the chat surface and the admin console. This keeps state central and
  the bundle small; a router can be added later without restructuring.
- **`permissions.js` is the contract.** The UI never guesses. Every gated
  affordance asks the same helpers that mirror the engine, so the client and
  server agree on what's allowed.
- **Realtime is resilient.** The socket reconnects with backoff, re-subscribes
  to active channels, and sends heartbeats; the connection status is shown as a
  dot on the workspace rail.
- **API response shapes match the engine exactly** - status replies are
  `{ ok: true }`, unread is `{ unread: N }`, signup requires `display_name`, etc.

---

## Extending RSMC

The structure is built to grow:

- **New REST calls** → add to `src/api/endpoints.js`.
- **New realtime events** → handle in `src/api/realtime.js` consumers via
  `useRealtime(type, handler)`.
- **New permissions** → add a helper in `src/lib/permissions.js` and use it to
  gate UI; this keeps authorization logic in one place.
- **New admin tooling** → add a tab to `src/components/admin/AdminConsole.jsx`.
- **New side panels** (pinned items, search, channel info) → follow the
  `rightpanel` pattern used by `MembersPanel` / `FilesPanel` / `ThreadPanel`.
- **Theming** → all colors, type, spacing, and radii are CSS variables in
  `base.css`; a dark theme is a variable swap away.

---

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_PROXY_TARGET` | `http://localhost:8080` | Backend origin for the dev proxy. |

See `.env.example`. (Only build-time/dev variables are needed; RSMC reads
all runtime data from the backend.)

---

## Tech

React 18 · Vite 5 · plain CSS (no UI framework) · the browser `fetch` and
`WebSocket` APIs. No global state library - React context is enough for this
surface.
