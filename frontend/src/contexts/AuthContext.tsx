import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { UserRole } from "@/lib/roles";

export type { UserRole };

export interface User {
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, phone?: string) => Promise<boolean>;
  logout: () => void;
  getToken: () => string | null;  // 🆕 Get JWT token
  updateUser: (user: User) => void;  // 🆕 Update user data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "satarkmitra_user";
const TOKEN_KEY = "auth_token";  // 🆕 JWT token storage key
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";  // 🆕 API URL from env

function AuthProvider({ children }: { children: ReactNode }) {

  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // 🆕 Get JWT token from storage
  const getToken = useCallback((): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  // 🆕 Update user data (useful after profile updates)
  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data.detail);
        return false;
      }

      // 🆕 Store JWT token if returned from backend
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        console.log("✅ JWT token stored successfully");
      }

      // Store user data
      if (data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      }

      return true;

    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, name: string, phone: string = "9999999999"): Promise<boolean> => {
      try {
        const response = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            phone,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Registration failed:", errorData.detail);
          return false;
        }

        const data = await response.json();

        // 🆕 Store JWT token if returned from backend
        if (data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
          console.log("✅ JWT token stored from registration");
        }

        // Auto-login after signup - get user data
        const loginResponse = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          
          // 🆕 Update token if a new one is returned
          if (loginData.token) {
            localStorage.setItem(TOKEN_KEY, loginData.token);
          }
          
          if (loginData.user) {
            setUser(loginData.user);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(loginData.user));
          }
        }

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
    localStorage.removeItem(TOKEN_KEY);  // 🆕 Remove JWT token on logout
    console.log("✅ User logged out, tokens cleared");
  }, []);

  // 🆕 Optional: Verify token validity with backend
  const verifyToken = useCallback(async (): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/verify-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token }),
      });

      const data = await response.json();
      return data.valid === true;
    } catch {
      return false;
    }
  }, [getToken]);

  // 🆕 Check token on initial load (optional - uncomment if needed)
  // useEffect(() => {
  //   if (user) {
  //     verifyToken().then(isValid => {
  //       if (!isValid) {
  //         console.warn("Token expired, logging out...");
  //         logout();
  //       }
  //     });
  //   }
  // }, [user, verifyToken, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        getToken,      // 🆕 Expose token getter
        updateUser,    // 🆕 Expose user updater
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

// 🆕 Export additional utilities
export { AuthProvider, useAuth };

// 🆕 Optional: Export token helper for non-React usage
export const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};