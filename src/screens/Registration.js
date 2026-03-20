import { useState } from 'react';
import { registerPatient } from '../api';

export default function Registration() {
  const [formData, setFormData] = useState({ name: '', age: '', gender: 'Male', language: 'ta', phone: '', blood_group: '' });
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const [errorDetails, setErrorDetails] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await registerPatient(formData);
      setResult(data);
      setFormData({ name: '', age: '', gender: 'Male', language: 'ta', phone: '', blood_group: '' });
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      const details = err.response?.data?.details || '';
      setError(msg);
      setErrorDetails(details);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setError(null);
    setErrorDetails('');
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-white px-8 py-6 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800">New Patient Registration</h2>
        <p className="text-slate-500 mt-1">Enter patient details to generate a unique Patient ID.</p>
      </div>

      <div className="p-8">
        {result && (
          <div className="mb-8 p-6 bg-primary-50 border border-primary-200 rounded-2xl flex flex-col items-center text-center animate-fade-in">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xl mb-3">✓</div>
            <h3 className="text-lg font-bold text-primary-800">Registration Successful</h3>
            <p className="text-primary-600 mt-1 mb-4">Patient has been registered with the following ID:</p>
            <div className="bg-white px-6 py-3 rounded-xl border border-primary-100 shadow-sm font-mono text-3xl font-bold text-primary-600 tracking-wider">
              {result.patient_id}
            </div>
            <button onClick={resetForm} className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-700">
              Register Another Patient
            </button>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col items-center text-center animate-fade-in">
            <div className="flex items-center gap-2 text-red-700 font-bold">
              <span className="text-lg">⚠️</span>
              {error}
            </div>
            {errorDetails && <p className="text-xs text-red-500 mt-1">{errorDetails}</p>}
            <p className="text-[10px] text-red-400 mt-2 uppercase font-bold tracking-widest">Database Busy or Network Issue — Please Retry</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" onChange={() => error && setError(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Full Name</label>
              <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all placeholder-slate-400 text-slate-700 font-medium"
                placeholder="Ex. Ramu Kumar" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Age</label>
              <input required type="number" value={formData.age} onChange={e=>setFormData({...formData, age: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all placeholder-slate-400 text-slate-700 font-medium"
                placeholder="Ex. 45" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Gender</label>
              <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all appearance-none bg-white text-slate-700 font-medium cursor-pointer">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Primary Language</label>
              <select value={formData.language} onChange={e=>setFormData({...formData, language: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all appearance-none bg-white text-slate-700 font-medium cursor-pointer">
                <option value="ta">Tamil</option>
                <option value="hi">Hindi</option>
                <option value="te">Telugu</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Phone</label>
              <input type="tel" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all placeholder-slate-400 text-slate-700 font-medium"
                placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Blood Group</label>
              <select value={formData.blood_group} onChange={e=>setFormData({...formData, blood_group: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all appearance-none bg-white text-slate-700 font-medium cursor-pointer">
                <option value="">Unknown</option>
                <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-4 mt-6 bg-primary-600 hover:bg-primary-700 text-white text-lg font-bold rounded-xl shadow-md shadow-primary-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? 'Processing...' : 'Generate Patient ID'}
          </button>
        </form>
      </div>
    </div>
  );
}
