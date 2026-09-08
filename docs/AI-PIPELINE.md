# N-WEIS AI Pipeline & Mathematical Models

**Target:** SIH26069 — Ministry of Earth Sciences / IMD  
**Core Domain:** Probabilistic Confidence Fusion, Misinformation Quarantine, and Temporal Decay  

---

## 1. Mathematical Confidence Fusion Model (7 Factors)

Unlike simplistic keyword counters or black-box neural estimators, N-WEIS employs an **explainable, multi-factor probabilistic fusion model**. Every confidence score is decomposed into audited, traceable sub-factors.

$$\text{Confidence}(E) = \max\left(0.0, \min\left(1.0, \sum_{i=1}^{6} w_i \cdot F_i - P_{\text{skeptic}}\right)\right)$$

| Factor ($F_i$) | Name | Weight ($w_i$) | Mathematical Formulation & Description |
|---|---|---|---|
| **$F_1$** | Source Credibility | $0.25$ | $\frac{1}{|S_E|} \sum_{s \in S_E} \text{BaseReliability}(s)$<br>Official IMD = 1.0, News = 0.85, Citizen = 0.55, Social = 0.35 |
| **$F_2$** | Cross-Source Corroboration | $0.25$ | $\min\left(1.0, \frac{|V_{\text{distinct sources}}|}{3}\right)$<br>Reaches maximum 1.0 when at least 3 distinct source types confirm the incident |
| **$F_3$** | Ground Truth Sensor Proximity | $0.15$ | $1.0 - \min\left(1.0, \frac{d_{\text{sensor}}}{25\text{ km}}\right)$ if sensor confirms active hazard; $0.0$ otherwise |
| **$F_4$** | Temporal Freshness | $0.15$ | $0.5^{\frac{\Delta t}{T_{1/2}}}$, where $\Delta t$ is elapsed time since latest confirming evidence and $T_{1/2}$ is the hazard half-life |
| **$F_5$** | Geocoding Precision | $0.10$ | Native GPS = $0.98$, Landmark Gazetteer = $0.90$, District Centroid = $0.25$ |
| **$F_6$** | Multimodal Media Evidence | $0.05$ | $\min(1.0, 0.5 + 0.25 \cdot N_{\text{verified photos}})$ |
| **$P_{\text{skeptic}}$** | AI Skeptic Hoax Penalty | $-0.20$ | Deducted whenever misinformation probability exceeds $0.50$ |

---

## 2. Temporal Confidence Decay & Staleness Model

Natural hazards possess distinct physical lifetimes. A severe squall dissipates within 45 minutes, while riverine floodwaters recede over days. N-WEIS implements **hazard-specific exponential decay**:

$$C(t) = C_0 \cdot \exp\left(-\frac{\ln(2)}{T_{1/2}} \cdot \Delta t\right) = C_0 \cdot 2^{-\frac{\Delta t}{T_{1/2}}}$$

### Decay Profiles by Hazard Taxonomy

| Hazard Category | Half-Life ($T_{1/2}$) | Staleness Cutoff | Decay Speed | Automated State Consequence |
|---|---|---|---|---|
| **THUNDERSTORM** | 45 min | 2 hours | Fast | Status drops to `UNDER_REVIEW` after 45m; auto-resolves after 2h |
| **STRONG_WIND** | 40 min | 2 hours | Fast | Rapid dissipation once squall line passes |
| **DUST_STORM** | 45 min | 2 hours | Fast | Ground visibility normalizes quickly |
| **FOG** | 75 min | 4 hours | Medium-Fast | Burns off with solar insolation |
| **RAINFALL** | 90 min | 3 hours | Medium-Fast | Requires continuous radar/AWS reinforcement |
| **FLOOD** | 180 min (3h) | 6 hours | Medium | High water retention; slow decay |
| **HEATWAVE** | 360 min (6h) | 12 hours | Slow | Diurnal temperature persistence |
| **OTHER** | 90 min | 3 hours | Medium | Standard operational default |

If no corroborating signals or sensor readings are received beyond the **Staleness Cutoff**, the incident is automatically transitioned to `RESOLVED` with the audit rationale: *"Auto-resolved due to temporal staleness cutoff exceeded."*

---

## 3. AI Skeptic & Misinformation Quarantine Engine

The Skeptic engine protects public safety forces from acting on malicious hoaxes, old recycled storm photos, or bot amplification.

### Detection Dimensions:
1. **Lexical Clickbait & Panic Induction:** Evaluates sentiment and flags sensationalist tokens:
   - *"IMD is lying / hiding the cyclone"*
   - *"Entire city under 100 feet of water"*
   - *"Tsunami warning issued for Delhi / inland city"*
2. **Perceptual Media Checksum Match:** Checks uploaded image hashes against a database of known historical flood photos (e.g. photos from 2015 Chennai floods falsely recirculated during 2026 monsoon).
3. **Cross-Corroboration Anomaly:** A high-severity report originating from an unverified social handle without any AWS sensor anomaly or citizen report within 25 km receives an elevated skepticism score.

### Quarantine Action:
- Misinformation Score $\in [0.0, 1.0]$.
- If score $\ge 0.65$: Signal is marked `REJECTED`, quarantined from all event fusion, and logged in the Duty Meteorologist verification queue for review.

---

## 4. Semantic Deduplication via Jaccard Word Token Overlap

To identify duplicate reports without running costly transformer inferences on every incoming tweet or SMS, N-WEIS employs tokenized Jaccard similarity with Indian stopwords removal:

$$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$

- **Threshold:** $J \ge 0.75$ constitutes a semantic duplicate.
- **Combined Spatial Gate:** $J \ge 0.40$ combined with Haversine distance $\le 3.0$ km and matching event candidate is also clustered as a duplicate observation.
