
import React, { createContext, useContext, useEffect, useState } from "react";
import { API_BASE } from '../utils/apiBase'
import { fetchJson } from '../utils/fetchJson'

export type Role = "admin" | "superadmin" | null;

export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  role: Exclude<Role, null>;
}

interface AuthContextType {
  user: User | null;
  login: (arg: any) => Promise<User>;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restore login state
  useEffect(() => {
    try {
      const stored = localStorage.getItem("auth_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    try {
      const t = localStorage.getItem('auth_token')
      if (t) setToken(t)
    } catch {}
  }, []);

  // If we have a token but no user object yet, try to hydrate the user from the server
  useEffect(() => {
    const tryHydrate = async () => {
      try {
        const t = token || localStorage.getItem('auth_token') || localStorage.getItem('token')
        if (!t || user) return
        // call protected profile endpoint to get user info
        const { res, json } = await fetchJson(`${API_BASE}/api/auth/profile`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${t}` }
        })
        if (!res.ok) {
          // invalid token - clear
          setToken(null)
          try { localStorage.removeItem('auth_token'); localStorage.removeItem('token'); } catch (e) {}
          return
        }
        const body = json || {}
        if (body && body.user) setUser(body.user)
      } catch (err) {
        // ignore - leave unauthenticated
      }
    }
    tryHydrate()
    // only run when token or user changes
  }, [token, user])

  // Save login state
  useEffect(() => {
    if (user) localStorage.setItem("auth_user", JSON.stringify(user));
    else localStorage.removeItem("auth_user");
  }, [user]);

  // -------------------------------
  // LOGIN FUNCTION
  // -------------------------------
  const login = async (arg: any) => {
    // If caller passed a full user object, accept it (used by some tests)
    if ("id" in arg) {
      setUser(arg);
      return arg;
    }

    const { username, password } = arg;
    if (!username || !password) throw new Error('Username and password required')

    // Try backend login with several likely email variants so demo creds work.
    const apiUrl = API_BASE
    const candidateEmails = [username, `${username}@local`, `${username}@restom.com`, `${username}@resto.com`, `${username}@kavyaresto`]
    for (const email of candidateEmails) {
      try {
        // Use safe fetch that tolerates empty/non-JSON responses
        const { res, json } = await fetchJson(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        if (!res.ok) continue
        const body = json || {}
        const tok = body.token
        const u = body.user || { id: body.user?.id || body.user?._id || email, name: body.user?.name || username, email: email, role: (body.user && body.user.role) || 'admin' }
        if (tok) {
          setToken(tok)
          localStorage.setItem('auth_token', tok)
        }
        setUser(u)
        return u
      } catch (err) {
        // try next candidate
      }
    }

    // Fallback to demo mock behavior (no backend)
    await new Promise((res) => setTimeout(res, 150));
    let role: Role = null;
    if (username === "admin" && password === "admin234") role = "admin";
    else if (username === "superadmin" && password === "super234") role = "superadmin";
    if (!role) throw new Error("Invalid username or password");
    const loggedInUser: User = {
      id: username,
      name: role === "superadmin" ? "Super Admin" : "Admin",
      email: `${username}@restom.com`,
      role,
    };
    setUser(loggedInUser);
    return loggedInUser;
  };

  // -------------------------------
  // UPDATE USER (for profile changes)
  // -------------------------------
  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  // -------------------------------
  // LOGOUT FUNCTION
  // -------------------------------
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  // -------------------------------
  // AUTH FETCH
  // -------------------------------
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers: any = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
    const t = token || localStorage.getItem('auth_token')
    if (t) headers['Authorization'] = `Bearer ${t}`
    return fetch(url, { ...options, headers })
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        updateUser,
        logout,
        authFetch,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};


