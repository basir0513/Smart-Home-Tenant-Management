import React, { useState } from 'react';
import { registerWithEmail, loginWithEmail, signIn, resetPassword } from '../firebase';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Chrome, Key } from 'lucide-react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nidPassport, setNidPassport] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [homeName, setHomeName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isResetting) {
        await resetPassword(email);
        setSuccess('Password reset email sent! Please check your inbox.');
        setIsResetting(false);
      } else if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, firstName, lastName, nidPassport, mobileNo, homeName);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/invalid-credential') {
        if (email.toLowerCase() === 'basirudden644@gmail.com') {
          setError('Admin Account: If you haven\'t set a password yet, please use the "Google Account" button below or click "Create Account" to set a password.');
        } else {
          setError('Invalid email or password. If you are new, please click "Create Account" below.');
        }
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please Sign In instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Please Register.');
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await signIn();
    } catch (err: any) {
      setError(err.message || 'Google Sign In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 p-8 md:p-10">
        <div className="text-center mb-8">
          <img 
            src="/api/attachments/input_file_0.png" 
            alt="Smart Home Logo" 
            className="w-48 h-auto mx-auto mb-8"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {isResetting ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
          </h1>
          <p className="text-slate-400 mt-2">
            {isResetting 
              ? 'Enter your email to receive a reset link'
              : (isLogin 
                ? 'Sign in to manage your property' 
                : 'Register to start managing your tenants')}
          </p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-slate-800 border border-slate-700 text-white py-3 px-4 rounded-2xl font-medium hover:bg-slate-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            <Chrome className="w-5 h-5 text-blue-400" />
            Continue with Google Account
          </button>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-widest font-semibold">Or use email</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && !isResetting && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Doe"
                />
              </div>
            </div>
          )}

          {!isLogin && !isResetting && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">NID / Passport</label>
                <input
                  type="text"
                  required
                  value={nidPassport}
                  onChange={(e) => setNidPassport(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="ID Number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Mobile No</label>
                <input
                  type="tel"
                  required
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="017XXXXXXXX"
                />
              </div>
            </div>
          )}

          {!isLogin && !isResetting && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Home Name (House Name)</label>
              <input
                type="text"
                required
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="e.g. Dream Villa"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {!isResetting && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setIsResetting(true)}
                    className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-2xl text-sm border border-red-400/20">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 p-4 rounded-2xl text-sm border border-emerald-400/20">
              <AlertCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 px-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                {isResetting ? <Key size={20} /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
                {isResetting ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Register')}
              </>
            )}
          </button>
          
          {isResetting && (
            <button
              type="button"
              onClick={() => setIsResetting(false)}
              className="w-full text-sm text-slate-500 hover:text-white py-2 transition-colors"
            >
              Back to Sign In
            </button>
          )}
        </form>

        <div className="mt-10 text-center border-t border-slate-800 pt-8">
          <p className="text-sm text-slate-500 mb-2">
            {isLogin ? "First time here?" : "Already have an account?"}
          </p>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setIsResetting(false);
              setError('');
              setSuccess('');
            }}
            className="text-blue-400 hover:text-blue-300 font-bold transition-colors"
          >
            {isLogin ? "Create an Admin/User Account" : "Sign In to your Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
