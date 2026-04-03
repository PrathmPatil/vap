// components/AuthForm.tsx
'use client';

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { 
  Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowRight, Shield
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export default function AuthForm() {
  const { login, register } = useAuth();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    whatsappNumber: "",
    isWhatsapp: false,
  });

  const validatePassword = (password: string) => ({
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  });

  const passwordChecks = validatePassword(form.password);
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;
  const isPasswordValid = passwordStrength === 4;
  
  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "bg-gray-200";
    if (passwordStrength <= 2) return "bg-red-500";
    if (passwordStrength === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const isValidPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(email);
  };

  const getFieldError = (field: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!isLogin && !form.name.trim()) return "Full name is required";
        if (!isLogin && form.name.trim().length < 2) return "Name must be at least 2 characters";
        return undefined;
      case 'email':
        if (!form.email) return "Email is required";
        if (!isValidEmail(form.email)) return "Please enter a valid email address";
        return undefined;
      case 'password':
        if (!form.password) return "Password is required";
        if (!isPasswordValid) return "Please meet all password requirements";
        return undefined;
      case 'phone':
        if (!isLogin && !form.phoneNumber) return "Phone number is required";
        if (!isLogin && !isValidPhoneNumber(form.phoneNumber)) return "Enter a valid phone number (8-15 digits)";
        return undefined;
      case 'whatsapp':
        if (!isLogin && !form.isWhatsapp && !form.whatsappNumber) return "WhatsApp number is required";
        if (!isLogin && !form.isWhatsapp && !isValidPhoneNumber(form.whatsappNumber)) return "Enter a valid WhatsApp number (8-15 digits)";
        return undefined;
      default:
        return undefined;
    }
  };

  const errors = {
    name: touched.name ? getFieldError('name') : undefined,
    email: touched.email ? getFieldError('email') : undefined,
    password: touched.password ? getFieldError('password') : undefined,
    phone: touched.phone ? getFieldError('phone') : undefined,
    whatsapp: touched.whatsapp ? getFieldError('whatsapp') : undefined,
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        isWhatsapp: checked,
        whatsappNumber: checked ? prev.phoneNumber : "",
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const allFields = isLogin ? ['email', 'password'] : ['name', 'email', 'password', 'phone', 'whatsapp'];
    const newTouched: Record<string, boolean> = {};
    allFields.forEach(f => { newTouched[f] = true; });
    setTouched(newTouched);
    
    const fieldErrors = allFields.map(f => getFieldError(f)).filter(Boolean);
    if (fieldErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: fieldErrors[0],
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
        toast({ title: "Welcome back! 🎉", description: "Successfully logged in.", variant: "success" });
      } else {
        await register(
          form.name,
          form.email,
          form.password,
          form.phoneNumber,
          form.isWhatsapp ? form.phoneNumber : form.whatsappNumber
        );
        toast({ title: "Account created! ✅", description: "You can now log in.", variant: "success" });
        setIsLogin(true);
        setForm({ name: "", email: "", password: "", phoneNumber: "", whatsappNumber: "", isWhatsapp: false });
        setTouched({});
      }
    } catch (error: any) {
      toast({ title: "Authentication Error", description: error?.response?.data?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden transition-all duration-300">
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      
      <div className="p-5 sm:p-6 md:p-8">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isLogin ? "Welcome back" : "Create an account"}
          </h2>
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
        </div>
        <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">
          {isLogin ? "Sign in to access your portfolio" : "Join thousands of traders"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <input
                  name="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('name')}
                  className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'
                  }`}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                onBlur={() => handleBlur('email')}
                className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'
                }`}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={form.password}
                onChange={handleChange}
                onBlur={() => handleBlur('password')}
                className={`w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2 sm:py-2.5 text-sm sm:text-base border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'
                }`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
            
            {form.password && !isPasswordValid && !isLogin && (
              <div className="mt-2 space-y-1.5 sm:space-y-2">
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`} style={{ width: `${(passwordStrength / 4) * 100}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] sm:text-xs">
                  {[
                    { label: "6+ chars", valid: passwordChecks.length },
                    { label: "Uppercase", valid: passwordChecks.uppercase },
                    { label: "Number", valid: passwordChecks.number },
                    { label: "Special char", valid: passwordChecks.special },
                  ].map((req, idx) => (
                    <p key={idx} className={`flex items-center gap-1 ${req.valid ? 'text-green-600' : 'text-gray-400'}`}>
                      {req.valid ? <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                      {req.label}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {errors.password && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <PhoneInput
                  country={"in"}
                  value={form.phoneNumber}
                  onChange={(phone) => {
                    setForm((prev) => ({
                      ...prev,
                      phoneNumber: phone,
                      whatsappNumber: prev.isWhatsapp ? phone : prev.whatsappNumber,
                    }));
                    if (touched.phone) handleBlur('phone');
                  }}
                  onBlur={() => handleBlur('phone')}
                  inputClass="!w-full !h-[40px] sm:!h-[46px] !pl-12 !text-sm sm:!text-base !border-gray-200 !rounded-xl !focus:ring-2 !focus:ring-indigo-500"
                  containerClass="w-full"
                  buttonClass="!border-gray-200 !rounded-l-xl"
                  dropdownClass="!rounded-xl"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
              </div>

              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    name="isWhatsapp"
                    type="checkbox"
                    checked={form.isWhatsapp}
                    onChange={handleChange}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Same as WhatsApp number</span>
                </label>
                <FaWhatsapp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>

              {!form.isWhatsapp && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-2">
                      <FaWhatsapp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" /> WhatsApp Number
                    </span>
                  </label>
                  <PhoneInput
                    country={"in"}
                    value={form.whatsappNumber}
                    onChange={(phone) => {
                      setForm((prev) => ({ ...prev, whatsappNumber: phone }));
                      if (touched.whatsapp) handleBlur('whatsapp');
                    }}
                    onBlur={() => handleBlur('whatsapp')}
                    inputClass="!w-full !h-[40px] sm:!h-[46px] !pl-12 !text-sm sm:!text-base !border-gray-200 !rounded-xl !focus:ring-2 !focus:ring-indigo-500"
                    containerClass="w-full"
                    buttonClass="!border-gray-200 !rounded-l-xl"
                    dropdownClass="!rounded-xl"
                  />
                  {errors.whatsapp && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.whatsapp}</p>}
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-2 sm:py-2.5 rounded-xl font-medium text-sm sm:text-base hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> {isLogin ? "Signing in..." : "Creating..."}</>
            ) : (
              <>{isLogin ? "Sign In" : "Create Account"} <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></>
            )}
          </button>
        </form>

        <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-gray-100 text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setTouched({}); }} className="ml-2 text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
              {isLogin ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}