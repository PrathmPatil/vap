import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <AppShell>
        <Component {...pageProps} />
      </AppShell>
      <Toaster />
    </AuthProvider>
  );
}
