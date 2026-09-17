/** Resolve FastAPI base URL (local :8080 or production /ml proxy). */
export function getPythonBaseUrl(): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_PYTHON_API_URL ||
    process.env.NEXT_PUBLIC_PYTHON_API ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const pageIsLocal = host === "localhost" || host === "127.0.0.1";
    const envIsLocal = !fromEnv || /localhost|127\.0\.0\.1/i.test(fromEnv);

    if (!pageIsLocal && envIsLocal) {
      return `${window.location.origin}/ml`;
    }
  }

  return fromEnv || "http://localhost:8080";
}
