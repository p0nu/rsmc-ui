import { useState } from "react";
import { AuthProvider, useAuth } from "../context/AuthContext.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";
import { ThemeProvider } from "../context/ThemeContext.jsx";
import AuthView from "../views/AuthView.jsx";
import Workspace from "../views/Workspace.jsx";
import EmailActionView, { detectEmailAction } from "../views/EmailActionView.jsx";

function Gate() {
  const { user, booting } = useAuth();
  // Email token links (verify / reset / change) are handled before the normal
  // gate, since a logged-out user may be completing one of these flows.
  const [emailAction] = useState(() => detectEmailAction());
  if (emailAction) {
    return <EmailActionView action={emailAction} />;
  }
  if (booting) {
    return (
      <div className="app-boot">
        <div className="spinner" />
        <span className="muted">Loading RSMC…</span>
      </div>
    );
  }
  return user ? <Workspace /> : <AuthView />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
