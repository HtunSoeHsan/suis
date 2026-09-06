"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "@/lib/api";
import type { User } from "@/types";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  // Load user session from localStorage and verify token
  useEffect(() => {
    const savedToken = localStorage.getItem("suis_token");
    const savedUser = localStorage.getItem("suis_user");

    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(null);
        }
      }

      // Verify token with backend
      authApi.getMe()
        .then((me) => {
          setUser(me);
          localStorage.setItem("suis_user", JSON.stringify(me));
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem("suis_token");
          localStorage.removeItem("suis_user");
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const res = await authApi.login({ username, password });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("suis_token", res.access_token);
    localStorage.setItem("suis_user", JSON.stringify(res.user));
    return res.user;
  };

  const logout = useCallback(() => {
    localStorage.removeItem("suis_token");
    localStorage.removeItem("suis_user");
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  // Protect dashboard routes (redirect unauthenticated users to /login)
  useEffect(() => {
    if (!isLoading && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [isLoading, user, pathname, router]);

  const isProtectedPage = pathname !== "/login";

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {isProtectedPage && (isLoading || !user) ? (
        <div className="min-h-screen bg-theme-base flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-theme-sub">Loading SUIS Portal...</span>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
