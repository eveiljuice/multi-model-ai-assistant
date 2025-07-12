# Multi-Model AI Assistant with Credit Wallet System

A comprehensive AI assistant platform that connects users with specialized AI agents through a secure credit-based system. Built with React, TypeScript, Supabase, and Stripe integration.

## 🚀 Features

### Core Platform

- **Multi-Model AI Integration**: Support for OpenAI, Anthropic Claude, and Google Gemini
- **Agent Marketplace**: Specialized AI agents for different domains
- **Real-time Chat Interface**: Interactive conversations with AI agents
- **Credit Wallet System**: Pay-per-use model with transparent pricing
- **User Authentication**: Secure authentication via Supabase Auth
- **Subscription Management**: Stripe-powered billing and subscriptions

### Security & Compliance

- **API Key Protection**: All AI API keys stored securely on backend
- **GDPR Compliance**: User data protection and privacy controls
- **Audit Logging**: Comprehensive logging system for security monitoring
- **Rate Limiting**: Protection against abuse and overuse
- **Credit Deduction Security**: Atomic transactions with idempotency protection

### Technical Features

- **Modern React Stack**: Built with React 18, TypeScript, and Vite
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Edge Functions**: Serverless functions powered by Supabase Edge Runtime
- **Database**: PostgreSQL with row-level security (RLS)
- **Real-time Updates**: Live credit balance and transaction updates

## 🏗️ Architecture

```
Frontend (React/TypeScript)
├── Authentication Layer
├── Credit Wallet System
├── AI Agent Interface
└── Subscription Management

Backend (Supabase)
├── PostgreSQL Database
├── Edge Functions (Deno)
├── Authentication Service
└── Real-time Subscriptions

Third-party Integrations
├── OpenAI API
├── Anthropic API
├── Google Gemini API
├── Stripe Payments
└── Telegram Notifications
```

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Supabase CLI
- Git

### Local Development Setup

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd multi-model-ai-assistant
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment Setup**
   Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

4. **Supabase Setup**

```bash
# Initialize Supabase (if not already done)
npx supabase init

# Start local Supabase
npx supabase start

# Run database migrations
npx supabase db push
```

5. **Deploy Supabase Functions**

```bash
npx supabase functions deploy ai-proxy
npx supabase functions deploy credit-meter
npx supabase functions deploy stripe-checkout
npx supabase functions deploy stripe-webhook
npx supabase functions deploy telegram-notify
```

6. **Set Environment Variables in Supabase**

```bash
npx supabase secrets set OPENAI_API_KEY=your_openai_key
npx supabase secrets set ANTHROPIC_API_KEY=your_anthropic_key
npx supabase secrets set GEMINI_API_KEY=your_gemini_key
npx supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret
npx supabase secrets set STRIPE_WEBHOOK_SECRET=your_webhook_secret
npx supabase secrets set TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

7. **Start Development Server**

```bash
npm run dev
```

## 🚀 Deployment

### Production Deployment

1. **Build the application**

```bash
npm run build
```

2. **Deploy to your hosting platform**

   - Vercel: `npx vercel --prod`
   - Netlify: `npm run build && netlify deploy --prod`
   - Or upload `dist/` folder to your hosting service

3. **Update Supabase project settings**
   - Set production environment variables
   - Configure CORS settings
   - Update redirect URLs

## 🔧 Configuration

### AI Providers

Configure AI providers in `src/config/aiProviders.ts`:

- API endpoints and models
- Rate limiting settings
- Temperature and token limits

### Credit System

Customize credit pricing in the database:

```sql
-- Update agent pricing
UPDATE agent_pricing SET credit_weight = 2 WHERE agent_id = 'your-agent-id';

-- Set trial credits for new users
UPDATE credit_wallets SET trial_credits = 100 WHERE user_id = 'user-id';
```

### Stripe Configuration

Set up Stripe products and prices:

1. Create products in Stripe Dashboard
2. Update `src/stripe-config.ts` with your price IDs
3. Configure webhook endpoints

## 📚 API Documentation

### Credit System API

- `GET /api/credits/balance` - Get user credit balance
- `POST /api/credits/deduct` - Deduct credits for agent usage
- `GET /api/credits/transactions` - Get transaction history

### AI Proxy API

- `POST /functions/v1/ai-proxy` - Send messages to AI providers
- Supports OpenAI, Anthropic, and Gemini formats
- Automatic credit deduction and rate limiting

### Stripe Integration

- `POST /functions/v1/stripe-checkout` - Create checkout session
- `POST /functions/v1/stripe-webhook` - Handle Stripe webhooks
- Automatic credit top-ups and subscription management

## 🔒 Security Features

### Data Protection

- All sensitive data encrypted at rest
- API keys never exposed to frontend
- Row-level security (RLS) on all database tables
- JWT token validation on all authenticated endpoints

### Audit & Monitoring

- Comprehensive logging system
- User action tracking
- Error monitoring and alerting
- Credit transaction audit trail

### Rate Limiting

- Per-user rate limits on AI requests
- Provider-specific quota management
- Automatic fallback between providers
- DDoS protection

## 🧪 Testing

```bash
# Run tests
npm test

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build verification
npm run build
```

## 📈 Monitoring & Analytics

### Built-in Logging

- User activity tracking
- AI query analytics
- Credit usage patterns
- Error monitoring

### Database Monitoring

- Query performance
- Connection pooling
- Backup verification
- Security alerts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) for the amazing backend platform
- [OpenAI](https://openai.com/), [Anthropic](https://anthropic.com/), [Google](https://ai.google.dev/) for AI APIs
- [Stripe](https://stripe.com/) for payment processing
- [React](https://reactjs.org/) and [TypeScript](https://typescriptlang.org/) communities

## 📞 Support

For support and questions:

- Create an issue in this repository
- Check the [documentation](docs/)
- Contact: [your-email@example.com]

---

**Built with ❤️ for the AI community**
