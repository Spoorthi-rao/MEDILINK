import axios from 'axios';
const BASE = 'http://localhost:5000/api';

// ── PATIENTS ──────────────────────────────────────────────
export const registerPatient = (data) => axios.post(`${BASE}/patients`, data);
export const getPatient = (id) => axios.get(`${BASE}/patients/${id}`);
export const getPatientRecord = (id) => axios.get(`${BASE}/patients/${id}/record`);

// ── CONSULTATION ──────────────────────────────────────────
// transcribeAudio: patient audio → Whisper STT + Llama translate → English
export const transcribeAudio = (formData) => axios.post(`${BASE}/consultation/transcribe`, formData);

// structureConsult: full transcript → Llama → structured clinical JSON → saved to MongoDB
export const structureConsult = (patient_id, transcript) =>
  axios.post(`${BASE}/consultation/structure`, { patient_id, transcript });

// speakText: translated text → gTTS → Base64 Audio
export const speakText = (text, language) => axios.post(`${BASE}/consultation/speak`, { text, language });

// ── PHARMACY ──────────────────────────────────────────────
export const getPendingRx = (patient_id) => axios.get(`${BASE}/pharmacy/${patient_id}`);
export const markDispensed = (rx_id) => axios.patch(`${BASE}/pharmacy/${rx_id}/dispense`);

// ── LAB ───────────────────────────────────────────────────
export const getPendingTests = (patient_id) => axios.get(`${BASE}/lab/${patient_id}`);
export const uploadResult = (order_id, result) =>
  axios.patch(`${BASE}/lab/${order_id}/complete`, { result });