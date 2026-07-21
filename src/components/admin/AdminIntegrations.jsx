import { useState } from "react";
import AdminWebhooks from "./AdminWebhooks.jsx";
import AdminAppLinks from "./AdminAppLinks.jsx";
import Icon from "../common/Icon.jsx";

// Groups the two integration surfaces under one tab. Webhooks push events out to
// other systems; app links pull external tools into the UI.
export default function AdminIntegrations({ onAppLinksChanged }) {
  const [sub, setSub] = useState("webhooks");

  return (
    <div className="admin-subtabs-wrap">
      <div className="admin-subtabs">
        <button className={sub === "webhooks" ? "active" : ""} onClick={() => setSub("webhooks")}>
          <Icon name="webhook" size={15} /> Webhooks
        </button>
        <button className={sub === "apps" ? "active" : ""} onClick={() => setSub("apps")}>
          <Icon name="grid" size={15} /> Apps
        </button>
      </div>

      {sub === "webhooks" && <AdminWebhooks />}
      {sub === "apps" && <AdminAppLinks onChanged={onAppLinksChanged} />}
    </div>
  );
}
