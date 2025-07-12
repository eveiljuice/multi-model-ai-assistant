# Services Overview

This document describes the core services used in the project, their business logic, usage, and the data they accept and return.

---

## agentService

**Purpose:**
Handles all business logic related to AI agents, including agent personalities, chat interactions, and response generation.

**Key Methods:**

- `generateAgentResponse(message, agent, conversationHistory, userId?)`: Generates a chat response from a specific agent. Accepts a user message, agent object, conversation history, and optional user ID. Returns a `ChatMessage` object.
- `generateQuickResponse(action, agent)`: Generates a quick, predefined response for a given action and agent. Returns a string.
- `checkCreditsBeforeUse(agentId, userId?)`: Checks if the user has enough credits to use an agent. Returns `{ canUse, required, available, error? }`.

**Input:** Agent objects, user messages, conversation history, user IDs.
**Output:** Chat messages, quick responses, credit eligibility info.

---

## aiService

**Purpose:**
Integrates with external AI providers (OpenAI, Anthropic, Gemini) to process user queries, manage rate limits, and synthesize responses.

**Key Methods:**

- `processQuery(query, context?)`: Processes a user query with optional conversation context. Returns `{ responses: AIResponse[], synthesized: any }`.
- `processQueryWithPersonality(query, context, systemPrompt, preferredModel?)`: Processes a query with a specific agent personality and model. Returns `{ content, model, tokens, responseTime }`.
- `getRateLimitStatus()`: Returns current rate limit status for each provider.

**Input:** User queries, conversation context, system prompts, model preferences.
**Output:** AI responses, synthesized results, rate limit info.

---

## creditService

**Purpose:**
Manages user credits, agent pricing, and credit transactions.

**Key Methods:**

- `getUserCredits(userId?)`: Returns the user's current credit balance as a `CreditBalance` object.
- `getCreditTransactions(userId?, limit?)`: Returns a list of recent credit transactions.
- `getAgentPricing(agentId)`: Returns pricing info for a specific agent.
- `canUseAgent(agentId, userId?)`: Checks if the user can use an agent based on available credits. Returns `{ canUse, required, available }`.
- `deductCreditsAtomic(agentId, userId?, idempotencyKey?)`: Atomically deducts credits for agent usage with idempotency protection. Returns `CreditDeductionResult` with detailed information.

**Input:** User IDs, agent IDs, transaction details.
**Output:** Credit balances, transaction lists, pricing info, eligibility checks.

---

## demoService

**Purpose:**
Manages demo sessions for agents, allowing users to try agent features for a limited time.

**Key Methods:**

- `startDemoSession(agentId)`: Starts a new demo session for an agent. Returns a `DemoSession` object.
- `getDemoSession(agentId)`: Retrieves the current demo session for an agent.
- `isDemoActive(agentId)`: Checks if a demo session is active.
- `endDemoSession(agentId)`: Ends the demo session for an agent.

**Input:** Agent IDs.
**Output:** Demo session objects, status flags.

---

## loggingService

**Purpose:**
Logs user activity, errors, and performance metrics to the backend (Supabase).

**Key Methods:**

- `logActivity(activityData)`: Logs a user activity event.
- `logError(errorData)`: Logs an error event.
- `logPerformance(performanceData)`: Logs a performance metric.
- `logPageView(path?, additionalData?)`: Logs a page view event.
- `logUserAction(action, category?, additionalData?)`: Logs a user action.

**Input:** Activity, error, and performance data objects.
**Output:** None (side effect: logs to backend).

---

## stripeService

**Purpose:**
Handles Stripe payment and subscription logic, including checkout sessions, user subscriptions, and order history.

**Key Methods:**

- `createCheckoutSession(priceId, mode, successUrl?, cancelUrl?)`: Creates a Stripe checkout session. Returns `{ sessionId, url }`.
- `getUserSubscription()`: Retrieves the current user's subscription info. Returns a `UserSubscription` object.
- `getUserOrders()`: Retrieves the user's order history. Returns a list of `UserOrder` objects.
- `getAvailableProducts()`: Returns a list of available Stripe products.

**Input:** Price IDs, payment modes, URLs.
**Output:** Checkout session info, subscription and order data, product lists.

---

## supabaseClient

**Purpose:**
Initializes and provides access to the Supabase client for database and authentication operations.

**Usage:**

- Import `supabase` to perform queries, authentication, and function calls.
- Use `isSupabaseConfigured()` to check if Supabase is set up.

**Input:** None (uses environment variables).
**Output:** Supabase client instance or null.

---

## telegramService

**Purpose:**
Sends notifications (e.g., idea suggestions) to a Telegram channel via the Telegram Bot API.

**Key Methods:**

- `sendIdeaNotification(idea)`: Sends a formatted idea suggestion to Telegram. Returns `{ success, error? }`.
- `testConnection()`: Tests the Telegram bot connection. Returns `{ success, error? }`.

**Input:** Idea suggestion objects.
**Output:** Success/error status for notification delivery.

---

## Summary

These services provide the core business logic, integrations, and data management for the application. They are designed to be modular, reusable, and easy to integrate throughout the codebase.
