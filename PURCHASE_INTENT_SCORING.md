# Purchase Intent Scoring System

## Overview

This implementation adds an intelligent **Purchase Intent Scoring System** to the AI service that analyzes every customer message to determine their likelihood to purchase. This enables better lead prioritization, personalized responses, and increased conversion rates.

## How It Works

```
Customer Message → AI Analysis → Intent Score → Strategy Adjustment → Response
                       ↓
              Database Updated with:
              - Intent Score (0-100)
              - Stage (cold/curious/interested/hot/closing)
              - Detected Signals
              - Detected Objections
              - Products of Interest
              - Recommended Action
```

## Intent Stages

| Stage | Score Range | Description | AI Strategy |
|-------|-------------|-------------|-------------|
| 🔵 **Cold** | 0-20 | Just browsing, general questions | Nurture, build rapport |
| 🟡 **Curious** | 21-40 | Asking about features, comparing | Educate about benefits |
| 🟠 **Interested** | 41-60 | Asking price, stock, specific products | Present offers, highlight value |
| 🔴 **Hot** | 61-80 | Negotiating, asking payment/shipping | Create urgency, close the deal |
| 🟢 **Closing** | 81-100 | Ready to buy, confirming order | Guide to payment, clear next steps |

## Buying Signals Detected

- `asked_price` - Customer asks about price/cost
- `asked_stock` - Customer checks availability
- `asked_variants` - Customer asks about colors/sizes/options
- `compared_products` - Customer compares with alternatives
- `mentioned_budget` - Customer mentions budget or price range
- `asked_payment` - Customer asks about payment methods
- `asked_shipping` - Customer asks about delivery
- `negotiating` - Customer trying to get discount
- `confirmed_order` - Customer confirms the purchase
- `repeat_customer` - Customer mentions previous purchase

## Objections Detected

- `price_concern` - "Too expensive", "Over budget"
- `trust_issue` - "Is it genuine?", "Any guarantee?"
- `timing_delay` - "Maybe later", "Next month"
- `needs_comparison` - "Let me check others first"
- `unsure_fit` - "Not sure if it's right for me"
- `waiting_approval` - "Need to ask partner/boss"

## AI Recommended Actions

| Action | When to Use |
|--------|-------------|
| `nurture` | Cold leads - build relationship first |
| `educate` | Curious leads - explain features/benefits |
| `present_offer` | Interested leads - show best deals |
| `handle_objection` | Customer has concerns |
| `create_urgency` | Hot leads - limited stock/time offers |
| `close_sale` | Guide to payment, clear next steps |
| `handover` | Request human agent takeover |

## New API Endpoints

### Get Intent Summary
```
GET /api/whatsapp/devices/:deviceId/intent/summary
```
Returns aggregated intent stats for a device including:
- Total analyzed chats
- Average intent score
- Stage distribution
- Hot leads count
- Top products of interest
- Common signals and objections

### Get Hot Leads
```
GET /api/whatsapp/devices/:deviceId/intent/hot-leads?minScore=60&limit=20
```
Returns chats with high purchase intent, sorted by score.

### Get Intent Analytics
```
GET /api/whatsapp/devices/:deviceId/intent/analytics?stage=hot&sortBy=purchaseIntentScore
```
Returns paginated list of all chats with full intent data.

### Get Chat Intent History
```
GET /api/whatsapp/devices/:deviceId/chat-settings/:phoneNumber/intent-history
```
Returns the intent history for a specific chat, showing how intent changed over time.

## Database Changes

New columns added to `ChatSettings` table:

| Column | Type | Description |
|--------|------|-------------|
| `purchaseIntentScore` | INT | 0-100 score |
| `purchaseIntentStage` | VARCHAR(20) | cold/curious/interested/hot/closing |
| `intentSignals` | JSON | Array of detected buying signals |
| `intentObjections` | JSON | Array of detected objections |
| `productsOfInterest` | JSON | Products customer asked about |
| `aiRecommendedAction` | VARCHAR(50) | AI's recommended next action |
| `intentUpdatedAt` | DATETIME | Last analysis timestamp |
| `intentHistory` | JSON | History of score changes |

## Frontend Changes

The chat list now displays:
- **Intent Score Badge** - Shows percentage with color coding
- **Hot Lead Indicator** - Fire icon for hot/closing leads
- **Trend Indicator** - Trending up icon for interested leads
- **Auto-updated Priority** - Chats are auto-prioritized based on intent

## Usage Tips

1. **Sort by Intent Score** - Prioritize high-intent leads
2. **Check Objections** - Address concerns before they abandon
3. **Track Products** - Know what customers want
4. **Monitor History** - See how interest developed
5. **Use Recommended Actions** - Follow AI's strategy suggestions

## Files Modified

### Backend
- `src/models/ChatSettings.js` - Added intent tracking fields
- `src/services/AIService.js` - Added `analyze_purchase_intent` tool
- `src/controllers/chatSettingsController.js` - Added intent analytics endpoints
- `src/routes/chatSettings.js` - Added intent routes
- `src/migrations/20260113_add_purchase_intent_tracking.cjs` - Database migration

### Frontend
- `client/src/components/chats/ChatList.jsx` - Added intent score display

## Next Steps (Optional Enhancements)

1. **Dashboard Widget** - Show intent funnel visualization
2. **Auto-Notifications** - Alert when lead becomes HOT
3. **Conversion Analytics** - Track which products/messages convert best
4. **Intent Trend Graph** - Show intent changes over conversation
5. **Smart Sorting** - Auto-prioritize chat list by intent

---

## 🎯 Conversation Outcome Tracking (Learning System)

The system now tracks conversation outcomes to learn what works and what doesn't.

### Outcome Types

| Outcome | Description | Auto-Actions |
|---------|-------------|--------------|
| `converted` | Sale made | Status → resolved, adds "purchased" label |
| `lost` | Customer left | Status → closed, tracks lost reason |
| `follow_up` | Needs follow-up | Status → pending, adds "follow-up" label, schedules task |
| `handed_over` | Given to human | Status → open |
| `pending` | Still in progress | Default state |

### New Analytics Endpoints

#### Mark Conversation Outcome
```
POST /api/whatsapp/devices/:deviceId/chat-settings/:phoneNumber/outcome
Body: {
  "outcome": "converted",
  "conversionValue": 1500000,
  "conversionProducts": ["iPhone 15", "Case"]
}
```

#### Get Conversion Analytics
```
GET /api/whatsapp/devices/:deviceId/analytics/conversions?days=30
```
Returns:
- Conversion rate
- Total revenue
- Top products sold
- Lost reasons breakdown
- AI vs Human message ratio

#### Get Follow-Up Tasks
```
GET /api/whatsapp/devices/:deviceId/analytics/follow-ups?status=today
```
Returns categorized follow-up tasks: overdue, today, upcoming.

#### Get Conversion Funnel
```
GET /api/whatsapp/devices/:deviceId/analytics/funnel?days=30
```
Returns conversion rates by intent stage and AI vs Human comparison.

#### Get Learning Insights
```
GET /api/whatsapp/devices/:deviceId/analytics/learning?days=90
```
Returns AI-generated insights:
- Optimal message count for conversions
- Intent score thresholds
- Problematic objections to improve
- AI effectiveness analysis

### What the System Learns

1. **Which intent scores convert** - Find the threshold for prioritization
2. **Which objections are handled well** - Improve weak areas
3. **AI vs Human effectiveness** - Know when to handover
4. **Optimal message count** - Too many messages = lost lead?
5. **Product conversion rates** - Which products sell best via chat

---

*Implementation Date: 2026-01-13*
