# WeatherNexus: 7-Factor Evidence Fusion & Temporal Decay Engine

**Platform:** WeatherNexus (SIH26069 — National Weather Big Data Analytics Platform)  
**Authority:** Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)  

---

## 1. Mathematical Confidence Formulation

Raw Gemini AI output alone is **never** accepted as the definitive operational confidence. Instead, WeatherNexus synthesizes a composite confidence score $C \in [0.0, 1.0]$ across 7 independent dimensions:

$$C = \min\left(0.98, \; \sum_{i=1}^{7} w_i f_i + S_{\text{synergy}}\right)$$

Where the weights $\sum w_i = 1.00$ are allocated as follows:

| Factor | Weight ($w_i$) | Component | Definition & Calculation |
|---|---|---|---|
| **$f_{\text{source}}$** | **0.25** | Source Reliability | Harmonic mean of baseline reliability scores for corroborating sources (IMD: 1.0, Weather APIs: 0.90, News: 0.85, Verified Citizens: 0.70, Social Media: 0.35). |
| **$f_{\text{ai}}$** | **0.20** | AI Entity Confidence | Model extraction confidence score produced by Gemini structured output (or heuristic classifier). |
| **$f_{\text{media}}$** | **0.15** | Visual Media Support | 0.90 if corroborated by genuine geotagged photograph/video; 0.40 if text-only observation. |
| **$f_{\text{spatial}}$** | **0.15** | Spatial Consistency | Degree of proximity to official IMD/CWC monitoring station or historical hazard hazard zone. |
| **$f_{\text{temporal}}$** | **0.10** | Temporal Alignment | Clustering density of corroborating signals within the 120-minute event window. |
| **$f_{\text{corroboration}}$**| **0.10** | Multi-Source Vector | Scales with number of distinct source categories: $1.0$ for $\ge 3$ sources, $0.8$ for $2$ sources, $0.4$ for $1$ source. |
| **$f_{\text{consistency}}$** | **0.05** | Physical Plausibility | Meteorological consistency between observed variables (e.g. pressure drop coinciding with high wind). |

### Official IMD Synergy Boost ($S_{\text{synergy}}$):
When an official IMD Bulletin/Warning (`source_type: 'imd'`) is present alongside **3 or more** independent observation vectors, an authoritative synergy bonus of **$+0.06$** is applied to elevate the incident directly to actionable alert grade.

---

## 2. Verification Gates & Threshold Invariants

| Confidence Score ($C$) | Incident Status | Operational Action Required |
|---|---|---|
| $C \ge 0.85$ | `VERIFIED` | Auto-promoted to Grade-A alert. Distributed to SDMA and SEOC dashboard. |
| $0.50 \le C < 0.85$ | `UNDER_REVIEW` | High priority. Duty forecaster review requested with automated sensor correlation. |
| $C < 0.50$ | `DETECTED` | Background surveillance. Signals clustered but insufficient evidence to sound alert. |

> **Flood Safety Invariant:** A single citizen observation or unverified social media post can **never** trigger `VERIFIED` status for a `FLOOD` incident, regardless of claimed severity. Independent corroboration from IMD, CWC river gauge, or secondary weather API is mandatory.

---

## 3. Temporal Confidence Decay Engine

Weather incidents are highly dynamic. In the absence of fresh reinforcing observations, incident confidence decays exponentially according to hazard-specific half-lives:

$$C(t) = C_0 \cdot \left(\frac{1}{2}\right)^{\frac{\Delta t}{t_{\text{half}}}}$$

Where:
- $C_0$ = Baseline confidence at time of last observed evidence.
- $\Delta t$ = Elapsed time in minutes since the last reinforcing observation.
- $t_{\text{half}}$ = Hazard-specific half-life (minutes).

### Hazard Half-Life Registry ($t_{\text{half}}$):

| Hazard Category | Half-Life ($t_{\text{half}}$) | Staleness Cutoff | Rationale |
|---|---|---|---|
| `STRONG_WIND` | 40 minutes | 2 hours | Microbursts and localized wind squalls dissipate rapidly. |
| `THUNDERSTORM`| 45 minutes | 2 hours | Convective thunderstorm cells typically track across a city in < 60 min. |
| `DUST_STORM` | 45 minutes | 2 hours | Surface dust suspended by squalls settles within an hour of wind dropping. |
| `FOG` | 75 minutes | 4 hours | Radiation fog lifts as solar insolation heats surface layers. |
| `RAINFALL` | 90 minutes | 3 hours | Localized cloudbursts subside; flash runoff accumulates or drains. |
| `FLOOD` | 180 minutes | 6 hours | Riverine inundation recedes slowly over several hours/days. |
| `HEATWAVE` | 360 minutes | 12 hours | Diurnal synoptic heat domes persist throughout daylight operational hours. |

### Reinforcement Reset:
When a new corroborated observation is ingested for an active incident:
1. Freshness is immediately reset to **100%**.
2. Decay factor returns to **1.0**.
3. Baseline confidence is recalibrated with the newly ingested evidence.