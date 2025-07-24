const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3002;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    message: 'Test server working!'
  });
});

// Test endpoint
app.post('/api/stripe/create-checkout-session', (req, res) => {
  res.json({
    message: 'Test endpoint working!',
    received: req.body
  });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Test server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}); 