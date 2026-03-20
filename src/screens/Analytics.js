import { useState, useEffect } from 'react';
import axios from 'axios';

const BASE = 'http://localhost:5000/api';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${BASE}/analytics/dashboard`);
      setStats(data);
    } catch (err) {
      console.error("Analytics fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-slate-400 font-medium">Crunching hospital data...</div>;
  if (!stats) return <div className="text-center p-10 text-red-500">Failed to load analytics.</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Hospital Analytics</h2>
          <p className="text-slate-500 mt-1 font-medium">Real-time insights on patient volume and symptoms</p>
        </div>
        <button onClick={fetchStats} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Patients" value={stats.totalPatients} icon="👥" color="bg-blue-500" />
        <StatCard title="Total Consults" value={stats.totalConsults} icon="🩺" color="bg-teal-500" />
        <StatCard title="Today's Volume" value={stats.weeklyVolume?.[stats.weeklyVolume.length-1]?.count || 0} icon="📈" color="bg-purple-500" />
        <StatCard title="Active Pharmacy" value="12" icon="💊" color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Patient Volume Chart (SVG) */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="text-2xl">📉</span> Patient Volume (Last 7 Days)
          </h3>
          <div className="h-64 w-full relative group">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 150">
               {/* Simple Area Chart */}
               <path 
                 d={`M 0,150 ${stats.weeklyVolume.map((v, i) => `L ${i * (400/(stats.weeklyVolume.length-1 || 1))},${150 - (v.count * 10)}`).join(' ')} L 400,150 Z`}
                 className="fill-teal-500/10 stroke-none transition-all duration-500"
               />
               <path 
                 d={stats.weeklyVolume.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * (400/(stats.weeklyVolume.length-1 || 1))},${150 - (v.count * 10)}`).join(' ')}
                 className="fill-none stroke-teal-500 stroke-[3] transition-all duration-500"
               />
               {/* Data Points */}
               {stats.weeklyVolume.map((v, i) => (
                 <g key={i}>
                   <circle 
                     cx={i * (400/(stats.weeklyVolume.length-1 || 1))} 
                     cy={150 - (v.count * 10)} 
                     r="4" 
                     className="fill-white stroke-teal-500 stroke-2" 
                   />
                   <text 
                     x={i * (400/(stats.weeklyVolume.length-1 || 1))} 
                     y={150 - (v.count * 10) - 10} 
                     textAnchor="middle" 
                     className="text-[10px] font-bold fill-slate-400"
                   >
                     {v.count}
                   </text>
                 </g>
               ))}
            </svg>
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
             {stats.weeklyVolume.map((v, i) => <div key={i}>{v._id.split('-').slice(1).join('/')}</div>)}
          </div>
        </div>

        {/* Top Symptoms Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="text-2xl">🤒</span> Top 5 Symptoms
          </h3>
          <div className="space-y-5">
            {stats.topSymptoms.length > 0 ? stats.topSymptoms.map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>{s._id}</span>
                  <span className="text-teal-600">{s.count} cases</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-1000"
                    style={{ width: `${(s.count / stats.totalConsults) * 100}%` }}
                  ></div>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-400 italic">No symptoms recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className={`absolute -right-4 -bottom-4 w-20 h-20 ${color} opacity-[0.03] rounded-full group-hover:scale-110 transition-transform`}></div>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${color} bg-opacity-10 rounded-2xl flex items-center justify-center text-2xl shadow-inner`}>
          {icon}
        </div>
        <div>
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{value}</div>
        </div>
      </div>
    </div>
  );
}
