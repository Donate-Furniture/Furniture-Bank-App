// File: app/auth/reset-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
      if (!token) {
          setStatus('error');
          setMessage('Missing reset token.');
      }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        setMessage("Passwords do not match");
        setStatus('error');
        return;
    }

    setStatus('loading');
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setStatus('success');
      setTimeout(() => router.push('/auth'), 3000); // Redirect after 3s

    } catch (error: any) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  if (!token) return <p className="p-10 text-center text-red-500">Invalid Link</p>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            Set new password
          </h2>
        </div>

        {status === 'success' ? (
             <div className="rounded-md bg-green-50 p-4 text-center">
                <h3 className="text-lg font-medium text-green-800">Success!</h3>
                <p className="text-green-700 mt-2">Your password has been reset. Redirecting to login...</p>
             </div>
        ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                {status === 'error' && (
                    <div className="bg-red-50 text-red-500 p-3 rounded text-sm text-center">
                        {message}
                    </div>
                )}
                
                <div className="rounded-md shadow-sm space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                    <input
                        type="password"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input
                        type="password"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400"
                >
                    {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>
        )}
      </div>
    </div>
  );
}