// File: app/auth/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from 'next/link'; 

export default function AuthPage() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "register" ? false : true;

  const [isLogin, setIsLogin] = useState(initialMode);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    province: "",
    postalCode: "",
  });

  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLogin) {
      // --- LOGIN LOGIC (NextAuth) ---
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
      }
    } else {
      // --- REGISTER LOGIC ---
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Registration failed");
        }

        const result = await signIn("credentials", {
          redirect: false,
          email: formData.email,
          password: formData.password,
        });

        if (result?.ok) {
          router.push("/");
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleSocialLogin = (provider: string) => {
    signIn(provider.toLowerCase(), { callbackUrl: "/" });
  };

   return (
    <div className="flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? 'Sign in to access your account' : 'Join the community to trade furniture'}
          </p>
        </div>

        {/* --- SOCIAL LOGIN SECTION --- */}
        {isLogin && (
          <div className="mt-6 space-y-3">
              {/* Google Button */}
              <button 
                  onClick={() => handleSocialLogin('Google')}
                  className="relative w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                  <div className="absolute left-4 flex items-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                  </div>
                  <span>Continue with Google</span>
              </button>

              {/* Facebook Button */}
              <button 
                  onClick={() => handleSocialLogin('Facebook')}
                  className="relative w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                  <div className="absolute left-4 flex items-center">
                      <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                  </div>
                  <span>Continue with Facebook</span>
              </button>

              {/* Apple Button */}
              <button 
                  onClick={() => handleSocialLogin('Apple')}
                  className="relative w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                  <div className="absolute left-4 flex items-center">
                      <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                      </svg>
                  </div>
                  <span>Continue with Apple</span>
              </button>
          </div>
        )}

        {isLogin && (
          <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">Or with email</span>
              </div>
          </div>
        )}
        
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="bg-red-50 text-red-500 p-3 rounded text-sm text-center">{error}</div>}
          
          <div className="rounded-md shadow-sm space-y-4">
            
            {/* --- REGISTER FIELDS --- */}
            {!isLogin && (
              <>
                <div className="flex gap-4">
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <input name="firstName" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.firstName} onChange={handleChange} />
                    </div>
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <input name="lastName" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.lastName} onChange={handleChange} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input name="phoneNumber" type="tel" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.phoneNumber} onChange={handleChange} />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Street Address</label>
                    <input name="streetAddress" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.streetAddress} onChange={handleChange} />
                </div>

                <div className="flex gap-4">
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <input name="city" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.city} onChange={handleChange} />
                    </div>
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Province/State</label>
                        <input name="province" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.province} onChange={handleChange} />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                    <input name="postalCode" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.postalCode} onChange={handleChange} />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input name="email" type="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.email} onChange={handleChange} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input name="password" type="password" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.password} onChange={handleChange} />
            </div>
          </div>

          {/* ✅ NEW: Forgot Password Link (Only for Login) */}
          {isLogin && (
            <div className="flex justify-end">
              <Link 
                href="/auth/forgot-password" 
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Forgot your password?
              </Link>
            </div>
          )}

          <div>
            <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none">
              {isLogin ? 'Sign in' : 'Register'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-6">
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}