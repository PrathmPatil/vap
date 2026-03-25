import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AuthForm() {
  const { login, register } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
// username, email, password, phoneNumber, whatsappNumber
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    whatsappNumber: "",
    isWhatsapp: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      login(form.email, form.password);
    } else {
      register(form.name, form.email, form.password, form.phoneNumber, form.isWhatsapp ? form.phoneNumber : form.whatsappNumber);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8">

      <h2 className="text-2xl font-bold text-center mb-6">
        {isLogin ? "Login" : "Create Account"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        {!isLogin && (
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
            required
          />
        )}

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg"
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg"
          required
        />

        {!isLogin && (
          <>
            <input
              name="phoneNumber"
              placeholder="Phone Number"
              value={form.phoneNumber}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg"
              required
            />
            {/* check phone number is whatsapp by checkbox if not then ask for whatsapp number */}
            <div className="flex items-center">
              <input
                name="isWhatsapp"
                type="checkbox"
                className="mr-2"
                checked={form.isWhatsapp}
                onChange={(e) => setForm({ ...form, isWhatsapp: e.target.checked })}
              />
              <label>Is WhatsApp</label>
            </div>
            <input
              name="whatsappNumber"
              placeholder="WhatsApp Number"
              value={form.isWhatsapp ? form.phoneNumber : form.whatsappNumber}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg"
              required
            />
          </>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700"
        >
          {isLogin ? "Login" : "Register"}
        </button>

      </form>

      <p className="text-center mt-4 text-sm">

        {isLogin ? "Don't have an account?" : "Already have an account?"}

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="ml-2 text-indigo-600 font-medium"
        >
          {isLogin ? "Register" : "Login"}
        </button>

      </p>
    </div>
  );
}