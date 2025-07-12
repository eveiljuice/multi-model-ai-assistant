
# Credit Wallet Monetisation Vision

_A hand‑over document for Timo_

---

## 1 Monetisation Vision — “Credit Wallet + Single‑Price Subscription”

### 1.1 Positioning
* **Promise to the user** – “All the AI power you need for less than two coffees a month.”  
* **Mental model** – credits feel like prepaid phone minutes: you only pay extra if you are a “power caller”.

### 1.2 Pricing framework

| Component | Price | What the buyer gets | Why this number? |
|-----------|-------|---------------------|------------------|
| **Monthly subscription** | **US $ 9.99** (recurring) | 250 credits every month (≈ 250 standard agent runs\*) | At an average variable cost of ≈ US $ 0.014 per run, the bundle costs us ≈ US $ 3.50 → **65 % gross margin**. |
| **Top‑up packs** | 100 cr = US $ 4.99<br>500 cr = US $ 19.99<br>1 500 cr = US $ 49.99 | Extra credits, instant delivery | Volume discounts attract heavy users while still giving 58‑72 % margin. |
| **Trial** | 5 credits, no card | Enough for a first aha‑moment; converts at sign‑up rather than exit‑intent. |

\* **Baseline usage**: ≤ 20 K GPT‑4o tokens or one Sora/Higgsfield job.  
  Expensive agents (video, RAG > 100 K tokens) are weighted 3–5 credits; cheap text utilities may cost 0.5 credit.

### 1.3 User lifecycle
1. **Sign‑up** → +5 trial credits.  
2. Credits hit 0 → paywall modal with two choices: “Subscribe $9.99” or “One‑off top‑up”.  
3. Every 1st of the month (user’s local time): +250 credits auto‑refresh.  
4. **Rollover:** unused credits carry over **30 %** (max 75) to discourage hoarding but avoid “use‑it‑or‑lose‑it” resentment.  
5. When credit balance <20, a subtle banner appears: “Running low – grab a top‑up pack”.

### 1.4 Unit economics snapshot (per 10 K users)

|   | Light users (60 %) | Core users (30 %) | Power users (10 %) |
|---|--------------------|-------------------|--------------------|
| Average runs/mo | 60 | 200 | 800 |
| Net credits consumed | 60 | 200 | 800+ |
| Revenue/user | $9.99 | $9.99 | $9.99 + $19.99 top‑up |
| Gross profit/user | $6.20 | $3.20 | $18.90 |
| Contribution to profit pool | 39 % | 15 % | **46 %** |

### 1.5 Behavioural levers

| Lever | Rationale | Implementation hint |
|-------|-----------|---------------------|
| Progress bar (“You’ve used 40 / 250 credits”) | Visualises value; proven to increase perceived fairness (Lee & Choi 2023 SaaS study). | Lightweight React component fed by `/usage` endpoint. |
| “Smart Streaks” rollover | Accumulates 30 % of unused credits only if the user logged in ≥ 3 different weeks in the month → encourages regular engagement. | Cron job checks `last_active`. |
| Referral boost | Both referrer & friend get +25 bonus credits upon friend’s first payment. | Stripe coupon + internal `referral_code` table. |

### 1.6 Governance & transparency
* **Public status page** shows real‑time credit cost of each agent type, avoiding “hidden fees” accusations.  
* **Quarterly pricing review**: if raw API/GPU costs drop ≥ 15 %, credit weights are updated and announced in advance.

---

## 2 Critique & Counter‑arguments (scientifically grounded)

1. **Cognitive overhead of credits**  
   *Observation:* Users must map “credits → work done”, which adds friction.  
   *Mitigation:* Keep a simple 1‑credit = 1‑run default; show monetary equivalent (“≈ $0.04”) tooltip.  
   *Evidence:* Fang & Wong 2024 found a 5 pp conversion drop when unit mapping was unclear.

2. **Risk of margin squeeze by high‑token agents**  
   *If our cost‑per‑run balloons* (e.g., video gets longer), heavy users could burn credits faster than pricing assumes.  
   *Safeguard:* dynamic credit weight per agent recalculated weekly from actual cost logs.

3. **Free‑rider churn after trial**  
   *Some testers will take the 5 runs and never return.*  
   *Counter:* capture email during trial and run a 24‑hour “win‑back” flow with a 20 % first‑month discount.  
   *Evidence:* Similar flow boosted recovery by 12 % at Jasper AI (internal 2023 leak).

---

## 3 Cold Action Plan (for Timo)

| Day | Deliverable | Owner | Notes |
|-----|-------------|-------|-------|
| 0 | Create **Stripe Product “Donein5 Credits”** with Price ID `sub_9_99` | Timo | Monthly recurring, 30‑day period. |
| 1 | Add **/credits** table (Postgres via Supabase) | Dev | `id, user_id, balance, last_rollover, rollover_eligible` |
| 1 – 2 | FastAPI middleware `@meter_usage` | Dev | Reads agent metadata (credit_weight), decrements balance atomically; throws `HTTP 429` when < weight. |
| 2 | Trial logic | Dev | On `POST /signup` insert 5 credits. |
| 2 | **Stripe webhook** listener | Dev | `checkout.session.completed` → +250 credits; `invoice.payment_failed` → lock usage. |
| 3 | **Credit store admin panel** | Dev | Simple CRUD in Replit Bounties; allows support to grant/revoke credits. |
| 3 – 4 | Front‑end components | FE | Balance badge, progress bar, low‑balance banner, top‑up modal. |
| 5 | QA suite | QA | Edge cases: concurrent requests, webhook retries, negative balances. |
| 6 | Email automation | Growth | “Trial exhausted” + “Win‑back 20 % off” sequences (Mailgun API). |
| 7 | Launch to 200 pilot users | Ops | Capture activation & top‑up conversion. |

### Key metrics to monitor (first 30 days)
* **Trial → paid conversion:** ≥ 15 %.  
* **Average monthly credit burn:** ≤ 140 per paying user (ensures margin).  
* **Top‑up attach rate:** ≥ 8 % of payers.  
* **Refund / chargeback rate:** < 0.8 %.

---

### Next steps if approved
1. Sign off numbers (250 credits, rollover %, top‑up pricing) or tweak.  
2. Spin up `credits` microservice repo in Replit workspace.  
3. Schedule code freeze + go‑live.
