const express = require('express');
const router = express.Router();
const Consultation = require('../models/Consultation');
const Patient = require('../models/Patient');

// GET /api/analytics/dashboard — Aggregated stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const totalConsults = await Consultation.countDocuments();

    // 1. Get Top Symptoms (Aggregation)
    const topSymptoms = await Consultation.aggregate([
      { $unwind: "$symptoms" },
      { $group: { _id: "$symptoms", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // 2. Get Consultations per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyVolume = await Consultation.aggregate([
      { $match: { created_at: { $gte: sevenDaysAgo } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { "_id": 1 } }
    ]);

    // 3. Gender Distribution
    const genderDist = await Patient.aggregate([
      { $group: { _id: "$gender", count: { $sum: 1 } } }
    ]);

    res.json({
      totalPatients,
      totalConsults,
      topSymptoms,
      weeklyVolume,
      genderDist
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
