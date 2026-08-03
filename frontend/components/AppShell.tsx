import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/ui/PageLoader";

type AppShellProps = {
  children: ReactNode;
};

/**
 * Global Suspense + route-transition loader for the Pages Router.
 * Shows brand loader while auth bootstraps, during navigations, and as Suspense fallback.
 */
export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { authLoading } = useAuth();
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    const onStart = (url: string) => {
      if (url !== router.asPath) setRouting(true);
    };
    const onDone = () => setRouting(false);

    router.events.on("routeChangeStart", onStart);
    router.events.on("routeChangeComplete", onDone);
    router.events.on("routeChangeError", onDone);

    return () => {
      router.events.off("routeChangeStart", onStart);
      router.events.off("routeChangeComplete", onDone);
      router.events.off("routeChangeError", onDone);
    };
  }, [router]);

  if (authLoading) {
    return <PageLoader fullScreen message="Preparing your workspace…" />;
  }

  return (
    <>
      {routing && (
        <PageLoader overlay message="Loading page…" />
      )}
      <Suspense
        fallback={<PageLoader fullScreen message="Loading page…" />}
      >
        {children}
      </Suspense>
    </>
  );
}

export default AppShell;
