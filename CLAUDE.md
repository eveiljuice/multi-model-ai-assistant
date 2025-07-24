# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start Vite development server on port 5173/5174
- `npm run server` - Start Express Stripe server on port 3002
- `npm run dev:full` - Start both frontend and backend concurrently
- `npm run build` - Production build with chunk optimization
- `npm run preview` - Preview production build locally

### Code Quality
- `npm run type-check` - TypeScript type checking without emit
- `npm run lint` - ESLint with React-specific rules
- `npm test` - Run Vitest test suite
- `npm run test:run` - Run tests once without watch mode

### Supabase Operations
- `npx supabase start` - Start local Supabase instance
- `npx supabase db push` - Push database migrations
- `npx supabase functions deploy <function-name>` - Deploy specific edge function
- `npx supabase secrets set KEY=value` - Set environment variables for edge functions

## Architecture Overview

### Multi-Layered Backend Architecture
This project uses a **hybrid backend approach** with three layers:
1. **Supabase Edge Functions** (Deno runtime) - Primary API layer
2. **Express Server** (Node.js on port 3002) - Dedicated Stripe payment processing
3. **Vite Proxy** - Development-time API routing

### AI Proxy Pattern
All AI provider integrations (OpenAI, Anthropic, Gemini) route through a unified `/ai-proxy` edge function that handles:
- Server-side API key security
- Provider failover and rate limiting
- Multi-model response synthesis
- Atomic credit deduction with idempotency protection

### Credit System Architecture
The platform uses a sophisticated credit-based monetization system:
- **Atomic Transactions**: Credit deductions use database functions with idempotency keys
- **Real-time Updates**: Live balance updates via Supabase realtime subscriptions
- **Monthly Rollover**: Automated cron job with "Smart Streaks" system
- **Audit Trail**: Complete transaction history with user activity tracking

### Payment Flow Integration
Stripe integration uses multiple implementation layers:
- Frontend: `@stripe/stripe-js` for checkout sessions
- Express Server: Dedicated payment processing endpoints
- Edge Functions: Multiple Stripe function implementations (`stripe-checkout-v2`, `stripe-checkout-v3`, etc.)
- Database: Complete payment tracking with `stripe_customers`, `stripe_subscriptions`, `stripe_orders` tables

## Key Configuration Files

### Environment Variables
- Root `.env` - Frontend environment variables (VITE_ prefixed)
- `server/.env` - Express server environment variables
- Supabase secrets - Backend API keys and sensitive configuration

### Vite Configuration
- `vite.config.ts` includes critical proxy configuration for `/api/stripe` → `localhost:3002`
- Manual chunk splitting optimizes bundle sizes for vendors, AI libraries, and UI components
- CSP headers configured for Stripe, Supabase, and AI provider domains

### Database Structure
Core tables for credit system:
- `credits` - User credit balances with trial/paid credit separation  
- `credit_transactions` - All credit movements with idempotency protection
- `agent_pricing` - Per-agent pricing configuration
- `user_activity` - Comprehensive activity and audit logging

## Development Patterns

### Authentication Flow
Uses Supabase Auth with comprehensive session management:
- JWT tokens with automatic refresh and retry logic
- Session validation across all authenticated endpoints
- Auth state synchronization between components
- Row Level Security (RLS) policies enforce data access controls

### Error Handling Strategy
- **Frontend**: Comprehensive error boundaries with user-friendly messaging
- **Backend**: Detailed logging with error categorization and alerting
- **AI Proxy**: Graceful provider failover with response synthesis
- **Payments**: Webhook retry logic with transaction state recovery

### State Management
- React Context for global state (auth, credits, theme)
- Custom hooks for API integration (`useSubscription`, `useCredits`)
- Real-time subscriptions for credit balance updates
- Optimistic UI updates with rollback on failure

## Testing Strategy

### Test Organization
- `tests/` directory contains comprehensive test suite with multiple runners
- API integration tests for all edge functions
- Payment flow testing with Stripe test mode
- Performance and load testing capabilities

### Key Test Files
- `tests/api-comprehensive-test.ts` - Full API endpoint testing
- `test-stripe-*.js` - Various Stripe integration tests
- `tests/edge-functions-test.js` - Edge function unit tests

## Security Considerations

### API Key Protection
- All AI provider keys stored as Supabase secrets, never exposed to frontend
- Stripe keys separated between development and production environments
- Database functions prevent direct credit manipulation

### CORS Configuration  
- Edge functions use sophisticated CORS handling with origin validation
- Express server configured for specific localhost origins during development
- Production CORS restricted to verified domains

### Data Security
- Row Level Security (RLS) enforced on all user data tables
- Comprehensive audit logging for security monitoring
- Credit deduction uses atomic transactions with duplicate prevention

## Common Issues & Solutions

### Stripe Integration Problems
- Multiple Stripe implementations exist - ensure consistency between edge functions and Express server
- Check environment variable configuration in both local `.env` files and Supabase secrets
- Verify webhook endpoints match between Stripe dashboard and deployed functions

### AI Provider Errors
- AI proxy function handles provider failover automatically
- Check Supabase secrets for API key configuration
- Monitor edge function logs for rate limiting or quota issues

### Credit System Issues
- Use atomic database functions for credit operations to prevent race conditions
- Check transaction logs in `credit_transactions` table for debugging
- Verify user authentication before credit operations