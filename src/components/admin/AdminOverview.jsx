import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/endpoints.js";
import { useToast } from "../../context/ToastContext.jsx";
import { fileSize } from "../../lib/format.js";
import Icon from "../common/Icon.jsx";
import { Loading } from "../common/Modal.jsx";

// Formats a duration in seconds as a compact human string (e.g. "3d 4h", "12m").
function uptime(seconds) {
  if (!seconds || seconds < 0) return "just started";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

const num = (n) => (n ?? 0).toLocaleString();

export default function AdminOverview() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        setStats(await api.systemStats());
      } catch (e) {
        toast.error("Couldn't load system stats", e.message);
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load();
    // Refresh quietly so live figures (uptime, online users) stay current.
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !stats) {
    return (
      <div className="admin-panel">
        <Loading />
      </div>
    );
  }

  const w = stats?.workspace ?? {};
  const s = stats?.server ?? {};
  const d = stats?.database ?? {};
  const r = stats?.realtime ?? {};

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <span className="muted">
          Live workspace, server, and database figures. Refreshes automatically.
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => load()} title="Refresh">
          <Icon name="back" size={15} /> Refresh
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          icon="users"
          label="Members"
          value={num(w.users_active)}
          sub={w.users_deactivated > 0 ? `${num(w.users_deactivated)} deactivated` : "all active"}
        />
        <StatCard
          icon="hash"
          label="Channels"
          value={num((w.channels_public ?? 0) + (w.channels_private ?? 0) + (w.channels_group ?? 0))}
          sub={`${num(w.channels_direct)} direct messages`}
        />
        <StatCard
          icon="send"
          label="Messages"
          value={num(w.messages_total)}
          sub={`${num(w.messages_24h)} in last 24h`}
        />
        <StatCard
          icon="file"
          label="Files"
          value={num(w.files_count)}
          sub={fileSize(w.files_bytes ?? 0)}
        />
      </div>

      <div className="system-card">
        <div className="system-card-head">
          <span className="system-card-icon"><Icon name="hash" size={18} /></span>
          <div>
            <h3 className="system-card-title">Workspace</h3>
            <p className="muted">Content breakdown across the deployment.</p>
          </div>
        </div>
        <dl className="kv-list">
          <KV k="Public channels" v={num(w.channels_public)} />
          <KV k="Private channels" v={num(w.channels_private)} />
          <KV k="Group channels" v={num(w.channels_group)} />
          <KV k="Direct messages" v={num(w.channels_direct)} />
          <KV k="Messages (7 days)" v={num(w.messages_7d)} />
          <KV k="Total members" v={num(w.users_total)} />
        </dl>
      </div>

      <div className="system-card">
        <div className="system-card-head">
          <span className="system-card-icon"><Icon name="settings" size={18} /></span>
          <div>
            <h3 className="system-card-title">Server</h3>
            <p className="muted">Build and runtime information.</p>
          </div>
        </div>
        <dl className="kv-list">
          <KV k="Version" v={s.version || "unknown"} />
          <KV k="Uptime" v={uptime(s.uptime_seconds)} />
          <KV k="Platform" v={`${s.os || "?"} / ${s.arch || "?"}`} />
          <KV
            k="Realtime fan-out"
            v={r.redis_enabled ? "Redis (multi-instance)" : "in-process (single instance)"}
          />
          <KV k="Online members" v={num(r.online_users)} />
        </dl>
      </div>

      <div className="system-card">
        <div className="system-card-head">
          <span className="system-card-icon"><Icon name="file" size={18} /></span>
          <div>
            <h3 className="system-card-title">Database</h3>
            <p className="muted">PostgreSQL status and size.</p>
          </div>
        </div>
        <dl className="kv-list">
          <KV k="Size on disk" v={fileSize(d.size_bytes ?? 0)} />
          <KV k="Schema version" v={d.migration_version ?? "unknown"} />
          <KV k="PostgreSQL" v={d.server_version || "unknown"} />
          <KV k="Connection pool" v={`${num(d.pool_size)} open, ${num(d.pool_idle)} idle`} />
        </dl>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="stat-card">
      <span className="stat-card-icon"><Icon name={icon} size={18} /></span>
      <div className="stat-card-body">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
        {sub && <span className="stat-card-sub muted">{sub}</span>}
      </div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div className="kv-row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
