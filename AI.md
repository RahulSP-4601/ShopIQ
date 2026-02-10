# Frame AI Architecture

> Applying Forrest Hosten's Research to Frame's Shopify Integration

This document outlines the comprehensive AI architecture for Frame, based on cognitive research principles for building intelligent e-commerce assistants.

---

## Table of Contents

1. [Three-Column Working Memory](#1-three-column-working-memory-for-shopify-sellers)
2. [Competence-Based Autonomy](#2-competence-based-autonomy-for-shopify-tasks)
3. [OpenAI API Integration](#3-openai-api-integration-with-function-calling)
4. [Weekly Briefing Generation](#4-weekly-briefing-generation-with-ai-years-tracking)
5. [TTL-Based Note Management](#5-ttl-based-note-management)
6. [Context-Conditional Beliefs](#6-context-conditional-beliefs-for-shopify)
7. [Implementation Plan](#7-complete-implementation-plan)
8. [Key Metrics](#8-key-metrics-to-track)

---

## 1. Three-Column Working Memory for Shopify Sellers

From Forrest's "Three-Column Working Memory" paper, we structure Frame's cognitive state:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FRAME WORKING MEMORY FOR SHOPIFY                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COLUMN 1: ACTIVE TASKS (3-4 slots)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Task 1: "Analyze why Blue Ceramic Mug sales dropped 40%"            │    │
│  │         State: executing | Priority: 0.9 | Started: 10 min ago      │    │
│  │                                                                     │    │
│  │ Task 2: "Generate weekly briefing for store owner"                  │    │
│  │         State: awaiting_data | Priority: 0.7                        │    │
│  │                                                                     │    │
│  │ Task 3: "Check inventory levels for bestsellers"                    │    │
│  │         State: complete | Priority: 0.6                             │    │
│  │                                                                     │    │
│  │ Slot 4: [empty - available for urgent task]                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  COLUMN 2: NOTES (TTL-based queue)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Note 1: "Review Facebook ad ROAS - seller mentioned yesterday"      │    │
│  │         TTL: 4h remaining | Priority: 0.6 | Escalating...           │    │
│  │                                                                     │    │
│  │ Note 2: "Investigate high return rate on Women's Kurta Size L"      │    │
│  │         TTL: 24h remaining | Priority: 0.5                          │    │
│  │                                                                     │    │
│  │ Note 3: "Seller wants to expand to Amazon - research later"         │    │
│  │         TTL: 7 days | Priority: 0.3                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  COLUMN 3: OBJECTS (Ambient Context)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PEOPLE:                                                             │    │
│  │   - Store Owner: Priya (relationship: 0.92, prefers concise)        │    │
│  │   - Supplier: Vendor X (relationship: 0.68, slow shipping)          │    │
│  │                                                                     │    │
│  │ ENTITIES:                                                           │    │
│  │   - Store: "Priya's Ethnic Wear" (Shopify Plus, ₹45L/month)         │    │
│  │   - Top Product: Blue Ceramic Mug (SKU: BCM-001, salience: 0.95)    │    │
│  │   - Problem Category: Women's Kurta (high returns, salience: 0.88)  │    │
│  │                                                                     │    │
│  │ BELIEFS (strength > 0.8):                                           │    │
│  │   - "Maharashtra customers prefer COD" (0.89)                       │    │
│  │   - "Weekend sales spike 40% for ethnic wear" (0.92)                │    │
│  │   - "Vendor X takes 12 days avg lead time" (0.85)                   │    │
│  │                                                                     │    │
│  │ TEMPORAL:                                                           │    │
│  │   - Current: Month-end (urgency: 1.5x)                              │    │
│  │   - Upcoming: Diwali season in 45 days                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Competence-Based Autonomy for Shopify Tasks

From the "Competence-Based Autonomy" paper, we map belief strength to supervision levels:

```python
# Frame Autonomy Mapping for Shopify Operations

SHOPIFY_TASK_BELIEFS = {
    # HIGH AUTONOMY (strength > 0.7) - Execute independently
    "generate_sales_report": {
        "strength": 0.92,
        "mode": "AUTONOMOUS",
        "action": "Generate and deliver report automatically"
    },
    "check_inventory_levels": {
        "strength": 0.88,
        "mode": "AUTONOMOUS",
        "action": "Alert only if stockout risk detected"
    },
    "calculate_profit_margins": {
        "strength": 0.85,
        "mode": "AUTONOMOUS",
        "action": "Include in weekly briefing"
    },

    # MODERATE AUTONOMY (0.4-0.7) - Propose for approval
    "suggest_price_changes": {
        "strength": 0.62,
        "mode": "PROPOSAL",
        "action": "Recommend price change, await seller confirmation"
    },
    "identify_underperforming_products": {
        "strength": 0.58,
        "mode": "PROPOSAL",
        "action": "Flag products, let seller decide action"
    },
    "ad_spend_reallocation": {
        "strength": 0.52,
        "mode": "PROPOSAL",
        "action": "Suggest budget shifts, require approval"
    },

    # LOW AUTONOMY (strength < 0.4) - Seek guidance
    "discontinue_product": {
        "strength": 0.28,
        "mode": "GUIDANCE_SEEKING",
        "action": "Ask seller for decision criteria"
    },
    "change_supplier": {
        "strength": 0.31,
        "mode": "GUIDANCE_SEEKING",
        "action": "Present options, request seller input"
    },
    "expand_to_new_channel": {
        "strength": 0.22,
        "mode": "GUIDANCE_SEEKING",
        "action": "Research and present findings, await direction"
    }
}
```

---

## 3. OpenAI API Integration with Function Calling

Based on the architecture, here's the implementation for OpenAI integration:

```python
import openai
from datetime import datetime, timedelta
from typing import Dict, List, Any
import json

class FrameShopifyAgent:
    """
    Frame Agent for Shopify using Forrest Hosten's cognitive architecture.
    """

    def __init__(self, shopify_credentials: Dict):
        self.shopify = ShopifyAPI(credentials=shopify_credentials)
        self.working_memory = WorkingMemory()
        self.belief_graph = BeliefGraph()

    # ═══════════════════════════════════════════════════════════════════════
    # OPENAI FUNCTION DEFINITIONS (for Function Calling)
    # ═══════════════════════════════════════════════════════════════════════

    SHOPIFY_FUNCTIONS = [
        {
            "name": "get_sales_summary",
            "description": "Get sales summary for a time period from Shopify",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "enum": ["today", "yesterday", "week", "month", "quarter"],
                        "description": "Time period for sales data"
                    },
                    "compare_to_previous": {
                        "type": "boolean",
                        "default": True,
                        "description": "Compare to previous period"
                    }
                },
                "required": ["period"]
            }
        },
        {
            "name": "get_inventory_status",
            "description": "Check inventory levels and stockout risks",
            "parameters": {
                "type": "object",
                "properties": {
                    "threshold_days": {
                        "type": "integer",
                        "default": 14,
                        "description": "Days of inventory to flag as low"
                    },
                    "product_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Specific products to check (empty for all)"
                    }
                }
            }
        },
        {
            "name": "get_product_profitability",
            "description": "Calculate true profitability after all fees",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                    "include_fees": {
                        "type": "object",
                        "properties": {
                            "platform_fees": {"type": "boolean", "default": True},
                            "payment_processing": {"type": "boolean", "default": True},
                            "shipping": {"type": "boolean", "default": True},
                            "returns": {"type": "boolean", "default": True},
                            "ad_spend": {"type": "boolean", "default": True}
                        }
                    }
                },
                "required": ["product_id"]
            }
        },
        {
            "name": "get_channel_comparison",
            "description": "Compare product performance across sales channels",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                    "channels": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Channels to compare (shopify, amazon, etc.)"
                    },
                    "metrics": {
                        "type": "array",
                        "items": {"type": "string"},
                        "enum": ["revenue", "units", "margin", "returns", "velocity"]
                    }
                },
                "required": ["product_id"]
            }
        },
        {
            "name": "get_demand_forecast",
            "description": "Predict future demand for a product",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                    "forecast_days": {"type": "integer", "default": 30},
                    "include_seasonality": {"type": "boolean", "default": True}
                },
                "required": ["product_id"]
            }
        },
        {
            "name": "get_geographic_insights",
            "description": "Analyze sales by geographic region",
            "parameters": {
                "type": "object",
                "properties": {
                    "granularity": {
                        "type": "string",
                        "enum": ["country", "state", "city"],
                        "default": "state"
                    },
                    "product_category": {"type": "string"},
                    "period": {"type": "string", "default": "month"}
                }
            }
        },
        {
            "name": "create_stockout_alert",
            "description": "Set up alert for low inventory",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                    "threshold_units": {"type": "integer"},
                    "notify_method": {
                        "type": "string",
                        "enum": ["email", "sms", "app_notification"]
                    }
                },
                "required": ["product_id", "threshold_units"]
            }
        }
    ]

    # ═══════════════════════════════════════════════════════════════════════
    # CORE INTERACTION LOOP (from Forrest's architecture)
    # ═══════════════════════════════════════════════════════════════════════

    async def process_user_query(self, user_message: str, user_id: str) -> str:
        """
        Main interaction loop following Forrest's cognitive architecture.

        Flow:
        1. Trigger: User input arrives
        2. Cognitive Activation: Populate Objects column from knowledge graph
        3. Appraisal: Reason about situation using all three columns
        4. Action: Execute with appropriate autonomy level
        5. Outcome & Feedback: Update beliefs based on results
        """

        # STEP 1: COGNITIVE ACTIVATION
        # Fetch relevant context based on user and current state
        await self._activate_context(user_id, user_message)

        # STEP 2: BUILD SYSTEM PROMPT WITH THREE COLUMNS
        system_prompt = self._build_system_prompt()

        # STEP 3: CALL OPENAI WITH FUNCTION CALLING
        response = await openai.ChatCompletion.acreate(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            functions=self.SHOPIFY_FUNCTIONS,
            function_call="auto",
            temperature=0.7
        )

        # STEP 4: PROCESS RESPONSE (may involve function calls)
        result = await self._process_response(response, user_id)

        # STEP 5: UPDATE BELIEFS BASED ON OUTCOME
        await self._update_beliefs_from_interaction(user_id, user_message, result)

        return result

    def _build_system_prompt(self) -> str:
        """
        Build system prompt incorporating all three columns of working memory.
        """
        wm = self.working_memory

        prompt = f"""You are Frame, an AI business analyst for e-commerce sellers on Shopify.

# WORKING MEMORY STATE

## COLUMN 1: ACTIVE TASKS
{self._format_active_tasks(wm.active_tasks)}

## COLUMN 2: NOTES (Items to address)
{self._format_notes(wm.notes)}

## COLUMN 3: CONTEXT
### People
{self._format_people(wm.objects.people)}

### Relevant Entities
{self._format_entities(wm.objects.entities)}

### Beliefs (What I know about this business)
{self._format_beliefs(wm.objects.beliefs)}

### Temporal Context
{self._format_temporal(wm.objects.temporal)}

# AUTONOMY LEVELS
Based on my belief strength for each task type:
- I execute AUTONOMOUSLY for tasks I'm confident about (strength > 0.7)
- I PROPOSE actions for moderate confidence (0.4-0.7), awaiting approval
- I SEEK GUIDANCE for low confidence tasks (< 0.4)

# RESPONSE STYLE
- Be specific with numbers and actionable insights
- Explain WHY something is happening, not just WHAT
- Prioritize urgent issues first
- Match the user's communication style preference

Use the available functions to fetch real data before responding.
"""
        return prompt

    # ═══════════════════════════════════════════════════════════════════════
    # BELIEF UPDATES WITH MORAL ASYMMETRY (from Forrest's paper)
    # ═══════════════════════════════════════════════════════════════════════

    async def _update_beliefs_from_interaction(
        self,
        user_id: str,
        query: str,
        result: Dict
    ):
        """
        Update beliefs based on interaction outcome.

        Implements moral asymmetry: failures weight 2x more than successes.
        """
        outcome = result.get("outcome", "neutral")
        task_type = result.get("task_type")

        if not task_type:
            return

        belief = self.belief_graph.get_belief(user_id, task_type)

        # MORAL ASYMMETRY MULTIPLIERS (from Forrest's research)
        BETA_VIOLATION = 2.0   # Failures weight 2x
        BETA_CONFIRMATION = 1.0  # Successes weight 1x
        ALPHA = 0.15  # Base learning rate

        if outcome == "success":
            # User confirmed our action was helpful
            delta = ALPHA * BETA_CONFIRMATION
            belief.strength = min(1.0, belief.strength + delta)

        elif outcome == "failure":
            # User indicated we were wrong or unhelpful
            delta = ALPHA * BETA_VIOLATION
            belief.strength = max(0.0, belief.strength - delta)

            # If strength drops below threshold, increase supervision
            if belief.strength < 0.4:
                belief.autonomy_mode = "GUIDANCE_SEEKING"
            elif belief.strength < 0.7:
                belief.autonomy_mode = "PROPOSAL"

        # Update timestamp and history
        belief.last_updated = datetime.now()
        belief.history.append({
            "timestamp": datetime.now(),
            "outcome": outcome,
            "query": query,
            "strength_after": belief.strength
        })

        await self.belief_graph.save_belief(belief)
```

---

## 4. Weekly Briefing Generation with AI Years Tracking

From the "AI Years" paper, we track the agent's maturity:

```python
class WeeklyBriefingGenerator:
    """
    Generate weekly briefings with AI maturity tracking.
    """

    async def generate_weekly_briefing(self, store_id: str) -> Dict:
        """
        Generate intelligent weekly report using OpenAI.
        """

        # 1. Fetch all metrics from Shopify
        metrics = await self._fetch_weekly_metrics(store_id)

        # 2. Calculate AI maturity (from AI Years framework)
        maturity = await self._calculate_ai_maturity(store_id)

        # 3. Generate narrative with OpenAI
        briefing = await self._generate_narrative(metrics, maturity)

        return briefing

    async def _calculate_ai_maturity(self, store_id: str) -> Dict:
        """
        Calculate AI Years maturity following Forrest's framework.

        AI Year = time to move from 0.90 to 0.99 per-step reliability
        """
        # Get all task beliefs for this store
        beliefs = await self.belief_graph.get_all_beliefs(store_id)

        # Calculate geometric mean reliability
        strengths = [b.strength for b in beliefs if b.strength > 0]
        if not strengths:
            return {"age_ai_years": 0, "stage": "Infant"}

        geometric_mean = (
            math.prod(strengths) ** (1 / len(strengths))
        )

        # Map to developmental stages (from AI Years paper)
        if geometric_mean < 0.90:
            stage = "Infant"
            description = "Still learning basics, asks often"
        elif geometric_mean < 0.95:
            stage = "Apprentice"
            description = "Handles routine tasks, needs supervision for edge cases"
        elif geometric_mean < 0.99:
            stage = "Professional"
            description = "Autonomous for most tasks, rare escalation"
        else:
            stage = "Expert"
            description = "Full autonomy in domain, resilient to drift"

        # Calculate AI Years (simplified)
        validated_cycles = await self._count_validated_cycles(store_id)
        ai_years = validated_cycles / 18000  # Benchmark from paper

        return {
            "age_ai_years": round(ai_years, 2),
            "geometric_mean_reliability": round(geometric_mean, 3),
            "stage": stage,
            "description": description,
            "total_beliefs": len(beliefs),
            "high_confidence_beliefs": len([b for b in beliefs if b.strength > 0.7]),
            "low_confidence_beliefs": len([b for b in beliefs if b.strength < 0.4])
        }

    async def _generate_narrative(self, metrics: Dict, maturity: Dict) -> str:
        """
        Use OpenAI to generate natural language briefing.
        """

        prompt = f"""Generate a weekly business briefing for a Shopify seller.

METRICS DATA:
{json.dumps(metrics, indent=2)}

AI MATURITY:
- AI Age: {maturity['age_ai_years']} years
- Stage: {maturity['stage']}
- Reliability: {maturity['geometric_mean_reliability']}

STRUCTURE:
1. Executive Summary (2-3 sentences)
2. Revenue & Profitability
3. Top 3 Actions This Week (specific, actionable)
4. Inventory Alerts
5. Key Insight

TONE: Professional but friendly. Be specific with numbers.
Include the AI maturity badge at the end.
"""

        response = await openai.ChatCompletion.acreate(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "You are Frame generating weekly business intelligence."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )

        return response.choices[0].message.content
```

---

## 5. TTL-Based Note Management

From the Three-Column Memory paper:

```python
class NoteManager:
    """
    Manage Notes column with TTL-based expiration and priority escalation.
    """

    def update_note_priorities(self, notes: List[Note]) -> List[Note]:
        """
        Implement TTL-based priority escalation from Forrest's paper.

        As TTL approaches expiration, priority increases:
        - < 5% remaining: 2.0x multiplier (CRITICAL)
        - 5-20% remaining: 1.5x multiplier (WARNING)
        - > 20% remaining: 1.0x (NORMAL)
        """
        now = datetime.now()

        for note in notes:
            age = now - note.created_at
            remaining_fraction = 1.0 - (age / note.ttl)

            if remaining_fraction < 0:
                # Expired - archive or surface urgently
                note.status = "EXPIRED"
                self._handle_expiration(note)

            elif remaining_fraction < 0.05:
                # CRITICAL - urgent notification
                note.effective_priority = note.base_priority * 2.0
                note.escalation_level = "CRITICAL"

            elif remaining_fraction < 0.20:
                # WARNING - gentle reminder
                note.effective_priority = note.base_priority * 1.5
                note.escalation_level = "WARNING"

            else:
                # NORMAL - no escalation
                note.effective_priority = note.base_priority
                note.escalation_level = "NORMAL"

        return sorted(notes, key=lambda n: n.effective_priority, reverse=True)

    def should_surface_note(self, note: Note, current_context: Dict) -> bool:
        """
        Proactively surface notes when contextually relevant.

        Example: User asks about "Blue Mugs" -> surface note about
        "Review Blue Mug inventory" even if TTL hasn't expired.
        """
        # Surface if priority is critical
        if note.effective_priority > 0.9:
            return True

        # Surface if contextually relevant
        note_entities = self._extract_entities(note.content)
        context_entities = current_context.get("mentioned_entities", [])

        overlap = set(note_entities) & set(context_entities)
        if overlap:
            return True

        return False
```

---

## 6. Context-Conditional Beliefs for Shopify

From the "Context-Conditional Beliefs" paper:

```python
class ShopifyBeliefGraph:
    """
    Context-conditional beliefs for Shopify operations.

    Key insight: "GL code 5100 works for Client A" is different from
    "GL code 5100 works for Client B". Similarly, "Weekend promotions
    work for ethnic wear" is different from "Weekend promotions work
    for electronics".
    """

    def resolve_belief(
        self,
        belief_statement: str,
        context: Dict
    ) -> Optional[BeliefState]:
        """
        Find most specific matching belief using hierarchical backoff.

        Context dimensions for Shopify:
        - product_category
        - customer_segment
        - time_period (weekday/weekend, season)
        - price_range
        - channel (Shopify, Amazon, etc.)
        """
        # Build context key
        context_key = self._build_context_key(context)
        # e.g., "ethnic_wear|maharashtra|weekend|premium|shopify"

        # Try exact match first
        if context_key in self.beliefs[belief_statement]:
            return self.beliefs[belief_statement][context_key]

        # Backoff ladder (most specific to least specific)
        backoff_ladder = self._build_backoff_ladder(context_key)

        for candidate in backoff_ladder:
            if candidate in self.beliefs[belief_statement]:
                return self.beliefs[belief_statement][candidate]

        # No match - agent should seek guidance
        return None

    def _build_backoff_ladder(self, context_key: str) -> List[str]:
        """
        Generate progressively more general contexts.

        Example for "ethnic_wear|maharashtra|weekend|premium|shopify":
        1. ethnic_wear|maharashtra|weekend|premium|shopify (exact)
        2. ethnic_wear|maharashtra|weekend|premium|* (drop channel)
        3. ethnic_wear|maharashtra|weekend|*|* (drop price)
        4. ethnic_wear|maharashtra|*|*|* (drop time)
        5. ethnic_wear|*|*|*|* (drop region)
        6. *|*|*|*|* (global default)
        """
        dimensions = context_key.split("|")
        ladder = [context_key]

        for i in range(len(dimensions) - 1, 0, -1):
            generalized = dimensions[:i] + ["*"] * (len(dimensions) - i)
            ladder.append("|".join(generalized))

        ladder.append("|".join(["*"] * len(dimensions)))
        return ladder
```

---

## 7. Complete Implementation Plan

### Phase 1: Foundation (Weeks 1-4)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: FOUNDATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SHOPIFY OAUTH INTEGRATION                                                  │
│  ├── Implement OAuth 2.0 flow                                               │
│  ├── Request scopes: read_orders, read_products, read_inventory,            │
│  │                   read_customers, read_analytics                         │
│  ├── Store access tokens securely (encrypted)                               │
│  └── Implement token refresh mechanism                                      │
│                                                                             │
│  DATA INGESTION LAYER                                                       │
│  ├── Set up background sync jobs (hourly for orders, daily for products)    │
│  ├── Normalize Shopify data to unified schema                               │
│  ├── Calculate derived metrics (velocity, margins, stockout risk)           │
│  └── Store in PostgreSQL with proper indexing                               │
│                                                                             │
│  OPENAI INTEGRATION                                                         │
│  ├── Set up OpenAI API client with proper error handling                    │
│  ├── Implement function calling framework                                   │
│  ├── Define initial 10 Shopify-specific functions                           │
│  └── Add request/response logging for debugging                             │
│                                                                             │
│  BASIC THREE-COLUMN MEMORY                                                  │
│  ├── Implement WorkingMemory class with Redis storage                       │
│  ├── Active Tasks: max 4 slots, priority-based eviction                     │
│  ├── Notes: TTL tracking, priority escalation                               │
│  └── Objects: Salience-based loading from database                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Intelligence (Weeks 5-8)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 2: INTELLIGENCE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BELIEF GRAPH IMPLEMENTATION                                                │
│  ├── Neo4j setup for belief storage                                         │
│  ├── Context-conditional belief structure                                   │
│  ├── Belief update with moral asymmetry (β=2.0)                             │
│  └── Backoff resolution for context matching                                │
│                                                                             │
│  COMPETENCE-BASED AUTONOMY                                                  │
│  ├── Map belief strength to autonomy levels                                 │
│  ├── Guidance-seeking mode (strength < 0.4)                                 │
│  ├── Proposal mode (0.4-0.7)                                                │
│  ├── Autonomous mode (> 0.7)                                                │
│  └── Circuit breaker for error recovery                                     │
│                                                                             │
│  WEEKLY BRIEFING SYSTEM                                                     │
│  ├── Scheduled job (Monday 6 AM)                                            │
│  ├── Metrics aggregation from Shopify                                       │
│  ├── OpenAI narrative generation                                            │
│  ├── AI maturity badge                                                      │
│  └── Email/notification delivery                                            │
│                                                                             │
│  PROACTIVE ALERTS                                                           │
│  ├── Stockout prediction (8-day lookahead)                                  │
│  ├── Demand surge detection (>200% velocity)                                │
│  ├── Margin alerts (products selling at loss)                               │
│  └── Return pattern detection                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Scale (Weeks 9-12)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 3: SCALE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MULTI-CHANNEL SUPPORT                                                      │
│  ├── Amazon SP-API integration                                              │
│  ├── Channel comparison matrix                                              │
│  ├── Cross-channel inventory sync                                           │
│  └── Unified profitability across channels                                  │
│                                                                             │
│  BIRTH SYSTEM (Cold Start)                                                  │
│  ├── Firmographic enrichment (Apollo API)                                   │
│  ├── Industry knowledge packs (e-commerce, D2C, retail)                     │
│  ├── Initial belief generation within 90 seconds                            │
│  └── Micro-birth for dynamic entity creation                                │
│                                                                             │
│  AI YEARS TRACKING                                                          │
│  ├── Validated cycle counting                                               │
│  ├── Maturity badge API                                                     │
│  ├── Stage progression tracking                                             │
│  └── Competence preservation metrics                                        │
│                                                                             │
│  PRODUCTION HARDENING                                                       │
│  ├── Rate limiting for Shopify API                                          │
│  ├── Error recovery and retry logic                                         │
│  ├── Audit logging for compliance                                           │
│  └── Performance optimization (caching, batch processing)                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Key Metrics to Track

Following Forrest's AI Years framework:

```python
# Metrics following Forrest's AI Years framework

FRAME_METRICS = {
    "ai_maturity": {
        "age_ai_years": "Validated cycles / 18,000",
        "geometric_mean_reliability": "Product of step reliabilities ^ (1/n)",
        "stage": "Infant/Apprentice/Professional/Expert",
        "clarification_rate": "Questions asked / Total interactions"
    },

    "competence_progression": {
        "day_1_autonomy": "Expected: 20%",
        "day_30_autonomy": "Target: 52%",
        "day_60_autonomy": "Target: 78%",
        "learning_velocity": "% autonomy increase per day"
    },

    "belief_quality": {
        "high_confidence_count": "Beliefs with strength > 0.7",
        "low_confidence_count": "Beliefs with strength < 0.4",
        "error_recovery_time": "Cycles to return to pre-error strength",
        "competence_preservation": "Unrelated beliefs preserved after error"
    },

    "business_impact": {
        "time_saved_hours": "Manual tasks automated",
        "stockouts_prevented": "Alerts that prevented out-of-stock",
        "margin_improvements": "Pricing optimizations accepted",
        "user_satisfaction": "NPS or rating"
    }
}
```

### Maturity Stage Definitions

| Stage        | Reliability | Characteristics                                   |
| ------------ | ----------- | ------------------------------------------------- |
| Infant       | < 0.90      | Learning basics, frequent questions               |
| Apprentice   | 0.90 - 0.95 | Handles routine, needs supervision for edge cases |
| Professional | 0.95 - 0.99 | Autonomous for most tasks, rare escalation        |
| Expert       | > 0.99      | Full domain autonomy, resilient to drift          |

---

## Summary

This architecture enables Frame to:

1. **Maintain Cognitive Context** - Three-column working memory keeps relevant information accessible
2. **Learn Autonomy Gradually** - Belief strength determines supervision level
3. **Integrate Seamlessly** - OpenAI function calling provides natural language interface to Shopify data
4. **Track Maturity** - AI Years framework measures real competence development
5. **Scale Responsibly** - Phased implementation ensures quality at each stage

The key insight from Forrest's research: **competence should be earned through validated experience, not assumed**. This architecture ensures Frame builds trust incrementally while protecting sellers from AI errors.
