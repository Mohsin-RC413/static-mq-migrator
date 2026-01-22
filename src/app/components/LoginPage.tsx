'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import logo from '../../assets/c1e60e7780162b6f7a1ab33de09eea29e15bc73b.png';
import { MigrationAnimation } from './MigrationAnimation';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';

export function LoginPage() {
  const [rememberDevice, setRememberDevice] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastTone, setToastTone] = useState<'success' | 'error' | ''>('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastProgress, setToastProgress] = useState(100);
  const toastDurationMs = 3000;
  const toastFadeMs = 300;
  const router = useRouter();

  useEffect(() => {
    if (!toastMessage) {
      setToastVisible(false);
      setToastProgress(100);
      return;
    }
    setToastVisible(true);
    setToastProgress(100);
    const animationFrame = requestAnimationFrame(() => {
      setToastProgress(0);
    });
    const fadeDelay = Math.max(toastDurationMs - toastFadeMs, 0);
    const fadeTimer = setTimeout(() => setToastVisible(false), fadeDelay);
    const clearTimer = setTimeout(() => {
      setToastMessage('');
      setToastTone('');
    }, toastDurationMs);
    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [toastMessage, toastDurationMs, toastFadeMs]);

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
        localStorage.setItem(
          'loginToast',
          JSON.stringify({ message: 'Log in Success', tone: 'success' })
        );
        router.push('/source');
      } else {
        setToastMessage('Invalid Credentials');
        setToastTone('error');
      }
    } catch (error) {
      console.error('Login error:', error);
      setToastMessage('Invalid Credentials');
      setToastTone('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerClipPath =
    'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))';

  return (
    <div className="min-h-screen bg-gray-50 flex font-['Roboto']">
      {/* Left Half - Login Form */}
      <div className="w-full lg:w-1/2 flex items-start justify-center px-8 py-12 lg:px-16 pt-24 lg:pt-32 relative">
        {/* Login Form Card */}
        <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
          <div
            className="bg-[#0b3b5a] px-8 py-5"
            style={{
              clipPath: headerClipPath,
            }}
          >
            <div className="flex items-center justify-center gap-4">
              <div
                className="relative h-10 bg-white overflow-hidden"
                style={{ clipPath: headerClipPath, aspectRatio: '483 / 163' }}
              >
                <Image
                  src={logo}
                  alt="Royal Cyber"
                  fill
                  sizes="120px"
                  className="object-contain"
                  priority
                />
              </div>
              <div className="h-6 w-px bg-white/40" />
              <span className="text-sm font-semibold tracking-[0.28em] text-white">
                MIGRATION
              </span>
            </div>
          </div>

          <div className="px-8 py-10 lg:px-10">
            {/* Header */}
            <div className="mb-8 space-y-3">
              <h1 className="text-3xl font-semibold text-slate-900 leading-tight">
                Royal Cyber Migration Workspace
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Connect, back up, and migrate IBM MQ across environments with guided steps.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Username
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter your username"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
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
                    className="text-sm text-slate-600 cursor-pointer select-none"
                  >
                    Remember this device
                  </label>
                </div>
                <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-800 underline underline-offset-4">
                  Forgot password?
                </a>
              </div>

              {/* Continue Button */}
              <Button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-6 text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800 flex items-center justify-center relative"
                disabled={isSubmitting}
              >
                <span className="mx-auto">{isSubmitting ? 'Logging in...' : 'Login'}</span>
                <ArrowRight className="h-4 w-4 text-white/70 absolute right-4" />
              </Button>

              {/* Help Text */}
              <p className="text-center text-sm text-slate-500 underline underline-offset-4 hover:text-slate-700">
                Need help? Contact your team administrator.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Right Half - Migration Animation */}
      <div className="hidden lg:block w-1/2">
        <MigrationAnimation />
      </div>

      {toastMessage ? (
        <div
          className={`fixed bottom-6 right-6 z-50 w-72 rounded-xl border bg-white shadow-lg px-4 py-3 transition-opacity duration-300 ${
            toastVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              toastTone === 'error' ? 'text-red-600' : 'text-gray-800'
            }`}
          >
            {toastMessage}
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-[width] ease-linear ${
                toastTone === 'error' ? 'bg-red-500' : 'bg-gray-900'
              }`}
              style={{ width: `${toastProgress}%`, transitionDuration: `${toastDurationMs}ms` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
