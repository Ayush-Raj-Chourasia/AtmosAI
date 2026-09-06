# CONFIDENCE_DECAY.md

This document defines **how confidence decreases over time** in the Disaster Intelligence Platform.

Its purpose is to ensure that:
- stale information fades naturally,
- alerts do not linger,
- uncertainty is handled explicitly,
- and the system never pretends old evidence is fresh.

This spec is mandatory and must be followed alongside **AGENTS.md**, **DATA_LIFECYCLE.md**, and **INCIDENT_STATE_MACHINE.md**.

---

## Core Principle

> **Confidence is not permanent.**

Every confidence score is a function of:
- evidence strength
- evidence freshness
- reinforcement over time

If evidence stops arriving, confidence must decay — visibly and predictably.

---

## What Confidence Represents

`incident.confidence_score` answers only:

> “Given what we know *right now*, how likely is this incident real?”

It does **not** mean:
- severity
- urgency
- impact
- permanence

Confidence must always be time-sensitive.

---

## Inputs to Confidence

Confidence is computed from weighted evidence (see `EVIDENCE_WEIGHTING.md`) and then **decayed over time**.

Key inputs:
- user reports (direct vs hearsay)
- peer verifications
- media evidence (image/video)
- sensor alignment
- AI consistency assessments
- time since last reinforcement

---

## Time Anchors

Every incident tracks:

- `last_evidence_at`  
  Timestamp of the most recent reinforcing evidence
- `created_at`
- `updated_at`

Decay is always calculated relative to `last_evidence_at`, not `created_at`.

---

## Decay Model (Conceptual)

Confidence decay follows a **monotonic decay curve**.

General form (conceptual, not formula-locked):

confidence(t) = confidence(t₀) × decay_factor(t - last_evidence_at)

Where:
- decay_factor ∈ (0, 1]
- decay_factor decreases as time increases
- decay is never negative
- decay never increases confidence

---

## Default Decay Profiles (by Incident Type)

These are **starting defaults**, not eternal truths.

### Flood
- Decay speed: **medium**
- Rationale: conditions change, but not instantly

### Landslide
- Decay speed: **slow**
- Rationale: impact persists, confirmation takes time

### Fire
- Decay speed: **fast**
- Rationale: fires change rapidly; stale info is dangerous

### Earthquake
- Decay speed: **very slow**
- Rationale: single moment event, but after-effects persist

### Power Outage
- Decay speed: **medium-fast**
- Rationale: often resolved quickly, but not always

---

## Example Decay Timeline (Illustrative)

Assume initial confidence = `0.85`

| Time since last evidence | Confidence (Flood) |
|------------------------|--------------------|
| 0 minutes              | 0.85               |
| 30 minutes             | 0.75               |
| 60 minutes             | 0.62               |
| 120 minutes            | 0.45               |
| 240 minutes            | 0.28               |

Numbers are illustrative; shape matters more than exact values.

---

## Reinforcement Rules

Confidence **may increase or stabilize** only if *new evidence arrives*.

Valid reinforcement:
- new direct user observation
- peer verification (“still happening”)
- sensor confirmation
- credible media evidence

Invalid reinforcement:
- repeated identical reports from same user
- passive time passing
- map views or user interactions

Reinforcement resets or slows decay based on evidence weight.

---

## Contradictions & Negative Reinforcement

Some inputs actively **accelerate decay**:

- trusted users marking `false`
- verified `resolved` confirmations
- sensor data contradicting claims
- visual evidence inconsistent with incident type

Negative reinforcement:
- reduces confidence immediately
- may force state transitions (see state machine)

---

## Interaction with Incident Status

Confidence decay **does not automatically change status**, but it informs policy decisions.

Typical policies:
- If confidence falls below alert threshold → `alert → monitor`
- If confidence continues decaying → `monitor → resolved`

Status transitions must be logged in `incident_lifecycle`.

---

## Hard Staleness Cutoffs

To avoid ghost incidents, define **maximum lifetimes**.

Default recommendations:
- `monitor`: auto-resolve after ~60 minutes without reinforcement
- `alert`: considered stale after 2–6 hours without reinforcement (type-dependent)

These cutoffs are enforced even if confidence remains numerically > 0.

---

## Visibility Implications

As confidence decays:
- map opacity decreases
- incidents may collapse or fade
- alerts are never re-fired unless reinforced

Users should be able to *see* uncertainty increasing.

---

## AI’s Role (Strictly Limited)

AI may:
- summarize evidence freshness
- recommend decay adjustments

AI may **not**:
- stop decay
- override staleness cutoffs
- increase confidence without new evidence

Decay is deterministic system logic.

---

## Failure Modes This Spec Prevents

- Alerts lingering all day
- Old incidents resurfacing without cause
- “Zombie” disasters on the map
- Overconfidence in dramatic but stale media

---

## Final Rule

If the system cannot explain **why confidence is still high**, it must decay.

Confidence that does not fade is not confidence — it is denial.
