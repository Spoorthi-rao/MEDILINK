const mongoose = require('mongoose');
const LabOrderSchema = new mongoose.Schema({
  order_id:        { type: String, required: true, unique: true },
  consultation_id: { type: String, required: true },
  patient_id:      { type: String, required: true },
  test_name:       { type: String, required: true },
  urgency:         { type: String, default: 'routine', enum: ['routine','urgent'] },
  result:          { type: String },
  result_url:      { type: String },
  status:          { type: String, default: 'pending', enum: ['pending','completed'] },
  completed_at:    { type: Date }
});
module.exports = mongoose.model('LabOrder', LabOrderSchema);
