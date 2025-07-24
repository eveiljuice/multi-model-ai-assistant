// Тест Express сервера для Stripe

const express = require('express');
const cors = require('cors');

const app = express();
const port = 3003; // Используем другой порт для теста

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// Тестовый endpoint
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  console.log('🧪 Test endpoint called with:', req.body);
  
  // Симулируем успешный ответ
  res.json({
    id: 'cs_test_123456789',
    url: 'https://checkout.stripe.com/c/pay/test_123456789'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Test Stripe server running',
    port: port
  });
});

app.listen(port, () => {
  console.log(`🧪 Test Stripe server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});