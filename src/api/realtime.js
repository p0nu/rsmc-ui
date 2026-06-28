// ---------------------------------------------------------------------------
// Realtime client for /api/v1/ws. Connects with the access token in the query
// string (browsers can't set WS auth headers), auto-reconnects with backoff,
// re-subscribes to known channels, and pings every 25s. Frame handlers register
// via on(type, fn); connection status via onStatus(fn).
// ---------------------------------------------------------------------------

const PING_MS = 25_000;

export class Realtime {
  constructor() {
    this.ws = null;
    this.token = null;
    this.status = "idle"; // idle | connecting | open | closed
    this.handlers = new Map();
    this.statusHandlers = new Set();
    this.subs = new Set();
    this.attempts = 0;
    this.pingTimer = null;
    this.reconnectTimer = null;
    this.closing = false;
  }

  connect(token) {
    this.token = token;
    this.closing = false;
    this._open();
  }

  _open() {
    if (!this.token) return;
    this._setStatus("connecting");
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    const url = `${scheme}://${location.host}/api/v1/ws?token=${encodeURIComponent(this.token)}`;
    let ws;
    try {
      ws = new WebSocket(url);
    } catch {
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      this._setStatus("open");
      for (const c of this.subs) this._send({ type: "subscribe", channel_id: c });
      this._startPing();
    };
    ws.onmessage = (e) => {
      let frame;
      try {
        frame = JSON.parse(e.data);
      } catch {
        return;
      }
      this._emit(frame.type, frame);
      this._emit("*", frame);
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      this._stopPing();
      this._setStatus("closed");
      if (!this.closing) this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (this.closing) return;
    clearTimeout(this.reconnectTimer);
    this.attempts += 1;
    const delay = Math.min(1000 * 2 ** (this.attempts - 1), 15_000);
    this.reconnectTimer = setTimeout(() => this._open(), delay);
  }

  _startPing() {
    this._stopPing();
    this.pingTimer = setInterval(() => this._send({ type: "ping" }), PING_MS);
  }
  _stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  subscribe(id) {
    this.subs.add(id);
    this._send({ type: "subscribe", channel_id: id });
  }
  unsubscribe(id) {
    this.subs.delete(id);
    this._send({ type: "unsubscribe", channel_id: id });
  }
  typing(id) {
    this._send({ type: "typing", channel_id: id });
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }
  onStatus(fn) {
    this.statusHandlers.add(fn);
    fn(this.status);
    return () => this.statusHandlers.delete(fn);
  }
  _emit(type, frame) {
    const set = this.handlers.get(type);
    if (set) for (const fn of set) fn(frame);
  }
  _setStatus(s) {
    this.status = s;
    for (const fn of this.statusHandlers) fn(s);
  }

  close() {
    this.closing = true;
    clearTimeout(this.reconnectTimer);
    this._stopPing();
    if (this.ws) this.ws.close();
    this.ws = null;
    this.subs.clear();
  }
}
