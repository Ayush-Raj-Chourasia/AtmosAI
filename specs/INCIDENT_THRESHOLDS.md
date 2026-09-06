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

## Threshold Matrix (SIH 2026 Meteorological Taxonomy)

> Calibrated specifically for Indian climatic regimes and IMD / MoES observation infrastructure.

### 🌊 FLOOD (Urban / Riverine Inundation)
**Characteristics**
- High localized impact; visual road & residential waterlogging.
- Corroborated by Central Water Commission (CWC) river gauges & IMD AWS rain gauges.
**Rules**
- Monitor → Alert at confidence ≥ **0.70** (PRD multi-source target: 0.94)
- Minimum evidence categories: **2** (e.g. IMD bulletin + ground citizen report or news)
- Staleness window: Monitor ~60 min; Alert ~4 hours
- Decay speed: **Medium** (water recession takes 3–6 hours)
**Fast-track**
- Official IMD Red Alert + CWC river level above Danger Mark + geo-tagged media.

---

### ⛈️ THUNDERSTORM (Convective Storms & Lightning)
**Characteristics**
- Rapid convective development; squalls, lightning strikes, fallen trees.
- Detected via IMD Doppler Weather Radar (DWR) reflectivity & Lightning Detection Network.
**Rules**
- Monitor → Alert at confidence ≥ **0.75**
- Minimum evidence categories: **2**
- Staleness window: Monitor ~30 min; Alert ~90 min
- Decay speed: **Fast** (convective cells move at 40–60 km/h; dissipate within 1–2 hours)
**Fast-track**
- IMD Nowcast warning + multiple citizen tree-fall/lightning strikes.

---

### 🌧️ RAINFALL (Heavy Downpour / Cloudburst)
**Characteristics**
- Sustained precipitation causing localized disruption (e.g. Mumbai coastal rains).
- Corroborated by Automatic Rain Gauges (ARG) & Automatic Weather Stations (AWS).
**Rules**
- Monitor → Alert at confidence ≥ **0.65**
- Minimum evidence categories: **2**
- Staleness window: Monitor ~45 min; Alert ~2.5 hours
- Decay speed: **Medium-Fast**
**Fast-track**
- AWS precipitation > 64.5 mm/h (IMD Heavy Rain criteria).

---

### 🔥 HEATWAVE (Extreme Thermal Conditions)
**Characteristics**
- Prolonged high surface temperatures (≥ 45°C or departure ≥ 4.5°C above normal).
- Driven by dry continental westerly winds ("Loo" across Rajasthan, Haryana, Delhi).
**Rules**
- Monitor → Alert at confidence ≥ **0.80**
- Minimum evidence categories: **2** (IMD synoptic station reading + regional advisory)
- Staleness window: Monitor ~2 hours; Alert ~8 hours
- Decay speed: **Slow** (diurnal cycle maintains heat throughout daylight hours)
**Fast-track**
- IMD Maximum Temperature recording ≥ 47.0°C in plains.

---

### 🌫️ FOG (Dense Radiation / Advection Fog)
**Characteristics**
- Low surface visibility impacting aviation, railways, and highways (e.g. Indo-Gangetic Plains).
- Measured via Airport Runway Visual Range (RVR) transmissometers & visibility sensors.
**Rules**
- Monitor → Alert at confidence ≥ **0.70**
- Minimum evidence categories: **2** (Airport METAR/RVR + highway traffic reports)
- Staleness window: Monitor ~45 min; Alert ~3 hours
- Decay speed: **Medium-Fast** (dissipates with solar radiation by mid-morning)
**Fast-track**
- Runway Visual Range (RVR) < 200m at CAT-III airports.

---

### 🌪️ DUST_STORM (Andhi / Sandstorms)
**Characteristics**
- Sudden convective dust wall accompanied by gale winds and abrupt temperature drop.
- Typical in arid and semi-arid Northwest India (Rajasthan, Punjab, Haryana, Delhi).
**Rules**
- Monitor → Alert at confidence ≥ **0.75**
- Minimum evidence categories: **2**
- Staleness window: Monitor ~30 min; Alert ~90 min
- Decay speed: **Fast** (suspended particulate settles rapidly once winds subside)
**Fast-track**
- Anemometer gust ≥ 50 km/h + visibility < 500m.

---

### 💨 STRONG_WIND (Gale / Cyclonic Squall)
**Characteristics**
- High surface wind velocity capable of uprooting hoardings, trees, and transmission lines.
- Measured via anemometer masts and coastal radar stations.
**Rules**
- Monitor → Alert at confidence ≥ **0.70**
- Minimum evidence categories: **2**
- Staleness window: Monitor ~30 min; Alert ~2 hours
- Decay speed: **Fast**
**Fast-track**
- Continuous sustained wind speed ≥ 62 km/h (Gale force).

---

### ⚠️ OTHER (Localized Atmospheric Anomalies)
**Characteristics**
- Hailstorms, microbursts, frost, or unclassified localized severe weather events.
**Rules**
- Monitor → Alert at confidence ≥ **0.85**
- Minimum evidence categories: **3**
- Staleness window: Monitor ~45 min; Alert ~2 hours
- Decay speed: **Medium**

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
