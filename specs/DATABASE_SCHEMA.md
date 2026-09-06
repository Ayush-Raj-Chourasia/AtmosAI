# DATABASE_SCHEMA.md

This document defines the **authoritative database schema** for the Disaster Intelligence Platform.  
It is not just a list of tables — it explains **what each table represents**, **why it exists**, and **what it must never be used for**.

This schema strictly follows the principles defined in **AGENTS.md**.

Authoritative references:
- `SCHEMA_MIGRATION.sql`

---

## Design Principles

1. **Separate uncertainty from decisions**  
   Raw observations, interpreted hypotheses, and system actions must live in different tables.

2. **Favor auditability over convenience**  
   Every alert must be explainable and replayable from stored data.

3. **Store intent, not surveillance**  
   Users define places they care about. We do not track movement or location history.

4. **AI outputs are data, not authority**  
   AI analysis is stored immutably and never triggers alerts directly.

5. **Incidents are first-class entities**  
   A single cluster can contain multiple concurrent disasters.

---

## High-Level Data Flow

signals
↓
clusters (place + time containers)
↓
incidents (specific disaster hypotheses)
↓
incident lifecycle + notifications

---

## Identity & Places

### `users`

Represents a minimal user identity required for trust and notifications.

**Key characteristics**
- No personal profile data
- No location tracking
- No behavioral analytics

**Key fields**
- `trust_score`: long-term credibility signal based on past accuracy

---

### `user_places`

Static locations a user explicitly cares about (e.g. Home, Office, Parents’ House).

**Purpose**
- Primary mechanism for proximity-based alerts
- Privacy-preserving alternative to live tracking

**Rules**
- User-defined only
- Fixed radius
- No automatic updates

**Never used for**
- Tracking movement
- Inferring routines
- Analytics on presence

---

### `user_place_preferences`

Per-place notification preferences.

**Why it exists**
- Sensitivity differs by location
- Avoids global “one-size-fits-all” alert rules

**Examples**
- Flood alerts enabled at Home
- Earthquake alerts enabled at Office

---

## Signal Ingestion Layer

### `signals`

Immutable raw inputs from the outside world.

**Sources**
- User submissions
- Social media
- News
- Sensors

**Rules**
- Append-only
- Never edited or deleted except for legal compliance
- Never trusted directly

Signals answer only:
> “What was observed or claimed?”

---

### `user_reports`

Structured user submissions layered on top of signals.

**Adds**
- User identity
- Observation confidence (`direct_observation`, `uncertain`, `hearsay`)

This allows the system to reason about **how** something was reported, not just **what** was said.

---

## Clustering Layer

### `clusters`

Spatial + temporal containers.

A cluster represents:
> “Something may be happening here during this time window.”

**Important**
- A cluster is not a disaster
- A cluster may contain multiple incidents

**Fields**
- `city`
- `time_start`, `time_end`
- `status` (procedural, not factual)

---

### `cluster_signals`

Pure relationship table linking signals to clusters.

**Why it exists**
- Explainability
- Replayability
- Debugging clustering logic

---

### `cluster_metrics`

Deterministic numeric facts about a cluster.

**Examples**
- Report counts
- Verification velocity
- Sensor alignment flags

**Rules**
- Computed by the system
- Overwritten on recompute
- Read by AI, never inferred by AI

---

### `cluster_lifecycle`

Audit log for cluster state transitions.

Answers questions like:
- “Why did the system start monitoring this area?”
- “Why was this cluster closed?”

---

## Incident Layer (Core Domain)

### `incidents`

Represents a **specific disaster hypothesis** inside a cluster.

**Key rule**
These three fields must never be conflated:

- `confidence_score` — how sure we are the incident is real
- `severity` — how bad it would be *if real*
- `status` — what the system is doing about it

**Examples**
- Flood (alert)
- Landslide (monitor)
- Power outage (suppress)

All may coexist within one cluster.

---

### `incident_signals`

Links signals (evidence) to incidents.

Allows the system to explain:
> “Why do we believe this incident exists?”

---

### `incident_relationships`

Models cascading or correlated incidents.

**Examples**
- Rainfall → Flood
- Flood → Landslide risk
- Landslide → Power outage

This is intentionally a simple graph, not a complex causal engine.

---

### `incident_lifecycle`

Audit trail for incident status transitions.

Critical for:
- Alert justification
- Post-incident review
- Trust analysis

---

## Verification Layer

### `verifications`

Peer observation logging.

**Important**
- This is not voting
- Each entry represents an observation

**Types**
- `confirm`
- `still_happening`
- `false`
- `resolved`

---

## AI Layer

### `ai_evaluations`

Immutable AI outputs (e.g. Gemini).

**Rules**
- Append-only
- Never overwrite system facts
- Never trigger alerts directly

Each row represents:
> “Given this evidence bundle, here is how consistent it appears.”

An evaluation may apply to:
- A cluster
- An incident  
…but never both.

---

## Notification Layer (Minimal by Design)

### `user_notification_state`

Stores **notification decisions**, not messages.

**One row per**
- user × place × incident

Prevents:
- Duplicate alerts
- Notification spam

---

### `notification_outbox`

Short-lived delivery queue.

**Rules**
- TTL-based cleanup
- No historical meaning
- May be replaced by an external message queue

---

### `notification_audit`

Optional coarse audit table.

**Purpose**
- Aggregate counts only
- No user identities
- Cheap long-term retention

---

## Spatial Query Rules

- All proximity checks use PostGIS `GEOGRAPHY`
- Queries are always:

incident → user_places

- Never:

users → incidents

- Queries are edge-triggered (on state change), not polled

---

## Explicit Non-Goals

The database is **not** used for:
- Disaster prediction
- User surveillance
- Storing notification content
- Social analytics or engagement metrics

---

## Final Rule

If a table starts answering **two different conceptual questions**, it is wrong.

Add a new table instead of collapsing meaning.

This schema is designed to **age well under uncertainty** — do not optimize away its clarity.
