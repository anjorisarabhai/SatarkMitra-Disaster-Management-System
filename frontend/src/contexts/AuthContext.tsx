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
const USERS_KEY = "satarkmitra_users";

function AuthProvider({ children }: { children: ReactNode }) {

  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const getStoredUsers = (): User[] => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        localStorage.removeItem(USERS_KEY);
        return [];
      }

      return parsed;
    } catch {
      localStorage.removeItem(USERS_KEY);
      return [];
    }
  };

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    try {
      const users = getStoredUsers();

      const found = users.find((u) => u.email === email);

      if (!found) return false;

      setUser(found);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(found));

      return true;
    } catch {
      return false;
    }
  }, []);

  const signup = useCallback(
  async (email: string, _password: string, name: string, role: UserRole): Promise<boolean> => {
    try {
      console.log("Signup attempt:", email);

      let users: User[] = [];

      try {
        const raw = localStorage.getItem(USERS_KEY);
        users = raw ? JSON.parse(raw) : [];
      } catch {
        users = [];
      }

      console.log("Existing users:", users);

      if (users.some((u) => u.email === email)) {
        console.log("Email already exists");
        return false;
      }

      const newUser: User = {
  id: Date.now().toString(),
  email,
  name,
  role,
};

      users.push(newUser);

      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      setUser(newUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));

      console.log("Signup success:", newUser);

      return true;
    } catch (err) {
      console.error("Signup error:", err);
      return false;
    }
  },
  []
);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export { AuthProvider, useAuth };