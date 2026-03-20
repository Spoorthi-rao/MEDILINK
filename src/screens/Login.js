import React from 'react';

export default function Login({ onLogin }) {
  const roles = [
    { id: 'receptionist', name: 'Receptionist', icon: '📝' },
    { id: 'doctor', name: 'Doctor', icon: '🩺' },
    { id: 'pharmacy', name: 'Pharmacy', icon: '💊' },
    { id: 'lab', name: 'Laboratory', icon: '🧪' },
    { id: 'patient', name: 'Patient', icon: '👤' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden absolute inset-0">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-md bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 m-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary-500/30 mb-5">
            +
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">MediLink</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Select your role to continue</p>
        </div>

        <div className="space-y-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => onLogin(role.id)}
              className="w-full flex items-center p-4 rounded-2xl border border-slate-100 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300 bg-slate-50 hover:bg-white group text-left"
            >
              <span className="text-2xl mr-4 group-hover:scale-110 transition-transform duration-300 bg-white shadow-sm p-3 rounded-xl">{role.icon}</span>
              <span className="font-semibold text-slate-700 group-hover:text-primary-600 transition-colors">{role.name}</span>
              <span className="ml-auto text-primary-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
