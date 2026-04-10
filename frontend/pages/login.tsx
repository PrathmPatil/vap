// pages/login.tsx (or app/login/page.tsx)
import AuthForm from "@/components/AuthForm";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Animated background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-300/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-300/30 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Card container - max height based on viewport */}
      <div className="relative z-10 w-full max-w-5xl mx-auto max-h-[95vh] overflow-hidden rounded-3xl shadow-2xl">
        <div className="grid md:grid-cols-2 bg-white/70 backdrop-blur-xl border border-white/50 transition-all duration-500 hover:shadow-indigo-100/50 h-full">
          
          {/* Left side – hidden on mobile */}
          <div className="hidden md:flex bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-8 lg:p-10 flex-col justify-between relative overflow-y-auto">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-8">
                <TrendingUp className="w-7 h-7 lg:w-8 lg:h-8 drop-shadow-lg" />
                <span className="text-lg lg:text-xl font-bold tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  TrendTraders
                </span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-bold mb-4 leading-tight">
                Market Intelligence
                <br />
                <span className="text-indigo-200">at your fingertips</span>
              </h1>
              <p className="text-indigo-100 text-base lg:text-lg mb-6 lg:mb-8 leading-relaxed">
                Analyze signals, discover trends, and make smarter trading decisions with real-time insights.
              </p>
            </div>
            <div className="relative z-10 space-y-2 lg:space-y-3 text-sm text-indigo-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-yellow-300" />
                <span>AI-powered predictions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>Real-time market data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>Secure & encrypted</span>
              </div>
            </div>
          </div>

          {/* Right side – scrolls independently, no fixed height */}
          <div className="flex flex-col items-center bg-white/90 backdrop-blur-sm overflow-y-auto px-6 py-2 sm:px-8 md:px-8">
            {/* Mobile company name */}
            <div className="md:hidden flex items-center justify-center gap-2 mb-6 pb-4 border-b border-gray-100 w-full">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                TrendTraders
              </span>
            </div>
            <AuthForm />
            <Button 
              variant="ghost" 
              onClick={() => window.location.replace("/dashboard")} 
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 group transition-all"
            >
              Go to Dashboard
              <ArrowRight className="ml-1 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
      
      <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-400">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}