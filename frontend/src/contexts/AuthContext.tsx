import { createContext, useState } from "react";
import type { ReactNode } from "react";

export type AuthContextType = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check localStorage for existing auth state
    if (typeof window !== "undefined") {
      const storedAuth = localStorage.getItem("isAuthenticated");
      return storedAuth === "true";
    }
    return false;
  });

  const login = () => {
    setIsAuthenticated(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("isAuthenticated", "true");
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("isAuthenticated");
    }
  };

  const value = {
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
