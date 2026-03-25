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
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  role: string;
  isSubscribed: boolean; 
  login: (email: string, password: string) => void;
  register: (name: string, email: string, password: string, phoneNumber:string, whatsappNumber:string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("stockUser");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="));

    setIsAuthenticated(!!token);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginUser(email, password);
      const { user: userData, accessToken, success, message } = response;
      if (success) {
        localStorage.setItem("token", accessToken);
        document.cookie = `token=${accessToken}; path=/`;
        setIsAuthenticated(true);

        router.push("/");

        setUser(userData);
        localStorage.setItem("stockUser", JSON.stringify(userData));
      }
    } catch (error) {
      console.log("Login error:", error);
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
      const userData = { name, email, password, phoneNumber, whatsappNumber };
      const response = await registerUser(
        name,
        email,
        password,
        phoneNumber,
        whatsappNumber,
      );

      localStorage.setItem("stockUser", JSON.stringify(userData));
      setUser(userData);

      document.cookie = `token=${response.accessToken}; path=/`;
      setIsAuthenticated(true);
      router.push("/");
    } catch (error) {
      console.log(error);
    }
  };

  const logout = () => {
    localStorage.removeItem("stockUser");

    setUser(null);

    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setIsAuthenticated(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        role: user?.role || "",
        isSubscribed: user?.is_subscribed || false,
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
