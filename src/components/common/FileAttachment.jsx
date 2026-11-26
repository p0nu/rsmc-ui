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
  const [lightbox, setLightbox] = useState(false);
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

  // Close the lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => e.key === "Escape" && setLightbox(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

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
          <>
            <button
              type="button"
              className="attach-image-btn"
              onClick={() => setLightbox(true)}
              title="Click to enlarge"
            >
              <img src={objUrl} alt={att.filename} loading="lazy" />
            </button>
            {lightbox && (
              <div className="lightbox" onClick={() => setLightbox(false)} role="dialog" aria-modal="true">
                <button
                  type="button"
                  className="lightbox-close"
                  onClick={() => setLightbox(false)}
                  aria-label="Close"
                >
                  <Icon name="x" size={22} />
                </button>
                <img
                  src={objUrl}
                  alt={att.filename}
                  className="lightbox-img"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </>
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
          {state === "error" ? "Couldn't load - tap to retry" : fileSize(att.size_bytes)}
        </span>
      </span>
      <span className="attach-file-dl"><Icon name="download" size={16} /></span>
    </button>
  );
}
