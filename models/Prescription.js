const mongoose = require('mongoose');
const PrescriptionSchema = new mongoose.Schema({
  rx_id:           { type: String, required: true, unique: true },
  consultation_id: { type: String, required: true },
  patient_id:      { type: String, required: true },
  medicine:        { type: String, required: true },
  dosage:          { type: String },
  frequency:       { type: String },
  duration:        { type: String },
  status:          { type: String, default: 'pending', enum: ['pending','dispensed'] },
  dispensed_at:    { type: Date }
});
module.exports = mongoose.model('Prescription', PrescriptionSchema);
