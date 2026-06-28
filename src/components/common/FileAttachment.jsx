import { useEffect, useRef, useState } from "react";
import { api } from "../../api/endpoints.js";
import { fileSize } from "../../lib/format.js";
import Icon from "./Icon.jsx";

// Renders a message attachment. Files are protected by auth, so we can't point
// an <img src> or a plain <a href> at the raw endpoint (the browser can't send
// the bearer token → 401 → broken image). Instead we fetch the bytes once with
// auth, hold them as an object URL, and use that for both inline preview and
// download. Object URLs are revoked on unmount to avoid leaks.
export default function FileAttachment({ att }) {
  const isImage = (att.content_type || "").startsWith("image/");
  const [objUrl, setObjUrl] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const urlRef = useRef(null);

  // Eagerly load images for inline preview; non-images load on demand (download).
  useEffect(() => {
    let cancelled = false;
    if (!isImage) return;
    setState("loading");
    api
      .fileBlob(att.id)
      .then((blob) => {
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        urlRef.current = u;
        setObjUrl(u);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [att.id, isImage]);

  async function download() {
    try {
      const blob = await api.fileBlob(att.id);
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = att.filename || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a tick to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(u), 4000);
    } catch {
      setState("error");
    }
  }

  if (isImage) {
    return (
      <div className="attach-image">
        {state === "ready" && objUrl ? (
          <a href={objUrl} target="_blank" rel="noreferrer">
            <img src={objUrl} alt={att.filename} loading="lazy" />
          </a>
        ) : state === "error" ? (
          <div className="attach-image-fallback">
            <Icon name="alert" size={18} />
            <span>Couldn't load image</span>
          </div>
        ) : (
          <div className="attach-image-loading">
            <span className="spinner" />
          </div>
        )}
        <span className="attach-image-name">{att.filename}</span>
      </div>
    );
  }

  return (
    <button type="button" className="attach-file" onClick={download} title={`Download ${att.filename}`}>
      <span className="attach-file-icon"><Icon name="file" size={20} /></span>
      <span className="attach-file-meta">
        <span className="attach-file-name">{att.filename}</span>
        <span className="attach-file-size">
          {state === "error" ? "Couldn't load — tap to retry" : fileSize(att.size_bytes)}
        </span>
      </span>
      <span className="attach-file-dl"><Icon name="download" size={16} /></span>
    </button>
  );
}
