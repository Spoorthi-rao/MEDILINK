const express = require('express');
const router = express.Router();
const LabOrder = require('../models/LabOrder');

// GET /api/lab/:patient_id — Get pending lab tests
router.get('/:patient_id', async (req, res) => {
  try {
    const tests = await LabOrder.find({
      patient_id: req.params.patient_id,
      status: 'pending'
    });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/lab/:order_id/complete — Upload result and mark complete
router.patch('/:order_id/complete', async (req, res) => {
  try {
    await LabOrder.findOneAndUpdate(
      { order_id: req.params.order_id },
      {
        status: 'completed',
        result: req.body.result,
        completed_at: new Date()
      }
    );
    res.json({ success: true, message: 'Result uploaded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
