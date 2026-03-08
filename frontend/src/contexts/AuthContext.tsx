import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { UserRole } from "@/lib/roles";

export type { UserRole };

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "satarkmitra_user";

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    // Mock login — find user from stored users list
    try {
      const usersRaw = localStorage.getItem("satarkmitra_users") || "[]";
      const users: User[] = JSON.parse(usersRaw);
      const found = users.find((u) => u.email === email);
      if (found) {
        setUser(found);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const signup = useCallback(async (email: string, _password: string, name: string, role: UserRole): Promise<boolean> => {
    try {
      const newUser: User = {
        id: crypto.randomUUID(),
        email,
        name,
        role,
      };
      // Store in users list
      const usersRaw = localStorage.getItem("satarkmitra_users") || "[]";
      const users: User[] = JSON.parse(usersRaw);
      if (users.some((u) => u.email === email)) return false;
      users.push(newUser);
      localStorage.setItem("satarkmitra_users", JSON.stringify(users));
      // Auto-login
      setUser(newUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export { AuthProvider, useAuth };