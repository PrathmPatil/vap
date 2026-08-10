import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { loginUser, registerUser } from "@/utils";
import { getRoleFromToken, normalizeRole } from "@/lib/authRoles";

interface User {
  name?: string;
  email: string;
  role?: string;
  is_subscribed?: boolean;
  phoneNumber?: string;
  whatsappNumber?: string;
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  /** True while the initial token check hasn't run yet (SSR → client hydration). */
  authLoading: boolean;
  user: User | null;
  role: string;
  isSubscribed: boolean;
  login: (email: string, password: string) => Promise<{ message?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    phoneNumber: string,
    whatsappNumber: string,
  ) => Promise<{ message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const navigateClient = (path: string) => {
  if (typeof window !== "undefined") {
    window.location.assign(path);
  }
};

const resolveRole = (userData?: User | null, token?: string | null) => {
  const fromUser = normalizeRole(userData?.role);
  if (fromUser) return fromUser;
  return getRoleFromToken(token);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Stays true until the first client-side token check completes.
  // Prevents pages from redirecting to /login during SSR/hydration flash.
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("stockUser");
    let parsedUser: User | null = null;

    if (storedUser) {
      try {
        parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
      } catch {
        localStorage.removeItem("stockUser");
      }
    }

    const storedToken = localStorage.getItem("token")?.trim() || "";
    const cookieRow = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="));
    const cookieToken = cookieRow
      ? cookieRow.slice("token=".length).trim()
      : "";

    // Keep middleware cookie in sync with localStorage (source of truth).
    if (storedToken && storedToken !== cookieToken) {
      document.cookie = `token=${storedToken}; path=/; max-age=${60 * 60 * 8}`;
    }

    const token = storedToken || cookieToken;
    setIsAuthenticated(!!token);
    setRole(resolveRole(parsedUser, token));
    // Mark auth check complete — pages can now safely evaluate isAuthenticated.
    setAuthLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginUser(email, password);
      const { user: userData, accessToken, success, message } = response;
      if (success) {
        localStorage.setItem("token", accessToken);
        // Cookie must exist for Next middleware; keep aligned with JWT.
        document.cookie = `token=${accessToken}; path=/; max-age=${60 * 60 * 8}`;
        setIsAuthenticated(true);
        setUser(userData);
        setRole(resolveRole(userData, accessToken));
        localStorage.setItem("stockUser", JSON.stringify(userData));

        navigateClient("/");

        return { message };
      }

      throw new Error(message || "Login failed");
    } catch (error) {
      console.log("Login error:", error);
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phoneNumber: string,
    whatsappNumber: string,
  ) => {
    try {
      const response = await registerUser(
        name,
        email,
        password,
        phoneNumber,
        whatsappNumber,
      );
      const { user: userData, accessToken, success, message } = response;

      if (!success) {
        throw new Error(message || "Registration failed");
      }

      localStorage.setItem("stockUser", JSON.stringify(userData));
      setUser(userData);
      setRole(resolveRole(userData, accessToken));

      document.cookie = `token=${accessToken}; path=/; max-age=${60 * 60 * 8}`;
      localStorage.setItem("token", accessToken);
      setIsAuthenticated(true);
      navigateClient("/");

      return { message };
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("stockUser");
    localStorage.removeItem("token");
    setUser(null);
    setRole("");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setIsAuthenticated(false);
    navigateClient("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authLoading,
        user,
        role,
        isSubscribed: user?.is_subscribed || true,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
