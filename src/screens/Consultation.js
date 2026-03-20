import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { generateConsultationPDF } from '../utils/PdfService';

const BASE = 'http://localhost:5000/api';

export default function Consultation() {
  const [patientId, setPatientId] = useState('');
  const [language, setLanguage] = useState('ta');
  const [messages, setMessages] = useState([]);
  const [structured, setStructured] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isDoctorRec, setIsDoctorRec] = useState(false);
  const [isHearing, setIsHearing]     = useState(false);
  const [isDoctorHearing, setIsDoctorHearing] = useState(false);
  const [doctorText, setDoctorText] = useState('');
  const [loading, setLoading] = useState('');
  const [timer, setTimer] = useState(0);
  const [volume, setVolume] = useState(0);

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const doctorMediaRef = useRef(null);
  const doctorChunksRef = useRef([]);
  const timerRef = useRef(null);
  const scrollRef = useRef(null);
  const startTimeRef = useRef(0);
  const patientVAD = useRef({ isSpeaking: false, interval: null });
  const doctorVAD = useRef({ isSpeaking: false, interval: null });
  const audioCtxRef = useRef(null);
  
  // VAD logic: Analyzes audio stream in real-time. 
  const startVAD = (stream, vadRef, setHearing) => {
    vadRef.current.isSpeaking = false;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === 'suspended') audioCtx.resume(); 

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    vadRef.current.interval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      let maxIntense = 0;
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > maxIntense) maxIntense = dataArray[i];
      }
      
      const hearing = maxIntense > 5; 
      if (hearing) vadRef.current.isSpeaking = true;
      setHearing(hearing);
      setVolume(maxIntense); 
    }, 100);
  };

  const LANG_NAMES = {
    ta: 'Tamil', hi: 'Hindi', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam'
  };

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Clean up VAD and timers on exit
  useEffect(() => {
    const currentTimerRef = timerRef.current;
    const pVAD = patientVAD.current;
    const dVAD = doctorVAD.current;
    return () => {
      clearInterval(currentTimerRef);
      if (pVAD?.interval) clearInterval(pVAD.interval);
      if (dVAD?.interval) clearInterval(dVAD.interval);
    };
  }, []);

  // Clear loading state if it gets stuck
  useEffect(() => {
    let timeoutId;
    if (loading) {
      timeoutId = setTimeout(() => {
        setLoading('');
      }, 15000); // Clear loading after 15 seconds
    }
    return () => clearTimeout(timeoutId);
  }, [loading]);

  // ── Speak text in patient language using Backend gTTS ──
  const playAudio = async (textToSpeak) => {
    if (!textToSpeak) return;
    console.log(`[TTS] Playing: ${language} | Text: ${textToSpeak.slice(0, 30)}...`);
    try {
      const { data } = await axios.post(`${BASE}/consultation/speak`, { text: textToSpeak, language });
      if (!data.audio) throw new Error("No audio data returned from server");

      const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
      audio.onerror = (e) => console.error("Audio Load Error:", e);
      await audio.play();
    } catch (err) {
      console.error("TTS Playback Failed:", err.message);
      // Fallback: If heavy gTTS fails, maybe suggest the user to refresh or check volume
    }
  };

  /* ══ PATIENT MIC ══════════════════════════════════════════
     Patient holds button → records → Groq Whisper transcribes
     → Groq Llama translates to English → shows in chat
  ══════════════════════════════════════════════════════════ */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: false // Disabled to prevent static amplification during silence
        } 
      });
      mediaRef.current = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000 
      });
      chunksRef.current = [];
      mediaRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRef.current.onstop = handlePatientStop;
      mediaRef.current.start(); 
      startTimeRef.current = Date.now();
      startVAD(stream, patientVAD, setIsHearing); 
      setIsRecording(true);
      let s = 0;
      timerRef.current = setInterval(() => setTimer(++s), 1000);
    } catch (err) {
      alert('Microphone permission denied. Please allow mic access in browser.');
    }
  };

  const stopRecording = () => {
    if (!mediaRef.current) return;
    clearInterval(timerRef.current);
    if (patientVAD.current?.interval) clearInterval(patientVAD.current.interval); 
    setIsHearing(false);

    setTimeout(() => {
      if (mediaRef.current && mediaRef.current.state === 'recording') {
        mediaRef.current.stop();
      }
      setIsRecording(false);
      setTimer(0);
    }, 500); 
  };

  const handlePatientStop = async () => {
    setIsRecording(false); 
    const duration = (Date.now() - startTimeRef.current) / 1000;
    console.log(`[DEBUG] Patient Stop. Duration: ${duration}s Chunks: ${chunksRef.current.length}`);

    if (chunksRef.current.length === 0) {
      setLoading('AI heard nothing. Please speak into the mic.');
      setTimeout(() => setLoading(''), 2000);
      return; 
    }

    if (duration < 1.5) {
      setLoading('Recording too short! Please speak for at least 2 seconds.');
      setTimeout(() => setLoading(''), 2000);
      return;
    }
    
    setLoading('Transcribing patient speech...');
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
      console.log(`[DEBUG] Sending blob to server: ${blob.size} bytes`);
      const formData = new FormData();
      formData.append('audio', blob, 'patient.webm');
      formData.append('language', language);

      const { data } = await axios.post(`${BASE}/consultation/transcribe-patient`, formData);

      if (data.ignored) {
        setLoading(`AI heard only silence or "${data.raw || 'nothing'}". Try again!`);
        setTimeout(() => setLoading(''), 3000);
        return;
      }

      setMessages(prev => [...prev, {
        role: 'patient',
        original: data.original,
        translated: data.translated,
        language: LANG_NAMES[language]
      }]);

    } catch (err) {
      alert('Patient mic error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading('');
    }
  };

  /* ══ DOCTOR MIC ═══════════════════════════════════════════
     Doctor holds button → records in English → Whisper
     → Groq Llama translates to Tamil → Browser speaks Tamil
  ══════════════════════════════════════════════════════════ */
  const startDoctorRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: false // Disabled to prevent static amplification during silence
        } 
      });
      doctorMediaRef.current = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000 
      });
      doctorChunksRef.current = [];
      doctorMediaRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) doctorChunksRef.current.push(e.data);
      };
      doctorMediaRef.current.onstop = handleDoctorStop;
      doctorMediaRef.current.start();
      startVAD(stream, doctorVAD, setIsDoctorHearing); 
      setIsDoctorRec(true);
    } catch (err) {
      console.error('Mic Error:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopDoctorRecording = () => {
    if (!doctorMediaRef.current) return;
    if (doctorVAD.current?.interval) clearInterval(doctorVAD.current.interval); 
    setIsDoctorHearing(false);

    setTimeout(() => {
      if (doctorMediaRef.current && doctorMediaRef.current.state === 'recording') {
        doctorMediaRef.current.stop();
      }
      setIsDoctorRec(false);
    }, 800);
  };

  const handleDoctorStop = async () => {
    setIsDoctorRec(false); 
    console.log(`[DEBUG] Doctor Stop. Chunks: ${doctorChunksRef.current.length}`);
    if (doctorChunksRef.current.length === 0) return;
    
    setLoading('Translating to patient language...');
    try {
      const blob = new Blob(doctorChunksRef.current, { type: 'audio/webm;codecs=opus' });
      console.log(`[DEBUG] Sending doctor blob: ${blob.size} bytes`);
      const formData = new FormData();
      formData.append('audio', blob, 'doctor.webm');
      formData.append('targetLang', language);

      // Backend now handles STT -> Llama Translation in one fast call
      const { data } = await axios.post(`${BASE}/consultation/transcribe-doctor`, formData);
      
      if (data.ignored) return; // Drop silence hallucinations

      // Speak in patient's language — using Backend gTTS
      playAudio(data.translated);

      setMessages(prev => [...prev, {
        role: 'doctor',
        text: data.englishText,
        translated: data.translated
      }]);

    } catch (err) {
      alert('Doctor mic error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading('');
    }
  };

  /* ══ DOCTOR TEXT RESPONSE ═════════════════════════════════
     Doctor types English → Groq Llama translates to Tamil
     → Browser speaks Tamil aloud to patient
  ══════════════════════════════════════════════════════════ */
  const sendDoctorResponse = async () => {
    if (!doctorText.trim()) return;
    setLoading('Translating & Speaking...');
    try {
      // Translate English → patient language via Groq
      const { data } = await axios.post(
        `${BASE}/consultation/translate-to-patient`,
        { text: doctorText, targetLang: language }
      );

      // Speak using backend TTS
      playAudio(data.translated);

      setMessages(prev => [...prev, {
        role: 'doctor',
        text: doctorText,
        translated: data.translated
      }]);
      setDoctorText('');

    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading('');
    }
  };

  /* ══ END CONSULTATION ═════════════════════════════════════
     Full chat → Groq Llama extracts structured clinical JSON
     → Saves to MongoDB (Consultation + Prescriptions + Lab)
  ══════════════════════════════════════════════════════════ */
  const endConsultation = async () => {
    if (messages.length === 0) return alert('No consultation recorded yet.');
    if (!patientId.trim()) return alert('Please enter Patient ID first.');
    setLoading('AI analyzing consultation...');
    try {
      const transcript = messages.map(m =>
        m.role === 'patient'
          ? `Patient (${m.language}): ${m.translated}`
          : `Doctor: ${m.text}`
      ).join('\n');

      const { data } = await axios.post(`${BASE}/consultation/structure`, {
        patient_id: patientId,
        transcript
      });

      setStructured(data.structured);

    } catch (err) {
      alert('AI extraction failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading('');
    }
  };

  const confirmAndSave = () => {
    alert('✓ Consultation saved successfully! Pharmacy and Lab can now access the orders.');
    setStructured(null);
    setMessages([]);
    setPatientId('');
  };

  const handleDownloadPDF = async () => {
    if (!structured || !patientId) return;
    setLoading('Preparing PDF...');
    try {
      const { data: patient } = await axios.get(`${BASE}/patients/${patientId}`);
      
      // Map frontend 'lab_tests' to backend 'labs' format if needed
      const labs = (structured.lab_tests || []).map(l => ({
        test_name: l.test,
        status: 'pending',
        result: ''
      }));

      generateConsultationPDF(patient, { ...structured, created_at: new Date() }, structured.prescriptions, labs);
    } catch (err) {
      alert('PDF Error: ' + err.message);
    } finally {
      setLoading('');
    }
  };

  /* ══ RENDER ═══════════════════════════════════════════════ */
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap gap-4 justify-between items-center shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient ID</span>
            <input
              value={patientId}
              onChange={e => setPatientId(e.target.value.toUpperCase())}
              placeholder="P-XXXX-XX"
              className="font-mono text-green-700 font-bold bg-transparent outline-none w-32 placeholder-slate-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">Input Language:</span>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none font-medium text-slate-700 cursor-pointer"
            >
              {Object.entries(LANG_NAMES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 animate-pulse">
              <span className="w-2 h-2 bg-amber-500 rounded-full inline-block"></span>
              {loading}
            </div>
          )}
          {isRecording && (
            <div className="flex items-center gap-3 text-sm font-bold text-red-500 bg-red-50 px-4 py-2 rounded-xl border border-red-100 animate-pulse">
              <span className={`w-2.5 h-2.5 rounded-full transition-all duration-75 ${isHearing ? 'bg-red-500 scale-125 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-red-300'}`}></span>
              {isHearing ? 'Hearing Your Voice...' : 'Patient Mic Active'} ({timer}s)
            </div>
          )}
          {isDoctorRec && (
            <div className="flex items-center gap-3 text-sm font-bold text-green-500 bg-green-50 px-4 py-2 rounded-xl border border-green-100 animate-pulse">
              <span className={`w-2.5 h-2.5 rounded-full transition-all duration-75 ${isDoctorHearing ? 'bg-green-500 scale-125 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-green-300'}`}></span>
              {isDoctorHearing ? 'Hearing Your Voice...' : 'Doctor Mic Active'}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Chat ── */}
        <div className="flex-1 flex flex-col border-r border-slate-100 bg-white">

          {/* Chat messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-2xl mb-4 border border-slate-100 shadow-sm">🎙️</div>
                <p className="font-medium">Interact with the buttons below to translate in real-time.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'doctor' ? 'ml-auto items-end' : 'items-start'}`}>
                <span className="text-[11px] uppercase font-bold text-slate-400 mb-1 px-1 tracking-wider">
                  {msg.role === 'patient'
                    ? `Patient (${msg.language} → English)`
                    : `Doctor (English → ${LANG_NAMES[language]})`}
                </span>
                <div className={`p-4 rounded-2xl shadow-sm ${msg.role === 'doctor'
                    ? 'bg-green-700 text-white rounded-tr-sm'
                    : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm'
                  }`}>
                  <p className="font-medium text-[15px] leading-relaxed">
                    {msg.role === 'patient' ? msg.translated : msg.text}
                  </p>
                  <div className={`mt-3 pt-3 border-t text-sm ${msg.role === 'doctor' ? 'border-green-600' : 'border-slate-200'
                    }`}>
                    <span className="block text-[10px] uppercase tracking-wider mb-1 opacity-60">
                      {msg.role === 'patient' ? 'Original speech' : `Spoken in ${LANG_NAMES[language]}`}
                    </span>
                    <span className={`font-medium text-sm ${msg.role === 'doctor' ? 'text-green-100' : 'text-slate-500 font-mono'
                      }`}>
                      {msg.role === 'patient' ? msg.original : msg.translated}
                    </span>
                  </div>
                  {msg.role === 'doctor' && (
                    <div className="mt-3 flex items-center justify-between gap-4 border-t border-green-600/50 pt-2">
                       <div className="text-xs text-green-100 flex items-center gap-1.5 font-medium bg-green-800/40 px-2 py-1 rounded w-fit">
                        🔊 Spoken in {LANG_NAMES[language]}
                      </div>
                      <button 
                        onClick={() => playAudio(msg.translated)}
                        className="text-[10px] font-bold uppercase tracking-widest text-white hover:text-green-200 flex items-center gap-1 transition-all"
                      >
                        <span>🔄</span> Re-play Audio
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative flex-1">
                {isHearing && (
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-3 py-1 rounded-full animate-pulse font-black shadow-lg whitespace-nowrap z-50">
                    HEARING PATIENT VOICE... 🔊
                  </span>
                )}
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm select-none ${isRecording
                      ? 'bg-red-50 border-2 border-red-300 text-red-600'
                      : 'bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100'
                    }`}>
                  <span className="text-xl">{isRecording ? '🔴' : '🎤'}</span>
                  {isRecording ? `Recording... ${timer}s` : 'Patient Mic'}
                </button>
              </div>

              <div className="relative flex-1">
                {isDoctorHearing && (
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] px-3 py-1 rounded-full animate-pulse font-black shadow-lg whitespace-nowrap z-50">
                    HEARING DOCTOR VOICE... 🔊
                  </span>
                )}
                <button
                  onMouseDown={startDoctorRecording}
                  onMouseUp={stopDoctorRecording}
                  onTouchStart={startDoctorRecording}
                  onTouchEnd={stopDoctorRecording}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm select-none ${isDoctorRec
                      ? 'bg-green-50 border-2 border-green-300 text-green-600'
                      : 'bg-green-50 border border-green-100 text-green-700 hover:bg-green-100'
                    }`}>
                  <span className="text-xl">{isDoctorRec ? '🔴' : '🎤'}</span>
                  {isDoctorRec ? 'Listening...' : 'Doctor Mic'}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={doctorText}
                onChange={e => setDoctorText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendDoctorResponse()}
                placeholder="Alternative: Type doctor's advice..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-green-500 text-slate-700 font-medium placeholder-slate-400 transition-all text-sm"
              />
              <button
                onClick={sendDoctorResponse}
                className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap">
                Send Advice
              </button>
            </div>

            {/* Signal Monitor */}
            {(isRecording || isDoctorRec) && (
              <div className="flex items-center gap-2 px-1 pb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signal:</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-200">
                  {[...Array(20)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-sm transition-all duration-75 ${
                        volume > (i * 12) ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>


        {/* ── Right: AI Record ── */}
        <div className="w-[450px] bg-slate-50 flex flex-col shrink-0">
          {!structured ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-100 text-3xl mb-6">🩺</div>
              <h3 className="font-bold text-slate-700 text-xl">AI Clinical Record</h3>
              <p className="text-slate-500 text-sm mt-2 max-w-[250px] leading-relaxed">
                End the session to extract diagnosis, prescriptions, and lab tests.
              </p>
              <button
                onClick={endConsultation}
                className="mt-8 bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all flex items-center gap-2">
                ✨ Generate AI Record
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-green-50 px-5 py-4 border-b border-green-100">
                  <h3 className="font-bold text-green-800 flex items-center gap-2">✨ AI Clinical Record</h3>
                  <p className="text-xs text-green-600 mt-1">Review carefully before confirming</p>
                </div>
                <div className="p-5 space-y-5">

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Diagnosis</span>
                    <div className="font-bold text-slate-800 text-lg bg-green-50 px-3 py-2 rounded-lg inline-block border border-green-100">
                      {structured.diagnosis}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Symptoms</span>
                    <div className="flex flex-wrap gap-2">
                      {structured.symptoms?.map((s, i) => (
                        <span key={i} className="bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium">{s}</span>
                      ))}
                    </div>
                  </div>

                  {structured.prescriptions?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Prescriptions</span>
                      <div className="space-y-2">
                        {structured.prescriptions.map((rx, i) => (
                          <div key={i} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                            <span className="font-bold text-slate-800 block">{rx.medicine}</span>
                            <span className="text-xs text-slate-500 font-medium">
                              {rx.dosage} · {rx.frequency} · {rx.duration}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {structured.lab_tests?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Lab Tests</span>
                      <div className="flex flex-wrap gap-2">
                        {structured.lab_tests.map((t, i) => (
                          <span key={i} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${t.urgency === 'urgent'
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            ● {t.test} — {t.urgency}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {structured.followup && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Follow Up</span>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{structured.followup}</p>
                    </div>
                  )}

                  {structured.clinical_notes && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Clinical Notes</span>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">{structured.clinical_notes}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={confirmAndSave}
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl shadow-md transition-all">
                    ✓ Confirm & Save Record
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                    📥 Download PDF
                  </button>
                  <button
                    onClick={() => setStructured(null)}
                    className="px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}