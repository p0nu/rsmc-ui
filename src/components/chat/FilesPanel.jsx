import { useEffect, useRef, useState } from "react";
import { api } from "../../api/endpoints.js";
import { fileSize, clockTime, displayName } from "../../lib/format.js";
import Icon from "../common/Icon.jsx";
import { Loading, EmptyState } from "../common/Modal.jsx";

// The engine exposes files through messages, so we collect attachments from
// recent channel history.
export default function FilesPanel({ channel, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api
      .history(channel.id, { limit: 100 })
      .then((res) => {
        if (!live) return;
        const out = [];
        for (const m of res.messages) {
          for (const a of m.attachments || []) {
            out.push({ ...a, author: m.author, at: m.created_at });
          }
        }
        setFiles(out);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [channel.id]);

  return (
    <aside className="rightpanel">
      <header className="rightpanel-head">
        <div className="rightpanel-title">
          <h3>Files</h3>
          <span className="muted">{files.length} shared</span>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>
      </header>
      <div className="rightpanel-body">
        {loading ? (
          <Loading />
        ) : files.length === 0 ? (
          <EmptyState icon={<Icon name="file" size={32} />} title="No files yet" hint="Attachments shared in this channel will appear here." />
        ) : (
          <div className="files-list">
            {files.map((f) => (
              <FileCard key={f.id} f={f} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function FileCard({ f }) {
  const isImage = (f.content_type || "").startsWith("image/");
  const [thumb, setThumb] = useState(null);
  const urlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!isImage) return;
    api
      .fileBlob(f.id)
      .then((blob) => {
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        urlRef.current = u;
        setThumb(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [f.id, isImage]);

  async function open() {
    try {
      const blob = await api.fileBlob(f.id);
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = f.filename || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button type="button" className="file-card" onClick={open} title={`Download ${f.filename}`}>
      <span className="file-card-thumb">
        {isImage && thumb ? <img src={thumb} alt="" loading="lazy" /> : <Icon name="file" size={22} />}
      </span>
      <span className="file-card-meta">
        <span className="file-card-name">{f.filename}</span>
        <span className="file-card-sub">
          {fileSize(f.size_bytes)} · {displayName(f.author)} · {clockTime(f.at)}
        </span>
      </span>
      <Icon name="download" size={16} className="file-card-dl" />
    </button>
  );
}
