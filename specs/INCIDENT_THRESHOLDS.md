# INCIDENT_THRESHOLDS.md

This document defines **incident-type–specific thresholds and rules** for transitioning incidents between states (`monitor`, `alert`, `suppress`, `resolved`) in the Disaster Intelligence Platform.

Its purpose is to ensure that:
- different disasters are treated differently,
- alerting reflects real-world risk profiles,
- confidence is not evaluated with a single global standard,
- and system behavior is predictable and explainable.

This spec must be used alongside **EVIDENCE_WEIGHTING.md**, **CONFIDENCE_DECAY.md**, and **INCIDENT_STATE_MACHINE.md**.

---

## Core Principle

> **Different disasters require different proof.**

A flood, an earthquake, and a power outage do not deserve the same certainty, speed, or decay behavior.

Global thresholds are forbidden.

---

## What Thresholds Control

Per incident type, thresholds define:

- Minimum confidence to transition `monitor → alert`
- Minimum evidence categories required
- Decay speed modifiers
- Default staleness windows
- Conditions for fast-track alerting
- Conditions for forced suppression

Thresholds affect **policy**, not facts.

---

## Common Terms

- **Confidence Threshold**  
  Minimum `incident.confidence_score` required to enter `alert`

- **Minimum Evidence Categories**  
  Number of distinct evidence types required (see `EVIDENCE_WEIGHTING.md`)

- **Fast-Track**  
  Conditions under which an incident may alert immediately

- **Staleness Window**  
  Time without reinforcement after which downgrade or resolution is expected

---

## Threshold Matrix (Defaults)

> These are conservative defaults and must be tuned with real data.

### 🌊 Flood

**Characteristics**
- Common
- Localized
- Visually observable
- Moderate false-positive risk

**Rules**
- Monitor → Alert at confidence ≥ **0.70**
- Minimum evidence categories: **2**
  - At least one of: direct observation, peer verification
- Sensor alignment (rainfall/river) strongly boosts confidence
- Staleness window:
  - Monitor: ~60 minutes
  - Alert: ~4 hours

**Fast-track**
- Multiple direct observations + rising river sensor

---

### 🪨 Landslide

**Characteristics**
- High impact
- Rare
- Often reported via hearsay
- High false-positive risk

**Rules**
- Monitor → Alert at confidence ≥ **0.80**
- Minimum evidence categories: **3**
  - One must be direct observation or sensor
- Strong penalty for hearsay-only clusters
- Staleness window:
  - Monitor: ~90 minutes
  - Alert: ~6 hours

**Fast-track**
- Sensor confirmation + media evidence

---

### 🔥 Fire

**Characteristics**
- Fast-changing
- Visually dramatic
- Rapid escalation and resolution

**Rules**
- Monitor → Alert at confidence ≥ **0.65**
- Minimum evidence categories: **2**
  - Media or direct observation required
- Aggressive decay if not reinforced
- Staleness window:
  - Monitor: ~30 minutes
  - Alert: ~2 hours

**Fast-track**
- Clear video evidence + multiple confirmations

---

### 🌎 Earthquake

**Characteristics**
- Instantaneous
- Sensor-detectable
- High severity, low ambiguity

**Rules**
- Monitor → Alert at confidence ≥ **0.60**
- Minimum evidence categories:
  - Sensor data alone is sufficient
- User reports used for impact assessment, not existence
- Very slow decay
- Staleness window:
  - Monitor: N/A
  - Alert: ~12 hours (aftershocks context)

**Fast-track**
- Sensor detection above magnitude threshold

---

### ⚡ Power Outage

**Characteristics**
- Low severity per user
- High relevance locally
- No reliable sensors

**Rules**
- Monitor → Alert at confidence ≥ **0.60**
- Minimum evidence categories: **2**
  - Peer verifications required
- User reports weighted heavily
- Staleness window:
  - Monitor: ~45 minutes
  - Alert: ~3 hours

**Fast-track**
- Many confirmations within small radius

---

### ❓ Other / Unknown

**Characteristics**
- Undefined risk
- Higher uncertainty

**Rules**
- Monitor → Alert at confidence ≥ **0.85**
- Minimum evidence categories: **3**
- No fast-track
- Conservative decay

---

## Suppression Rules (All Types)

Immediate `monitor → suppress` when:
- Strong contradictory sensor data
- Multiple trusted users flag `false`
- Evidence determined to be recycled or misleading
- AI finds strong visual inconsistency

Suppression must be logged with reason.

---

## Severity Interaction (Important)

Severity does **not** lower confidence thresholds.

Instead:
- High severity → longer monitoring window
- High severity → stronger scrutiny
- High severity + low confidence → remain in `monitor`

This prevents panic from uncertain catastrophic claims.

---

## Cross-Incident Consistency

Within the same cluster:
- Incidents may have different thresholds
- Flood may alert while landslide remains monitor
- Cluster status derives from incidents, not vice versa

---

## Tuning & Governance

- Threshold changes must be versioned
- Changes must be documented with rationale
- Historical incidents should be replayable under old thresholds

No silent retuning.

---

## Failure Modes This Spec Prevents

- Over-alerting rare disasters
- Under-alerting common ones
- Using popularity as certainty
- Treating all hazards as equal
- Panic-driven alert logic

---

## Final Rule

If you cannot explain **why this incident type requires this level of proof**, the threshold is wrong.

Thresholds encode *respect for reality*, not fear of missing alerts.
