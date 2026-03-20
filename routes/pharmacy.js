const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');

// GET /api/pharmacy/:patient_id — Get pending prescriptions
router.get('/:patient_id', async (req, res) => {
  try {
    const rxList = await Prescription.find({
      patient_id: req.params.patient_id,
      status: 'pending'
    });
    res.json(rxList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pharmacy/:rx_id/dispense — Mark one medicine as dispensed
router.patch('/:rx_id/dispense', async (req, res) => {
  try {
    await Prescription.findOneAndUpdate(
      { rx_id: req.params.rx_id },
      { status: 'dispensed', dispensed_at: new Date() }
    );
    res.json({ success: true, message: 'Medicine marked as dispensed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
