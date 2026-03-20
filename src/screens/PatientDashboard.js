import { useState } from 'react';
import { getPatientRecord } from '../api';
import { generateConsultationPDF } from '../utils/PdfService';

export default function PatientDashboard() {
  const [patientId, setPatientId] = useState('');
  const [record, setRecord]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [lang, setLang]           = useState('en');

  const fetchRecord = async () => {
    if (!patientId.trim()) return;
    setLoading(true);
    try {
      const { data } = await getPatientRecord(patientId);
      setRecord(data);
    } catch (err) {
      alert('Record not found or error: ' + err.message);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  // Simple hardcoded translations for the demo UI labels
  const UI = {
    en: {
      title: 'My Medical Record',
      subtitle: 'View your consultation history, medicines, and lab results',
      search: 'Search',
      diagnosis: 'Primary Diagnosis',
      medicines: 'Your Medicines',
      labs: 'Lab Results',
      history: 'Visit History',
      print: 'Print My Summary',
      medDetail: (rx) => `Take ${rx.medicine} ${rx.dosage} ${rx.frequency} for ${rx.duration}`
    },
    ta: {
      title: 'என் மருத்துவ பதிவு',
      subtitle: 'உங்கள் ஆலோசனை வரலாறு, மருந்துகள் மற்றும் முடிவு பார்க்கவும்',
      search: 'தேடு',
      diagnosis: 'முதன்மை நோய் கண்டறிதல்',
      medicines: 'உங்கள் மருந்துகள்',
      labs: 'ஆய்வக முடிவுகள்',
      history: 'பார்வை வரலாறு',
      print: 'சுருக்கத்தை அச்சிடு',
      medDetail: (rx) => `${rx.medicine} ${rx.dosage} ${rx.frequency} ${rx.duration} காலத்திற்கு எடுத்துக் கொள்ளவும்`
    }
  };

  const t = UI[lang] || UI['en'];
  const p = record?.patient;
  const recentConsult = record?.consultations?.[0];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[calc(100vh-140px)] relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-50 rounded-bl-[100%] opacity-50 pointer-events-none"></div>

      {/* Print Header */}
      <div className="hidden print:block mb-8 border-b-2 border-teal-800 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">+</div>
          <div>
            <h1 className="text-3xl font-bold font-serif">MediLink Patient Summary</h1>
            <p className="text-slate-600">City Hospital Chennai · {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 relative z-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <span className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shadow-sm text-2xl">👤</span>
              {t.title}
            </h2>
            <p className="text-slate-500 mt-2 font-medium ml-1">{t.subtitle}</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <button onClick={() => setLang('en')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${lang === 'en' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>English</button>
            <button onClick={() => setLang('ta')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${lang === 'ta' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>தமிழ்</button>
          </div>
        </div>

        <div className="flex gap-3 mb-10 max-w-xl bg-slate-50 p-2.5 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-400 focus-within:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative z-10">
          <input value={patientId} onChange={e => setPatientId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchRecord()}
            placeholder="Enter Patient ID — e.g. P·3A2F·K9"
            className="flex-1 px-5 py-3.5 bg-transparent font-mono text-teal-700 font-bold outline-none placeholder-slate-400 text-lg tracking-wide uppercase" />
          <button onClick={fetchRecord} disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 rounded-xl shadow-[0_4px_14px_rgba(13,148,136,0.3)] transition-all whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed text-lg">
            {loading ? '...' : t.search}
          </button>
        </div>
      </div>

      {record && p && (
        <div className="animate-fade-in relative z-10 pb-20">
          <div className="mb-8 flex flex-col md:flex-row gap-6">
            
            {/* Left Column: Basic Info & Current Status Card */}
            <div className="md:w-1/3 space-y-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden ring-4 ring-slate-100/50">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-3xl shadow-inner border border-white/20">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">{p.name}</h3>
                    <p className="text-slate-300 font-medium mt-1">Age {p.age} • {p.gender}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 px-4 py-3 rounded-xl border border-white/10">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Patient ID</span>
                    <div className="font-mono text-xl font-bold text-teal-400 tracking-wider uppercase">{p.patient_id}</div>
                  </div>
                  {p.phone && (
                    <div className="bg-white/5 px-4 py-3 rounded-xl border border-white/10">
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Contact</span>
                      <div className="font-medium text-slate-100">{p.phone}</div>
                    </div>
                  )}
                  <div className="bg-white/5 px-4 py-3 rounded-xl border border-white/10">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Blood Group</span>
                    <div className="font-bold text-red-400">{p.blood_group || 'Unknown'}</div>
                  </div>
                </div>

                <button onClick={handlePrint} className="print:hidden w-full mt-8 bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2">
                  🖨 {t.print}
                </button>
              </div>
            </div>

            {/* Right Column: VISUAL TIMELINE OF VISITS */}
            <div className="flex-1">
              <h3 className="text-2xl font-extrabold text-slate-800 mb-8 flex items-center gap-3">
                <span className="w-10 h-10 bg-teal-600/10 text-teal-600 rounded-lg flex items-center justify-center text-lg">📅</span>
                {t.history}
              </h3>

              <div className="relative ml-4 pl-8 border-l-2 border-slate-100 space-y-12">
                {record.consultations?.length > 0 ? record.consultations.map((consult, idx) => {
                  const items = record.prescriptions?.filter(r => r.consultation_id === consult.consultation_id) || [];
                  const labs = record.lab_orders?.filter(l => l.consultation_id === consult.consultation_id) || [];
                  
                  return (
                    <div key={consult.consultation_id} className="relative group">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-sm transition-all duration-300 ${idx === 0 ? 'bg-teal-500 scale-125' : 'bg-slate-300'}`}></div>
                      
                      {/* Date Header */}
                      <div className="mb-4">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100 group-hover:text-teal-600 transition-colors">
                          {new Date(consult.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Consultation Card */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm group-hover:border-teal-200 group-hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                          <div className="flex-1">
                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest block mb-1">Visit Diagnosis</span>
                            <h4 className="text-xl font-bold text-slate-800 leading-tight mb-3 italic">"{consult.diagnosis || 'General Consultation'}"</h4>
                            <div className="flex flex-wrap gap-2">
                              {consult.symptoms?.map((s, i) => (
                                <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg border border-slate-100">{s}</span>
                              ))}
                            </div>
                          </div>
                          <div className="shrink-0 bg-slate-50 px-4 py-2 rounded-xl text-center border border-slate-100 flex flex-col items-center">
                            <span className="text-[9px] text-slate-500 font-bold block">DOCTOR</span>
                            <span className="text-sm font-bold text-slate-700">{consult.doctor_id}</span>
                            <button 
                              onClick={() => generateConsultationPDF(p, consult, items, labs)}
                              className="mt-2 text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase tracking-tighter"
                            >
                              <span>📥</span> PDF
                            </button>
                          </div>
                        </div>

                        {/* Prescriptions nested in card */}
                        {items.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                              <span className="text-lg">💊</span> Prescribed Medicines
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {items.map(rx => (
                                <div key={rx.rx_id} className="p-4 rounded-2xl bg-teal-50/30 border border-teal-100 hover:bg-teal-50 transition-colors">
                                  <div className="font-bold text-teal-900 text-sm mb-0.5">{rx.medicine}</div>
                                  <div className="text-[11px] text-teal-700 font-medium">{t.medDetail(rx)}</div>
                                  <span className="text-[9px] font-black uppercase text-teal-600 mt-2 block opacity-60">{rx.status}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Labs nested in card */}
                        {labs.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                              <span className="text-lg">🧪</span> Lab Investigations
                            </div>
                            <div className="flex flex-wrap gap-4">
                              {labs.map(lab => (
                                <div key={lab.order_id} className="flex-1 min-w-[150px] p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex justify-between items-center group/lab">
                                  <div>
                                    <div className="text-sm font-bold text-slate-700">{lab.test_name}</div>
                                    <div className="text-[11px] font-bold text-amber-700 mt-1">{lab.status === 'completed' ? `Result: ${lab.result}` : 'Awaiting Result...'}</div>
                                  </div>
                                  <div className={`w-2 h-2 rounded-full ${lab.status === 'completed' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`}></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {consult.clinical_notes && (
                          <div className="mt-6 pt-6 border-t border-slate-100">
                             <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Doctor's Clinical Notes</div>
                             <p className="text-sm text-slate-600 leading-relaxed font-serif italic text-justify">{consult.clinical_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-center text-slate-400">
                    <div className="text-4xl mb-4">🏥</div>
                    <p className="font-bold text-lg">No medical visits found.</p>
                    <p className="text-sm">Once the doctor ends a consultation, the history will appear here.</p>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
