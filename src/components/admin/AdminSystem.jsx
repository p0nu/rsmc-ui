import { useEffect, useState } from "react";
import { api } from "../../api/endpoints.js";
import { useToast } from "../../context/ToastContext.jsx";
import { fileSize, timeAgo } from "../../lib/format.js";
import Icon from "../common/Icon.jsx";
import { Loading, EmptyState } from "../common/Modal.jsx";

export default function AdminSystem() {
  const toast = useToast();
  const [info, setInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(true);

  const [backupPath, setBackupPath] = useState("");
  const [backingUp, setBackingUp] = useState(false);
  const [restoringPath, setRestoringPath] = useState(null);

  async function loadInfo() {
    setLoadingInfo(true);
    try {
      setInfo(await api.systemInfo());
    } catch (e) {
      toast.error("Couldn't load system info", e.message);
    } finally {
      setLoadingInfo(false);
    }
  }

  async function loadBackups() {
    setLoadingBackups(true);
    try {
      setBackups(await api.listBackups());
    } catch (e) {
      toast.error("Couldn't load backups", e.message);
    } finally {
      setLoadingBackups(false);
    }
  }

  useEffect(() => {
    loadInfo();
    loadBackups();
  }, []);

  const toolsReady = info?.pg_dump_available && info?.pg_restore_available;

  async function runBackup() {
    setBackingUp(true);
    try {
      const res = await api.backupDatabase(backupPath.trim() || undefined);
      toast.success("Backup created", `${res.path} · ${fileSize(res.size_bytes)}`);
      setBackupPath("");
      loadBackups();
    } catch (e) {
      toast.error("Backup failed", e.message);
    } finally {
      setBackingUp(false);
    }
  }

  async function runRestore(path) {
    if (
      !confirm(
        `Restore the database from:\n\n${path}\n\nThis REPLACES all current data — messages, channels, and users will be overwritten with the contents of the backup. This cannot be undone.\n\nContinue?`
      )
    ) {
      return;
    }
    setRestoringPath(path);
    try {
      await api.restoreDatabase(path);
      toast.success("Database restored", "Reloading to reflect restored data…");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      toast.error("Restore failed", e.message);
      setRestoringPath(null);
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-subtitle">Database backup &amp; restore</h2>
          <p className="muted">
            Create point-in-time snapshots of the workspace database and restore
            from them. Backups are written on the server.
          </p>
        </div>
      </div>

      {loadingInfo ? (
        <Loading />
      ) : (
        <>
          {!toolsReady && (
            <div className="panel-note" style={{ marginBottom: 18 }}>
              <Icon name="alert" size={16} />
              <span>
                The PostgreSQL client tools (<code>pg_dump</code>/<code>pg_restore</code>)
                aren't available on the server, so backup and restore are disabled.
                Rebuild the backend image (it now installs <code>postgresql-client</code>)
                and restart.
              </span>
            </div>
          )}

          {/* Create backup */}
          <div className="system-card">
            <div className="system-card-head">
              <span className="system-card-icon">
                <Icon name="download" size={18} />
              </span>
              <div>
                <h3 className="system-card-title">Create a backup</h3>
                <p className="muted">
                  Saves a compressed dump to the backups directory on the server.
                </p>
              </div>
            </div>

            <div className="field">
              <label>Backup path <span className="muted">(optional)</span></label>
              <div className="input-prefix">
                <span className="input-prefix-glyph"><Icon name="file" size={15} /></span>
                <input
                  className="input"
                  placeholder={
                    info?.backup_dir
                      ? `${info.backup_dir}/rsmc-<timestamp>.dump`
                      : "rsmc-<timestamp>.dump"
                  }
                  value={backupPath}
                  onChange={(e) => setBackupPath(e.target.value)}
                  disabled={!toolsReady || backingUp}
                />
              </div>
              <span className="field-hint">
                Leave blank for an auto-named file. A bare filename is placed in the
                backups directory{info?.backup_dir ? ` (${info.backup_dir})` : ""}.
                Absolute paths must stay inside that directory.
              </span>
            </div>

            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={runBackup}
                disabled={!toolsReady || backingUp}
              >
                {backingUp ? <span className="spinner on-brand" /> : <Icon name="download" size={16} />}
                {backingUp ? "Creating backup…" : "Create backup"}
              </button>
            </div>
          </div>

          {/* Existing backups */}
          <div className="system-card">
            <div className="system-card-head">
              <span className="system-card-icon">
                <Icon name="file" size={18} />
              </span>
              <div>
                <h3 className="system-card-title">Available backups</h3>
                <p className="muted">Restore replaces all current data with the snapshot.</p>
              </div>
              <button
                className="btn btn-ghost btn-sm system-refresh"
                onClick={loadBackups}
                title="Refresh"
              >
                <Icon name="back" size={15} /> Refresh
              </button>
            </div>

            {loadingBackups ? (
              <Loading />
            ) : backups.length === 0 ? (
              <EmptyState
                icon={<Icon name="file" size={36} />}
                title="No backups yet"
                hint="Create your first backup above."
              />
            ) : (
              <div className="system-backups">
                {backups.map((b) => (
                  <div key={b.path} className="system-backup">
                    <div className="system-backup-icon">
                      <Icon name="file" size={17} />
                    </div>
                    <div className="system-backup-meta">
                      <div className="system-backup-path">{b.path}</div>
                      <div className="system-backup-sub muted">
                        {fileSize(b.size_bytes)}
                        {b.modified_at && ` · created ${timeAgo(b.modified_at)}`}
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => runRestore(b.path)}
                      disabled={!toolsReady || restoringPath != null}
                    >
                      {restoringPath === b.path ? (
                        <span className="spinner" />
                      ) : (
                        <Icon name="back" size={15} />
                      )}
                      {restoringPath === b.path ? "Restoring…" : "Restore"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Restore from an explicit path */}
          <div className="system-card">
            <div className="system-card-head">
              <span className="system-card-icon">
                <Icon name="back" size={18} />
              </span>
              <div>
                <h3 className="system-card-title">Restore from a path</h3>
                <p className="muted">Point to a dump file that lives on the server.</p>
              </div>
            </div>
            <RestoreByPath
              disabled={!toolsReady || restoringPath != null}
              onRestore={runRestore}
              placeholder={info?.backup_dir ? `${info.backup_dir}/rsmc-….dump` : "/path/to/backup.dump"}
            />
          </div>
        </>
      )}
    </div>
  );
}

function RestoreByPath({ disabled, onRestore, placeholder }) {
  const [path, setPath] = useState("");
  return (
    <>
      <div className="field">
        <label>Backup file path</label>
        <div className="input-prefix">
          <span className="input-prefix-glyph"><Icon name="file" size={15} /></span>
          <input
            className="input"
            placeholder={placeholder}
            value={path}
            onChange={(e) => setPath(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="form-actions">
        <button
          className="btn btn-danger"
          onClick={() => path.trim() && onRestore(path.trim())}
          disabled={disabled || !path.trim()}
        >
          <Icon name="back" size={15} /> Restore from this file
        </button>
      </div>
    </>
  );
}
