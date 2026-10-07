'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LoginPage() {
  const [usernameOrPhone, setUsernameOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        username_or_phone: usernameOrPhone,
        password,
      });
      
      const { access_token } = response.data;
      
      // Fetch user profile immediately after login
      const userResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      login(access_token, userResponse.data);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-signal-dark py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-signal-darkPanel p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-signal-darkBorder">
        <div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Sign in to Signal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link href="/register" className="font-medium text-signal-blue hover:text-signal-blueHover">
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-100 dark:border-red-900/50">
              <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number or Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-signal-darkBorder bg-white dark:bg-signal-dark px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-signal-blue focus:outline-none focus:ring-1 focus:ring-signal-blue sm:text-sm transition-colors"
                placeholder="+1234567890 or username"
                value={usernameOrPhone}
                onChange={(e) => setUsernameOrPhone(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password (Mock OTP)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-signal-darkBorder bg-white dark:bg-signal-dark px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-signal-blue focus:outline-none focus:ring-1 focus:ring-signal-blue sm:text-sm transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-lg border border-transparent bg-signal-blue py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-signal-blueHover focus:outline-none focus:ring-2 focus:ring-signal-blue focus:ring-offset-2 dark:focus:ring-offset-signal-darkPanel disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
