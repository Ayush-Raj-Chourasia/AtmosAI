# WeatherNexus: Multimodal AI & Gemini Reasoning Pipeline

**Platform:** WeatherNexus (SIH26069 — National Weather Big Data Analytics Platform)  
**Authority:** Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)  
**Model:** `gemini-3.8-flash` (Primary) / Deterministic Meteorological Heuristic Engine (Fallback)

---

## 1. Architectural Philosophy & Separation of Concerns

WeatherNexus enforces a strict conceptual separation in automated intelligence:

```
+-----------------------------------------------------------------------------------+
|                        WeatherNexus AI Pipeline Layers                            |
+-----------------------------------------------------------------------------------+
       │                                                     │
       ▼                                                     ▼
[Media Deduplication Engine]                      [Computer Vision & Reasoning]
• Perceptual Hashing (dHash / aHash)              • Multimodal Gemini Reasoning
• 64-character SHA-256 Checksums                  • Visual flood depth & cloud analysis
• Identifies exact / recycled photos              • Cross-checks visual truth with claims
• Does NOT perform scene comprehension            • Evaluates visual damage & severity
```

> **Strict Rule:** Perceptual hashing is categorized as **Media Deduplication**, NOT Computer Vision. Computer vision is performed by Google Gemini Multimodal LLM.

---

## 2. 11 IMD Official Hazard Classifications

The AI pipeline classifies all ingested text and reports into the 11 official IMD meteorological categories:

| Hazard Category | Classification Criteria & Thresholds | Typical Indicators / Keywords |
|---|---|---|
| `RAINFALL` | Heavy (64.5-115.5 mm) to Extremely Heavy (> 204.4 mm) downpour. | Rain, torrential downpour, monsoon, mm rainfall. |
| `THUNDERSTORM` | Convective storm with gusty surface winds and audible thunder. | Squall, thunder, thunderstorm, downdraft. |
| `FLOOD` | Inundation of normally dry land, riverine overflow, embankment breach. | Submerged, inundation, waterlogging, danger mark. |
| `HEATWAVE` | Departure of maximum temperature by >= 4.5°C or >= 45.0°C in plains. | Loo, blistering heat, 47°C, heat stroke, red alert. |
| `COLD_WAVE` | Departure of minimum temperature by <= -4.5°C or min temp <= 4°C. | Sheet lahar, frost, freezing winds, hypothermia. |
| `FOG` | Horizontal surface visibility reduced below 1,000 meters. | Dense fog, RVR system, Safdarjung, visibility 50m. |
| `DUST_STORM` | High wind velocity with suspended particulate reducing visibility. | Andhi, dust storm, sandstorm, Dhaula Kuan. |
| `CYCLONE` | Tropical cyclonic vortex with sustained winds exceeding 62 km/h. | Depression, deep depression, super cyclone, Remal. |
| `STRONG_WIND` | Non-rotational squalls or gale-force winds uprooting trees/structures. | Gale, uprooted poles, 75 km/h gusts, tin roof blown. |
| `HAILSTORM` | Precipitation in the form of frozen balls or ice pellets. | Hail, hailstones, ice storm, crop damage. |
| `LIGHTNING` | Cloud-to-ground electrostatic discharge endangering life/infrastructure. | Vajrapat, lightning strike, thunderstorm electrocution. |

---

## 3. Gemini API Structured JSON Extraction

The service enforces strict schema generation using `responseMimeType: 'application/json'` and low temperature (`0.1`) to ensure deterministic outputs:

```json
{
  "event_category": "FLOOD",
  "severity": "critical",
  "confidence": 0.92,
  "extracted_location": {
    "city": "Guwahati",
    "state": "Assam"
  },
  "key_hazards": ["riverine_flooding", "embankment_overflow", "infrastructure_submersion"],
  "reasoning": "Citizen observation reports Brahmaputra embankment overflow with danger sirens sounding. Corroborates active IMD Red Alert."
}
```

---

## 4. Multimodal Visual Damage Verification

When citizen reports include photographic evidence, Gemini analyzes the image along with the claim:

```
[Citizen Image Base64] + [Text Claim]
              │
              ▼
   Google Gemini Vision
              │
              ├── shows_disaster: true / false
              ├── visual_hazards: ["standing_water", "submerged_vehicles"]
              ├── estimated_water_depth_cm: 65
              ├── damage_severity: "severe"
              ├── matches_text_claim: true
              └── misinformation_risk: 0.05
```

---

## 5. Graceful Heuristic Fallback

When rate limits (HTTP 429), quota limits, or offline conditions are encountered, the platform immediately invokes the **Deterministic Meteorological Heuristic Engine**:
- Evaluates multi-token weighted scoring across meteorological lexicons.
- Prevents pipeline crashes or timeouts.
- Explicitly labels predictions as `LOCAL_RULE_ENGINE` with full audit transparency.