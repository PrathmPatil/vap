import AuthForm from "@/components/AuthForm";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">

      <div className="grid md:grid-cols-2 w-[900px] bg-white shadow-2xl rounded-2xl overflow-hidden">

        {/* Left Side */}
        <div className="bg-indigo-600 text-white p-10 flex flex-col justify-center">
          <h1 className="text-4xl font-bold mb-4">
            Stock Market Intelligence
          </h1>

          <p className="text-lg opacity-90">
            Analyze market signals, discover trends, and make smarter trading decisions.
          </p>
        </div>

        {/* Right Side */}
        <div className="flex flex-col items-center justify-center p-10">
          <AuthForm />
          <Button variant="link" onClick={() => window.location.replace("/")} className="mt-4 text-sm hover:underline text-indigo-600 hover:text-indigo-800">
            Go to Dashboard
          </Button>
        </div>

      </div>

    </div>
  );
}