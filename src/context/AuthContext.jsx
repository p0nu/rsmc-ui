import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/endpoints.js";
import { configureTokenStore, ApiError } from "../api/client.js";
import { Realtime } from "../api/realtime.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const LS_KEY = "rsmc.session";

function load() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const tokens = useRef(load());
  const rt = useRef(null);
  if (!rt.current) rt.current = new Realtime();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    configureTokenStore({
      getAccess: () => tokens.current?.access_token || null,
      getRefresh: () => tokens.current?.refresh_token || null,
      setTokens: (t) => {
        tokens.current = { access_token: t.access_token, refresh_token: t.refresh_token };
        localStorage.setItem(LS_KEY, JSON.stringify(tokens.current));
        if (t.access_token) rt.current.connect(t.access_token);
      },
      clear: () => {
        tokens.current = null;
        localStorage.removeItem(LS_KEY);
        // If the client cleared the session (e.g. refresh failed because the
        // account was deactivated or the refresh token expired), drop back to
        // the sign-in screen instead of leaving a broken authenticated view.
        try {
          rt.current.close();
        } catch {
          /* ignore */
        }
        setUser(null);
      },
    });
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!tokens.current?.access_token) {
        setBooting(false);
        return;
      }
      try {
        const me = await api.meBoot();
        if (!live) return;
        setUser(me);
        rt.current.connect(tokens.current.access_token);
      } catch (e) {
        if (e instanceof ApiError && e.isAuth) {
          tokens.current = null;
          localStorage.removeItem(LS_KEY);
        }
      } finally {
        if (live) setBooting(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  function establish(auth) {
    tokens.current = { access_token: auth.access_token, refresh_token: auth.refresh_token };
    localStorage.setItem(LS_KEY, JSON.stringify(tokens.current));
    setUser(auth.user);
    rt.current.connect(auth.access_token);
  }

  async function login(email, password) {
    const auth = await api.login(email, password);
    establish(auth);
    return auth.user;
  }
  async function signup(payload) {
    const auth = await api.signup(payload);
    establish(auth);
    return auth.user;
  }
  async function logout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    rt.current.close();
    tokens.current = null;
    localStorage.removeItem(LS_KEY);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, setUser, booting, login, signup, logout, rt: rt.current }),
    [user, booting]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
