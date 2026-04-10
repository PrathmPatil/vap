import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  // return <Component {...pageProps} />;
  return <AuthProvider>
      <Component {...pageProps} />
      <Toaster />
    </AuthProvider>
}
