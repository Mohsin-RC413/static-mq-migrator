'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import logo from '../../assets/c1e60e7780162b6f7a1ab33de09eea29e15bc73b.png';
import { MigrationAnimation } from './MigrationAnimation';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Half - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-8 relative">
        {/* Logo in Top Left */}
        <div className="absolute top-8 left-8">
          <Image src={logo} alt="Royal Cyber" className="h-16 w-auto" priority />
        </div>
        
        {/* Login Form Card */}
        <div className="bg-gray-50 rounded-xl p-8 max-w-md w-full border-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-500 mb-3">
              LOGIN TO ROYAL CYBER MIGRATION WORKSPACE
            </h1>
            <p className="text-gray-600">
              Connect, back up, and migrate Queue Managers across environments with guided steps.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            {/* Email/Username Field */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email / Username
              </label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="mohsin@company.com"
                  className="w-full pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full pr-10"
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberDevice}
                  onCheckedChange={(checked) => setRememberDevice(checked === true)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-gray-600 cursor-pointer select-none"
                >
                  Remember this device
                </label>
              </div>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Forgot password?
              </a>
            </div>

            {/* Continue Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-6 flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Help Text */}
            <p className="text-center text-sm text-gray-500 mt-6">
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
