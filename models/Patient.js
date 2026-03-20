const mongoose = require('mongoose');
const PatientSchema = new mongoose.Schema({
  patient_id:  { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  age:         { type: Number, required: true },
  gender:      { type: String, enum: ['Male','Female','Other'], required: true },
  language:    { type: String, required: true }, // 'ta','hi','te','kn','ml'
  phone:       { type: String },
  blood_group: { type: String },
  created_at:  { type: Date, default: Date.now }
});
module.exports = mongoose.model('Patient', PatientSchema);
