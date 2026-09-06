# DATA_LIFECYCLE.md

This document defines how data is **created, updated, decays, expires, and is archived** in the Disaster Intelligence Platform.  
Its goal is to keep the system **trustworthy**, **auditable**, **privacy-respecting**, and **cheap to operate** over time.

This lifecycle strictly follows the principles defined in **AGENTS.md**.

---

## Core Principles

1. **Immutable inputs**  
   Raw observations are append-only.

2. **Mutable hypotheses**  
   Clusters and incidents evolve as evidence changes.

3. **Immutable reasoning**  
   AI outputs and lifecycle decisions are never overwritten.

4. **Decisions, not messages**  
   Notifications store *decision state*, not message bodies.

5. **Time matters**  
   Freshness affects confidence, visibility, and alerting behavior.

---

## Data Classes & Lifecycle Rules

---

### 1. Signals (`signals`)

**What it is**  
Raw, untrusted inputs from the outside world.

**Sources**
- User submissions
- Social media
- News
- Sensors

**Write pattern**
- Append-only

**Update pattern**
- Never updated
- Corrections appear as new rows

**Retention**
- **Hot:** 90 days (indexed, queryable)
- **Cold:** 1–3 years (archived / partitioned)

**Deletion**
- Only for legal compliance
- Never silently removed

**Role in system**
> “What was observed or claimed?”

---

### 2. User Reports (`user_reports`)

**What it is**  
Structured user submissions layered on top of signals.

**Adds**
- User identity
- Observation confidence (`direct_observation`, `uncertain`, `hearsay`)

**Write pattern**
- Append-only

**Retention**
- Same lifecycle as associated signal

**Privacy**
- Deleted or anonymized if user deletes account

---

### 3. Clusters (`clusters`, `cluster_signals`, `cluster_metrics`)

**What it is**  
Spatial + temporal containers.

A cluster represents:
> “Something may be happening here during this time window.”

**Write pattern**
- Created by clustering workers

**Update pattern**
- `cluster_metrics` overwritten on recompute
- `cluster_signals` appended when new signals join
- `clusters.updated_at` refreshed on extension

**Visibility & decay**
- `monitor` clusters auto-expire after **30–60 minutes** without new evidence
- Cluster remains active while any incident inside is active

**Retention**
- 30–90 days hot
- Archived after incidents are archived

---

### 4. Incidents (`incidents`, `incident_signals`, `incident_relationships`)

**What it is**  
Specific disaster hypotheses inside a cluster.

**Key orthogonality**
- `confidence_score` → certainty
- `severity` → impact if real
- `status` → system posture

**Update pattern**
- Fields may change as evidence evolves
- Evidence links are append-only

**Visibility & decay**
- `monitor`:
  - Auto-resolve after **~60 minutes** without reinforcement
- `alert`:
  - Consider stale after **2–6 hours** without reinforcement
  - Downgrade or resolve based on policy

**Retention**
- 90 days hot
- Archived afterward

---

### 5. Verifications (`verifications`)

**What it is**  
Peer observation logging.

**Not**
- Voting
- Polling
- Popularity metrics

**Write pattern**
- Append-only

**Retention**
- Same as incidents

---

### 6. AI Evaluations (`ai_evaluations`)

**What it is**  
Immutable AI outputs (e.g., Gemini).

**Rules**
- Append-only
- Never overwrite system state
- Never directly trigger alerts

**Retention**
- At least as long as incidents
- Prefer longer retention (cheap, valuable for audits)

---

### 7. Lifecycle Audit (`cluster_lifecycle`, `incident_lifecycle`)

**What it is**  
Why system posture changed.

**Write pattern**
- Append-only

**Retention**
- Long-lived (1–3 years minimum)

**Purpose**
- Alert justification
- Post-incident review
- Trust analysis

---

### 8. Notifications (`user_notification_state`, `notification_outbox`, `notification_audit`)

#### `user_notification_state`
- Stores **notification decisions**
- One row per `user × place × incident`
- Updated in place
- Prevents duplicate alerts

**Retention**
- 90–180 days
- Older resolved incidents may be pruned

#### `notification_outbox`
- Short-lived delivery queue
- TTL-based cleanup (minutes to hours)
- No historical meaning

#### `notification_audit`
- Optional coarse audit
- Stores only counts
- No user identity
- Long retention (cheap)

---

## Archiving Strategy

Recommended approach:
- Monthly partitions for high-volume tables
- Move expired partitions to cold storage
- Keep schema intact for replayability

---

## Deletion & Privacy Guarantees

- Account deletion:
  - Remove `user_places`, preferences, reports, verifications, notification state
- Signals may remain without user linkage
- No location history is ever stored

---

## Non-Goals (Explicit)

This lifecycle is **not** designed for:
- Predicting disasters
- Tracking people
- Engagement analytics
- Message history storage

---

## Final Rule

If data is no longer **fresh**, it must either:
- decay visibly,
- resolve explicitly, or
- be archived intentionally.

Nothing lingers silently.

The system must age **gracefully under uncertainty**.
