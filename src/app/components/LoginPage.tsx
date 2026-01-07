'use client';

import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import logo from '../../assets/c1e60e7780162b6f7a1ab33de09eea29e15bc73b.png';
import { MigrationAnimation } from './MigrationAnimation';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://192.168.18.35:8080/auth/login', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const responseText = await response.text();
      let data: unknown = null;

      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.warn('Login response was not JSON:', parseError);
        data = responseText;
      }

      console.log('Login response:', data);

      if (
        response.ok &&
        data &&
        typeof data === 'object' &&
        'success' in data &&
        'accessToken' in data &&
        (data as { success?: boolean }).success &&
        (data as { accessToken?: string | null }).accessToken
      ) {
        localStorage.setItem(
          'accessToken',
          (data as { accessToken: string }).accessToken
        );
        router.push('/source');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Half - Login Form */}
      <div className="w-full lg:w-1/2 flex items-start justify-center px-8 py-12 lg:px-16 pt-24 lg:pt-32 relative font-['Montserrat']">
        {/* Logo in Top Left */}
        <div className="absolute top-8 left-8">
          <Image src={logo} alt="Royal Cyber" className="h-16 w-auto" priority />
        </div>
        
        {/* Login Form Card */}
        <div className="bg-gray-100 rounded-2xl p-10 w-full border border-gray-200 shadow-sm">
          {/* Header */}
          <div className="mb-10 space-y-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-700 leading-tight">
              LOGIN TO ROYAL CYBER MIGRATION WORKSPACE
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Connect, back up, and migrate Queue Managers across environments with guided steps.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Username
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter your username"
                  className="w-full pr-10 border border-gray-300 bg-white focus-visible:border-gray-400 focus-visible:ring-1 focus-visible:ring-gray-400"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full pr-10 border border-gray-300 bg-white focus-visible:border-gray-400 focus-visible:ring-1 focus-visible:ring-gray-400"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Device and Forgot Password */}
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberDevice}
                  onCheckedChange={(checked) => setRememberDevice(checked === true)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  Remember this device
                </label>
              </div>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-700 font-medium underline hover:font-semibold">
                Forgot password?
              </a>
            </div>

            {/* Continue Button */}
            <Button
              type="submit"
              className="w-full bg-black hover:bg-neutral-800 text-gray-200 py-6 flex items-center justify-center relative"
              disabled={isSubmitting}
            >
              <span className="mx-auto">{isSubmitting ? 'Logging in...' : 'Login'}</span>
              <ArrowRight className="h-4 w-4 text-gray-300 absolute right-4" />
            </Button>

            {/* Help Text */}
            <p className="text-center text-sm text-gray-600 underline hover:font-semibold">
              Need help? Contact your team administrator.
            </p>
          </form>
        </div>
      </div>

      {/* Right Half - Migration Animation */}
      <div className="hidden lg:block w-1/2">
        <MigrationAnimation />
      </div>
    </div>
  );
}
