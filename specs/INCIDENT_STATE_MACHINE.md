# INCIDENT_STATE_MACHINE.md

This document defines the **authoritative state machine** for `incident.status` in the Disaster Intelligence Platform.

It exists to ensure that alerting behavior is **predictable**, **auditable**, and **trust-preserving**, even as evidence changes over time.

This document must be followed strictly and is aligned with **AGENTS.md** and **DATA_LIFECYCLE.md**.

---

## Core Principle

`incident.status` represents **what the system is doing**, not what is true.

Truth is probabilistic (`confidence_score`).  
Impact is contextual (`severity`).  
Status is procedural.

These must never be conflated.

---

## Orthogonal Dimensions (Non-Negotiable)

| Dimension | Meaning | Examples |
|---------|--------|---------|
| `confidence_score` | How sure we are this is real | 0.32, 0.78, 0.94 |
| `severity` | How bad it would be if real | low, medium, high |
| `status` | System posture | monitor, alert, suppress, resolved |

Status is **derived** from confidence, severity, time, and policy — never the other way around.

---

## Incident States

### `monitor`

**Meaning**  
The system is observing a possible incident but has not decided to notify users.

**User experience**
- Visible on map with reduced prominence
- No push notifications

**Typical characteristics**
- Confidence below alert threshold
- Sparse or early evidence
- Possible high severity, but insufficient certainty

---

### `alert`

**Meaning**  
The system has sufficient evidence and has decided to notify relevant users.

**User experience**
- Push notifications sent (deduplicated)
- Prominent map marker

**Important**
- Alert does **not** mean catastrophic
- Alert means “relevant and sufficiently certain”

---

### `suppress`

**Meaning**  
The system believes the incident is unlikely to be real or relevant.

**User experience**
- Hidden from default map
- No notifications

**Reasons**
- Strong contradictions
- Repeated false confirmations
- Spam or coordinated misinformation
- Sensor mismatch (where applicable)

---

### `resolved`

**Meaning**  
The incident is no longer active or relevant.

**User experience**
- Hidden by default
- May appear in history views

**Resolved does not mean**
- “Never happened”
- “Was false”

It means the system has closed the loop.

---

## Allowed State Transitions

Only the following transitions are allowed.

Any other transition is invalid and must be rejected.

---

### `monitor → alert`

**When**
- `confidence_score` crosses event-type threshold
- AND minimum evidence criteria are met
- AND incident is not suppressed

**Examples**
- Multiple direct observations
- Media evidence aligns
- Verification velocity increases

**Required actions**
- Insert row into `incident_lifecycle`
- Trigger notification workflow
- Update `user_notification_state`

---

### `alert → monitor`

**When**
- Confidence drops below alert threshold
- Evidence decays without reinforcement
- Contradictory signals appear

**Notes**
- This transition does **not** send notifications by default
- Avoid alert churn

---

### `monitor → suppress`

**When**
- Strong contradictory evidence dominates
- Multiple trusted users flag false
- Clear mismatch with sensors or visuals

**Required actions**
- Log lifecycle entry with reason
- Block alerting unless manually overridden

---

### `alert → resolved`

**When**
- Resolution signals dominate
- Official or sensor data confirms recovery
- Time-based closure after inactivity

**Required actions**
- Log lifecycle entry
- Optional “resolved” notification (only if an alert was sent)

---

### `monitor → resolved`

**When**
- Evidence decays without confirmation
- Time window expires
- Incident never reached alert threshold

**Required actions**
- Log lifecycle entry

---

### `suppress → monitor` (rare)

**When**
- New high-quality evidence appears
- Suppression reason is no longer valid

**Notes**
- Requires strong evidence
- Must be explicitly logged

---

## Forbidden Transitions

These transitions are **not allowed**:

- `suppress → alert` (must pass through `monitor`)
- `resolved → alert` (must create a new incident or re-open via monitor)
- Direct writes to `alert` without lifecycle logging

---

## Time-Based Decay (Default Policy)

These are defaults and may be tuned per incident type.

| State | No New Evidence After | Action |
|-----|----------------------|-------|
| monitor | ~60 minutes | auto → resolved |
| alert | 2–6 hours | downgrade or resolve |
| suppress | N/A | remains suppressed |

Decay must be **visible and logged**, never silent.

---

## Relationship to Clusters

- A cluster remains active while **any** incident is `monitor` or `alert`
- Cluster status is derived from incident states
- Cluster status never overrides incident status

---

## Audit Requirements

Every status change must:
- Insert into `incident_lifecycle`
- Include:
  - `from_status`
  - `to_status`
  - `reason`
  - `triggered_by` (system / ai / admin)

If it isn’t logged, it didn’t happen.

---

## Common Failure Modes (Avoid These)

- Treating alert as “truth”
- Suppressing high-severity but uncertain incidents permanently
- Alerting repeatedly on confidence fluctuations
- Skipping `monitor` for speed
- Letting AI change status directly

---

## Final Rule

If you cannot explain **why an incident changed state** to a non-technical person using the lifecycle log alone, the transition is invalid.

The state machine exists to protect **trust first**, speed second.
