import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/router";
import { loginUser, registerUser } from "@/utils";

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
  register: (name: string, email: string, password: string, phoneNumber:string, whatsappNumber:string) => Promise<{ message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Stays true until the first client-side token check completes.
  // Prevents pages from redirecting to /login during SSR/hydration flash.
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("stockUser");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
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

    setIsAuthenticated(!!(storedToken || cookieToken));
    // Mark auth check complete — pages can now safely evaluate isAuthenticated.
    setAuthLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginUser(email, password);
      const { user: userData, accessToken, success, message } = response;
      if (success) {
        localStorage.setItem("token", accessToken);
        // Cookie must exist for Next middleware; keep aligned with JWT (backend default 1h, allow 8h buffer for refresh UX).
        document.cookie = `token=${accessToken}; path=/; max-age=${60 * 60 * 8}`;
        setIsAuthenticated(true);

        router.push("/");

        setUser(userData);
        localStorage.setItem("stockUser", JSON.stringify(userData));

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
    // form.name, form.email, form.password, form.phoneNumber, form.whatsappNumber
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

      document.cookie = `token=${accessToken}; path=/; max-age=${60 * 60 * 8}`;
      localStorage.setItem("token", accessToken);
      setIsAuthenticated(true);
      router.push("/");

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
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setIsAuthenticated(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authLoading,
        user,
        role: user?.role || "",
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
