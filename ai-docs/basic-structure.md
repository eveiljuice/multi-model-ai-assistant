# Project Structure Overview

This document provides a concise overview of the project's structure, describing the main directories and key files, their purposes, and how they are organized.

---

## Root Directory

- **index.html**: Main HTML entry point for the frontend application.
- **package.json / package-lock.json**: Node.js project configuration and dependencies.
- **tsconfig.json / tsconfig.app.json / tsconfig.node.json**: TypeScript configuration files for different build targets.
- **vite.config.ts**: Vite build tool configuration.
- **tailwind.config.js / postcss.config.js**: Tailwind CSS and PostCSS configuration.
- **eslint.config.js**: ESLint configuration for code linting.
- **README-telegram-setup.md / debug-telegram.md**: Documentation for Telegram integration and debugging.

---

## `src/` — Main Application Source

### Entry Points

- **main.tsx**: Application entry; renders the React app.
- **App.tsx**: Main React component; sets up routing, context providers, and top-level UI structure.
- **index.css**: Global CSS (Tailwind, custom styles).
- **vite-env.d.ts**: Vite environment type declarations.

### Configuration

- **config/aiProviders.ts**: AI provider settings and system prompts.

### Contexts

- **contexts/AuthContext.tsx**: Authentication state and provider.
- **contexts/CreditContext.tsx**: Credit balance state and provider.

### Data

- **data/mockAgents.ts**: Mock agent data for development/testing.

### Types

- **types/index.ts**: Core TypeScript types and interfaces.
- **types/ai.ts**: AI-specific types and interfaces.

### Hooks

- **hooks/useCredits.ts**: Custom hook for credit management.
- **hooks/useErrorBoundary.ts**: Custom hook for error boundary handling.
- **hooks/useMinimizedChats.ts**: Custom hook for managing minimized chat state.
- **hooks/useSubscription.ts**: Custom hook for subscription status.

### Utilities

- **utils/api.ts**: API utility functions.
- **utils/index.ts**: General utility functions.

### Services

- **services/agentService.ts**: Business logic for agent interactions and chat.
- **services/aiService.ts**: Handles AI provider integration and query processing.
- **services/creditService.ts**: Credit management logic.
- **services/demoService.ts**: Demo mode logic.
- **services/loggingService.ts**: Logging and analytics.
- **services/stripeService.ts**: Stripe payment integration.
- **services/supabaseClient.ts**: Supabase client initialization.
- **services/telegramService.ts**: Telegram integration logic.

### Stripe Config

- **stripe-config.ts**: Stripe product and pricing configuration.

---

## `src/components/` — UI Components

- **Header.tsx / Footer.tsx**: Main layout header and footer.
- **AgentDirectory.tsx**: Agent marketplace directory UI.
- **AgentCard.tsx / AgentActionButton.tsx**: Agent listing and action controls.
- **AIAssistant.tsx**: Standalone AI assistant interface.
- **ChatWindow.tsx / ChatInterface.tsx**: Main chat UI and logic.
- **MessageBubble.tsx**: Individual chat message display.
- **MinimizedChatIcon.tsx / MinimizedChatsContainer.tsx**: Minimized chat management UI.
- **FilterPanel.tsx**: Agent filtering UI.
- **ActionButtons.tsx / ChoiceButtons.tsx**: Interactive action controls.
- **ConversationHistory.tsx**: Chat history display.
- **ResponseDisplay.tsx**: AI response rendering.
- **LoadingSpinner.tsx / SkeletonCard.tsx**: Loading and skeleton UI.
- **ErrorBoundary.tsx**: Error boundary UI.
- **Tooltip.tsx**: Tooltip component.
- **DemoEndModal.tsx / DemoTimer.tsx**: Demo mode UI components.
- **SuggestIdeaModal.tsx**: Modal for user suggestions.
- **SuccessPage.tsx**: Success/confirmation page.
- **RateLimitStatus.tsx**: Displays API rate limit status.

#### Subdirectories

- **auth/**: AuthModal, ProtectedRoute, UserMenu — authentication and user menu UI.
- **credits/**: CreditBalance, CreditProgressBar, CreditTransactionList, PaywallModal — credit management UI.
- **pricing/**: PricingCard, PricingPage — pricing and payment UI.
- **profile/**: ProfilePage — user profile page.
- **subscription/**: SubscriptionStatus — subscription status UI.

---

## `supabase/` — Backend Functions & Database

### Functions (`supabase/functions/`)

- **stripe-checkout/index.ts**: Handles Stripe checkout session creation.
- **stripe-webhook/index.ts**: Handles Stripe webhook events (payments, subscriptions).
- **telegram-notify/index.ts**: Sends notifications via Telegram.
- **webhook-handler/index.ts**: General webhook handler for integrations.

### Migrations (`supabase/migrations/`)

- Timestamped `.sql` files: Database schema migrations (naming: `<timestamp>_<name>.sql`).

---

## Summary

- **Frontend**: All React app logic, UI, and state management is in `src/`.
- **Backend**: Serverless functions and database migrations are in `supabase/`.
- **Configuration**: Root and `src/config/` files manage build, linting, and provider settings.

This structure supports modular, scalable development for an AI-powered chat and agent marketplace application.
