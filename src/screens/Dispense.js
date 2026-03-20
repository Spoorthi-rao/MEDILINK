import { useState } from 'react';
import { getPendingRx, markDispensed } from '../api';

export default function Dispense() {
  const [patientId, setPatientId] = useState('');
  const [rxList, setRxList]       = useState([]);
  const [patient, setPatient]     = useState(null);
  const [loading, setLoading]     = useState(false);

  const fetchOrders = async () => {
    if (!patientId.trim()) return;
    setLoading(true);
    setRxList([]);
    setPatient(null);
    try {
      const { data } = await getPendingRx(patientId);
      setRxList(data);
      const pRes = await import('../api').then(m => m.getPatient(patientId));
      setPatient(pRes.data);
    } catch (err) {
      alert('Patient not found or error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (rx_id) => {
    try {
      await markDispensed(rx_id);
      setRxList(prev => prev.map(rx =>
        rx.rx_id === rx_id ? { ...rx, status: 'dispensed' } : rx
      ));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDispenseAll = async () => {
    for (const rx of rxList.filter(r => r.status === 'pending')) {
      await handleDispense(rx.rx_id);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[calc(100vh-140px)]">
      {/* Print Header */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
        <h1 className="text-3xl font-bold font-serif mb-2">MediLink — Pharmacy Dispensing Report</h1>
        <p className="text-slate-600">City Hospital Chennai · {new Date().toLocaleDateString('en-IN')} · {new Date().toLocaleTimeString('en-IN')}</p>
        
        {patient && (
          <div className="mt-6 flex items-center justify-between bg-slate-50 p-4 border border-slate-200">
            <div>
              <span className="font-bold text-slate-800">Patient:</span> {patient.name}
            </div>
            <div>
              <span className="font-bold text-slate-800">ID:</span> {patientId}
            </div>
            <div>
              <span className="font-bold text-slate-800">Age:</span> {patient.age} / {patient.gender}
            </div>
          </div>
        )}
      </div>

      <div className="print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <span className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center shadow-sm text-2xl">💊</span>
              Dispense Medicines
            </h2>
            <p className="text-slate-500 mt-2 font-medium ml-1">Look up patient ID and mark medicines dispensed</p>
          </div>
          <button onClick={handlePrint} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-xl shadow-sm transition-all flex items-center gap-2">
            🖨 Print Report
          </button>
        </div>

        <div className="flex gap-3 mb-10 max-w-xl bg-slate-50 p-2.5 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-400 focus-within:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
          <input value={patientId} onChange={e => setPatientId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrders()}
            placeholder="Enter Patient ID — e.g. P·3A2F·K9"
            className="flex-1 px-5 py-3.5 bg-transparent font-mono text-primary-700 font-bold outline-none placeholder-slate-400 text-lg tracking-wide uppercase" />
          <button onClick={fetchOrders} disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed text-lg">
            {loading ? 'Searching...' : 'Fetch Orders'}
          </button>
        </div>
      </div>

      {rxList.length > 0 && (
        <div className="animate-fade-in">
          {patient && (
            <div className="print:hidden mb-8 bg-gradient-to-r from-blue-50 to-white border border-blue-100 p-6 rounded-2xl flex items-center gap-6 shadow-sm">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center font-bold text-2xl text-blue-600 shadow-sm border border-blue-100">
                {patient.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">{patient.name}</h3>
                <p className="text-slate-500 font-medium mt-1">Age {patient.age} • {patient.gender} • {patient.blood_group || 'Unknown'}</p>
              </div>
              <div className="ml-auto bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1">Patient ID</span>
                <span className="font-mono font-bold text-primary-600 text-lg">{patientId}</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Medicine', 'Dosage', 'Frequency', 'Duration', 'Status', 'Action'].map(h => (
                    <th key={h} className={`py-5 px-6 text-[11px] font-bold uppercase tracking-widest text-slate-500 ${h==='Action'?'print:hidden text-right':''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rxList.map(rx => (
                  <tr key={rx.rx_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-slate-800 text-[15px]">{rx.medicine}</td>
                    <td className="py-5 px-6 text-slate-600 font-medium">{rx.dosage}</td>
                    <td className="py-5 px-6 text-slate-600 font-medium">{rx.frequency}</td>
                    <td className="py-5 px-6 text-slate-600 font-medium">{rx.duration}</td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${rx.status === 'dispensed' ? 'bg-primary-50 text-primary-700 border-primary-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${rx.status==='dispensed'?'bg-primary-500':'bg-amber-500'}`}></span>
                        {rx.status === 'dispensed' ? 'Dispensed' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right print:hidden">
                      {rx.status === 'pending' ? (
                        <button onClick={() => handleDispense(rx.rx_id)}
                          className="bg-white border-2 border-primary-200 hover:bg-primary-50 hover:border-primary-400 text-primary-700 font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm">
                          ✓ Dispense
                        </button>
                      ) : (
                        <span className="text-slate-400 font-bold text-sm px-5 py-2.5 inline-block">Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 flex gap-4 print:hidden justify-end">
            {rxList.some(r => r.status === 'pending') && (
              <button onClick={handleDispenseAll} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-md shadow-primary-500/20 transition-all">
                ✓ Mark All Dispensed
              </button>
            )}
            <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-8 rounded-xl shadow-md transition-all">
              🖨 Print Prescription
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
