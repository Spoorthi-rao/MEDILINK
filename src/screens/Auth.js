import React, { useState } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/auth';

export default function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'doctor',
    name: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { data } = await axios.post(`${BASE_URL}/login`, {
          username: formData.username,
          password: formData.password
        });
        localStorage.setItem('ml_token', data.token);
        onAuth(data.user);
      } else {
        await axios.post(`${BASE_URL}/register`, formData);
        setIsLogin(true);
        setError('Account created! Please login now.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[120px] opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-100 rounded-full blur-[120px] opacity-40 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-8 sm:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-500 hover:shadow-[0_25px_60px_rgba(15,23,42,0.1)]">
          
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-primary-500/30 mb-6 transition-transform hover:scale-105 duration-300">
              +
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">MediLink</h1>
            <p className="text-slate-500 font-medium max-w-xs leading-relaxed">
              {isLogin ? 'Welcome back! Securely manage your hospital records.' : 'Join the medical network and streamline your practice.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Dr. Sarah Johnson"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all font-medium text-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Professional Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:bg-white focus:border-primary-500 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="doctor">🩺 Doctor</option>
                    <option value="receptionist">📝 Receptionist</option>
                    <option value="pharmacy">💊 Pharmacy</option>
                    <option value="lab">🧪 Laboratory</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="Hospital ID / Email"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all font-medium text-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all font-medium text-slate-700"
              />
            </div>

            {error && (
              <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${error.includes('Account created') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                <span className="text-lg">{error.includes('Account created') ? '✅' : '⚠️'}</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-primary-500/20 hover:shadow-primary-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait text-lg flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                isLogin ? 'Sign In →' : 'Create Account →'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-slate-500 font-semibold hover:text-primary-600 transition-colors py-2 px-4 rounded-xl hover:bg-slate-50"
            >
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
        
        <p className="mt-8 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
          Powered by MediLink Hospital Network
        </p>
      </div>
    </div>
  );
}
