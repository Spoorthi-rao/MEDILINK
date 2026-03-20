const mongoose = require('mongoose');
const ConsultationSchema = new mongoose.Schema({
  consultation_id: { type: String, required: true, unique: true },
  patient_id:      { type: String, required: true, ref: 'Patient' },
  doctor_id:       { type: String, default: 'DOC-001' },
  raw_transcript:  { type: String },   // original language transcript
  eng_transcript:  { type: String },   // full english transcript
  symptoms:        [String],
  diagnosis:       { type: String },
  clinical_notes:  { type: String },
  followup:        { type: String },
  status:          { type: String, default: 'active' },
  created_at:      { type: Date, default: Date.now }
});
module.exports = mongoose.model('Consultation', ConsultationSchema);
