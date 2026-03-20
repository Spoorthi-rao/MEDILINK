import { useState } from 'react';
import { getPendingTests, uploadResult } from '../api';

export default function TestOrders() {
  const [patientId, setPatientId] = useState('');
  const [tests, setTests]         = useState([]);
  const [patient, setPatient]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [resultsInput, setResultsInput] = useState({});

  const fetchOrders = async () => {
    if (!patientId.trim()) return;
    setLoading(true);
    setTests([]);
    setPatient(null);
    try {
      const { data } = await getPendingTests(patientId);
      setTests(data);
      const pRes = await import('../api').then(m => m.getPatient(patientId));
      setPatient(pRes.data);
    } catch (err) {
      alert('Patient not found or error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (order_id) => {
    const res = resultsInput[order_id];
    if (!res) return alert('Enter a result first');
    try {
      await uploadResult(order_id, res);
      setTests(prev => prev.map(t =>
        t.order_id === order_id ? { ...t, status: 'completed', result: res } : t
      ));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[calc(100vh-140px)]">
      {/* Print Header */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
        <h1 className="text-3xl font-bold font-serif mb-2">MediLink — Laboratory Test Report</h1>
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
              <span className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shadow-sm text-2xl">🧪</span>
              Laboratory Orders
            </h2>
            <p className="text-slate-500 mt-2 font-medium ml-1">Look up patient ID and input test results</p>
          </div>
          <button onClick={handlePrint} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-xl shadow-sm transition-all flex items-center gap-2">
            🖨 Print Report
          </button>
        </div>

        <div className="flex gap-3 mb-10 max-w-xl bg-slate-50 p-2.5 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-400 focus-within:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
          <input value={patientId} onChange={e => setPatientId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrders()}
            placeholder="Enter Patient ID — e.g. P·3A2F·K9"
            className="flex-1 px-5 py-3.5 bg-transparent font-mono text-purple-700 font-bold outline-none placeholder-slate-400 text-lg uppercase tracking-wide" />
          <button onClick={fetchOrders} disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 rounded-xl shadow-[0_4px_14px_rgba(147,51,234,0.3)] transition-all whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed text-lg">
            {loading ? 'Searching...' : 'Fetch Orders'}
          </button>
        </div>
      </div>

      {tests.length > 0 && (
        <div className="animate-fade-in">
          {patient && (
            <div className="print:hidden mb-8 bg-gradient-to-r from-purple-50 to-white border border-purple-100 p-6 rounded-2xl flex items-center gap-6 shadow-sm">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center font-bold text-2xl text-purple-600 shadow-sm border border-purple-100">
                {patient.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">{patient.name}</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">Age {patient.age} • {patient.gender}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Test Name', 'Urgency', 'Result', 'Status', 'Action'].map(h => (
                    <th key={h} className={`py-5 px-6 text-[11px] font-bold uppercase tracking-widest text-slate-500 ${h==='Action'?'print:hidden text-right':''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tests.map(t => (
                  <tr key={t.order_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-slate-800 text-[15px]">{t.test_name}</td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border shadow-sm ${t.urgency.toLowerCase() === 'urgent' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
                        {t.urgency}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      {t.status === 'completed' ? (
                        <span className="font-bold text-slate-800 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 block w-fit">{t.result}</span>
                      ) : (
                        <input type="text" placeholder="Enter measurement..."
                           value={resultsInput[t.order_id] || ''}
                           onChange={e => setResultsInput({...resultsInput, [t.order_id]: e.target.value})}
                           className="print:hidden w-full max-w-[220px] border-2 border-slate-200 px-4 py-2.5 rounded-xl bg-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm font-bold transition-all text-slate-800 placeholder-slate-400" />
                      )}
                    </td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border flex-shrink-0 whitespace-nowrap ${t.status === 'completed' ? 'bg-primary-50 text-primary-700 border-primary-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status==='completed'?'bg-primary-500':'bg-amber-500'}`}></span>
                        {t.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right print:hidden">
                      {t.status === 'pending' ? (
                        <button onClick={() => handleUpload(t.order_id)}
                          className="bg-white border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-400 text-purple-700 font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm">
                          Upload Result
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
          
          <div className="hidden print:block mt-24 border-t-2 border-slate-800 pt-8 w-64 float-right text-center mr-8">
            <span className="text-slate-800 font-bold uppercase tracking-widest text-xs">Lab Technician Signature</span>
          </div>
        </div>
      )}
    </div>
  );
}
