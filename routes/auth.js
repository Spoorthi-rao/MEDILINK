const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'medilink-super-secret-key-2024';

// ── REGISTER STAFF ──
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = new User({ username, password, role, name });
    await user.save();

    res.status(201).json({ message: 'Staff account created successfully' });
  } catch (err) {
    console.error('REGISTRATION ERROR:', err);
    // Return specific error message to frontend
    let errorMsg = 'Failed to create account';
    if (err.code === 11000) errorMsg = 'Username already taken';
    else if (err.message) errorMsg = err.message;
    
    res.status(400).json({ error: errorMsg, details: err.message });
  }
});

// ── LOGIN STAFF ──
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err.message);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

module.exports = router;
