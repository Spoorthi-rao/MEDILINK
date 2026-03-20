const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Patient = require('../models/Patient');
const Consultation = require('../models/Consultation');
const Prescription = require('../models/Prescription');
const LabOrder = require('../models/LabOrder');

// POST /api/patients — Register new patient, returns patient_id
router.post('/', async (req, res) => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const patient_id = 'P' + uuidv4().slice(0, 4).toUpperCase() + uuidv4().slice(0, 2).toUpperCase();
      const patient = new Patient({ ...req.body, patient_id });
      await patient.save();
      return res.json({ success: true, patient_id, patient });
    } catch (err) {
      attempt++;
      console.error(`Registration attempt ${attempt} failed:`, err.message);
      if (attempt >= maxRetries) {
        return res.status(500).json({ error: 'Database busy. Please try again in a moment.', details: err.message });
      }
      // Wait 1s before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
});

// GET /api/patients/:id — Get patient basic info
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({ patient_id: req.params.id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id/record — Get FULL record (all depts)
router.get('/:id/record', async (req, res) => {
  try {
    const id = req.params.id;
    const [patient, consultations, prescriptions, lab_orders] = await Promise.all([
      Patient.findOne({ patient_id: id }),
      Consultation.find({ patient_id: id }).sort({ created_at: -1 }),
      Prescription.find({ patient_id: id }),
      LabOrder.find({ patient_id: id })
    ]);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ patient, consultations, prescriptions, lab_orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
