import { AuthProvider, useAuth } from "../context/AuthContext.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";
import { ThemeProvider } from "../context/ThemeContext.jsx";
import AuthView from "../views/AuthView.jsx";
import Workspace from "../views/Workspace.jsx";

function Gate() {
  const { user, booting } = useAuth();
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
