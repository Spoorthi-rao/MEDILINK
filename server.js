require('dotenv').config(); // ← MUST BE FIRST LINE

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

console.log('GROQ KEY loaded:', process.env.GROQ_API_KEY ? 'YES ✅' : 'NO ❌');
// Connect MongoDB - Forced IPv4 and High-Resilience Timeouts
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  maxIdleTimeMS: 60000,
  family: 4
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    if (err.message.includes('Authentication failed')) {
      console.error('⚠️  CRITICAL: Database username or password in .env is incorrect.');
    } else if (err.message.includes('buffering timed out') || err.message.includes('server selection timeout')) {
      console.error('⚠️  IP WHITELIST ISSUE: Your current IP address might not be allowed in MongoDB Atlas.');
      console.error('👉 Ensure your IP is whitelisted at: https://cloud.mongodb.com/');
    }
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/consultation', require('./routes/consultation'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/lab', require('./routes/lab'));
app.use('/api/analytics', require('./routes/analytics'));

app.get('/', (req, res) => res.json({ status: 'MediLink API running' }));

// Global Error Handler - Prevents 500 crashes forever
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack);
  res.status(500).json({ 
    error: 'Database or Server Busy', 
    details: err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));