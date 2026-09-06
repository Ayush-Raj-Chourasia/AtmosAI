# EVIDENCE_WEIGHTING.md

This document defines **how different kinds of evidence contribute to `incident.confidence_score`** in the Disaster Intelligence Platform.

Its purpose is to ensure confidence is:
- explainable,
- resistant to noise and manipulation,
- consistent across incident types,
- and robust under partial or conflicting information.

This spec must be used together with **CONFIDENCE_DECAY.md**, **INCIDENT_STATE_MACHINE.md**, and **AGENTS.md**.

---

## Core Principle

> **Not all evidence is equal.**

Confidence is not a vote count.  
It is a **weighted synthesis of independent observations**, adjusted for quality, trust, and freshness.

---

## Evidence Categories

Evidence is grouped into explicit categories.  
Each category has:
- a **base weight**
- modifiers based on trust, proximity, and freshness

No evidence category alone can guarantee alerting.

---

## Evidence Categories & Base Weights

> Base weights are **starting points**, not hard truth.  
> They may be tuned, but changes must be documented.

### 1. Direct User Observation
**Definition**
- User explicitly reports firsthand observation

**Examples**
- “Water entered my house”
- “Fire visible behind the market”

**Base weight**
- `0.25`

**Modifiers**
- + proximity bonus (closer = stronger)
- + user trust_score
- − repeated reports from same user

---

### 2. Indirect / Hearsay User Report
**Definition**
- User reports secondhand or uncertain information

**Examples**
- “Heard a loud noise”
- “People say there was a landslide”

**Base weight**
- `0.10`

**Notes**
- Cannot trigger alert alone
- Primarily used to seed clusters

---

### 3. Peer Verification
**Definition**
- Other users confirming or updating an existing incident

**Types**
- `confirm`
- `still_happening`
- `false`
- `resolved`

**Base weight**
- `0.15` per unique verifier

**Modifiers**
- + verifier trust_score
- + proximity
- − diminishing returns after N confirmations

---

### 4. Media Evidence (Images / Video)
**Definition**
- Visual evidence linked to the incident

**Base weight**
- `0.20`

**Modifiers**
- + visual confidence from AI analysis
- − ambiguity penalty (“unclear” outputs)
- − reused or reposted media

**Important**
- Media never outweighs sensors alone
- Dramatic visuals do not equal severity

---

### 5. Sensor / Official Data
**Definition**
- Instrumented or authoritative signals

**Examples**
- Earthquake sensors
- Rainfall / river gauges
- Official alerts

**Base weight**
- `0.30–0.50` (type-dependent)

**Notes**
- Can immediately raise confidence sharply
- Still subject to decay and contradiction

---

### 6. AI Consistency Assessment
**Definition**
- AI judgment on internal consistency of evidence

**Base weight**
- `0.05–0.10`

**Rules**
- AI never introduces new facts
- AI weight is intentionally small
- AI supports, never dominates

---

## Independence Requirement

Confidence must prefer **independent evidence**.

Rules:
- Same user → counted once per category
- Same media asset → counted once
- Reposts do not stack
- Spatially clustered reports count more than distant ones

Independence > volume.

---

## Conflict & Negative Evidence

Some evidence reduces confidence.

### Negative Weights

| Evidence | Effect |
|--------|--------|
| `false` verification | strong negative |
| `resolved` verification | moderate negative |
| sensor contradiction | strong negative |
| AI inconsistency | moderate negative |

Negative evidence:
- applies immediately
- accelerates decay
- may force state transitions

---

## Confidence Composition (Conceptual)

raw_confidence =
Σ(weighted_positive_evidence)
− Σ(weighted_negative_evidence)

incident.confidence_score =
clamp(
apply_decay(raw_confidence),
0.0,
1.0
)

Exact formulas may evolve, but this structure must hold.

---

## Minimum Evidence Rules

To prevent false positives:

- Alerts require **at least two evidence categories**
- One must be either:
  - direct observation
  - peer verification
  - sensor data
- AI-only confidence is forbidden

---

## Incident-Type Modifiers

Different incidents emphasize different evidence:

### Flood
- User observations + media weighted higher
- Sensor alignment (rainfall/river) important

### Earthquake
- Sensors dominate
- User reports secondary

### Fire
- Media + direct observation critical
- Fast decay without reinforcement

### Landslide
- Higher bar for confirmation
- Strong penalty for hearsay

### Power Outage
- User confirmations weighted higher
- Sensors often unavailable

These modifiers are defined in `INCIDENT_THRESHOLDS.md`.

---

## Transparency Requirement

For every confidence score, the system must be able to explain:
- which evidence contributed
- approximate relative influence
- why contradictory evidence was discounted or accepted

If it cannot, confidence must be reduced.

---

## Failure Modes This Spec Prevents

- Popularity-based truth
- Video-driven panic
- Bot amplification
- Confidence inflation from repetition
- AI hallucinations masquerading as evidence

---

## Final Rule

If evidence quality is unclear, **weight it less**.  
If evidence independence is unclear, **weight it less**.  
If evidence freshness is unclear, **let decay handle it**.

Confidence exists to model uncertainty — not to eliminate it.
