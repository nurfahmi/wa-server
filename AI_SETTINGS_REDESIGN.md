## AI Settings Redesign Summary

The AI Settings page has been simplified from 4 tabs to 2 tabs:

### New Tab Structure:
1. **AI Configuration** - Combines Core Agent, Voice & Goals, Safety & Schedule
2. **Business Settings** - Business info, Product Catalog, FAQ

### Key Changes for AI Configuration Tab:

**Compact Layout with Dropdowns:**
- Brand Voice: Dropdown instead of 4 large buttons (casual, formal, expert, luxury)
- Primary Goal: Dropdown instead of 3 large radio cards (conversion, leads, support)  
- Operating Hours: Compact toggle + time selectors
- Boundaries: Simple toggle switches

**Professional Grid Layout:**
```
┌─────────────────────────────────────┐
│ Engine & Identity                   │
│ ├─ Provider (dropdown)              │
│ ├─ Model (dropdown)                 │
│ ├─ Agent Name                       │
│ └─ Language (dropdown)              │
├─────────────────────────────────────┤
│ Behavior & Strategy                 │
│ ├─ Brand Voice (dropdown)           │
│ ├─ Primary Goal (dropdown)          │
│ └─ Core Instructions (textarea)     │
├─────────────────────────────────────┤
│ Context & Memory                    │
│ ├─ Wake Words                       │
│ ├─ History Depth / Expiry           │
│ └─ Memory Toggle                    │
├─────────────────────────────────────┤
│ Safety & Schedule                   │
│ ├─ Boundaries (toggle)              │
│ ├─ Handover Triggers                │
│ └─ Operating Hours (compact)        │
└─────────────────────────────────────┘
```

### Currency Selector Location:
In the Product Modal, the currency selector is in the price section:
- Currency dropdown (IDR/MYR/USD)
- Price input (numeric)
- Formatted display using `formatCurrency()` function

### Implementation Status:
✅ Tabs simplified (2 instead of 4)
✅ Currency formatting function added
✅ Business logo upload handler added
⏳ Need to redesign tab content with dropdowns
⏳ Need to add Business Settings fields (address, etc.)
