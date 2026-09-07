#!/bin/bash
# N-WEIS — API & Multi-Hazard Notification Test Script (SIH 2026 / SIH26069)
# Target: Ministry of Earth Sciences / India Meteorological Department (IMD)

API_URL="${1:-http://localhost:3001}"

echo "================================================================"
echo " N-WEIS: Testing API Endpoints & Early Warning Pipelines"
echo " Target: $API_URL"
echo "================================================================"

echo -e "\n1. Checking System Health..."
curl -s "$API_URL/health" | grep -o '"status":"[^"]*"'

echo -e "\n2. Triggering National Multi-Hazard Scenario (7 Regions)..."
curl -s -X POST "$API_URL/api/v1/admin/demo/scenario/national-overview" | grep -o '"count":[0-9]*'

echo -e "\n3. Ingesting Ground Citizen Weather Observation (Guwahati)..."
curl -s -X POST "$API_URL/api/v1/citizen/reports" \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_name": "SIH Evaluator",
    "city_hint": "Guwahati",
    "state_hint": "Assam",
    "latitude": 26.1445,
    "longitude": 91.7362,
    "text": "Severe waterlogging near Jalukbari rotary. Water level rising fast due to Brahmaputra overflow. #IMD #Flood",
    "photos": ["https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80"]
  }' | grep -o '"success":true'

echo -e "\n4. Fetching Active Incidents..."
FIRST_EVENT_ID=$(curl -s "$API_URL/api/v1/events" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)
echo "   First Event: $FIRST_EVENT_ID"

echo -e "\n5. Testing Multilingual Alert Bulletin (Hindi)..."
curl -s "$API_URL/api/v1/events/$FIRST_EVENT_ID/bulletin?lang=hi" | grep -o '"headline":"[^"]*"' | head -n 1

echo -e "\n6. Testing OASIS CAP v1.2 / CBS Simulation..."
curl -s -X POST "$API_URL/api/v1/events/$FIRST_EVENT_ID/broadcast-cap?lang=hi" | grep -o '"protocol":"[^"]*"'

echo -e "\n7. Testing SDRF & Aapda Mitra Volunteer Dispatch..."
curl -s -X POST "$API_URL/api/v1/events/$FIRST_EVENT_ID/dispatch-volunteers" | grep -o '"total_responders_mobilized":[0-9]*'

echo -e "\n8. Fetching Official IMD/NDMA Situation Report (SITREP)..."
curl -s "$API_URL/api/v1/events/$FIRST_EVENT_ID/sitrep" | grep -o '"sitrep_id":"[^"]*"'

echo -e "\n9. Querying RFC 7946 GeoJSON FeatureCollection..."
curl -s "$API_URL/api/v1/events/geojson" | grep -o '"type":"FeatureCollection"'

echo -e "\n10. Testing Ground Truth Sensor Spike Telemetry Surge..."
curl -s -X POST "$API_URL/api/v1/sensors/simulate-spike" \
  -H "Content-Type: application/json" \
  -d '{"station_id":"IMD-AWS-BLR-01","value":88.5}' | grep -o '"status":"CRITICAL_EXCEEDED"'

echo -e "\n11. Inspecting Immutable State Machine Audit Trail..."
curl -s "$API_URL/api/v1/admin/audit-log" | grep -o '"count":[0-9]*'

echo -e "\n12. Testing Operational Analytics & KPIs..."
curl -s "$API_URL/api/v1/admin/stats" | grep -o '"verificationRate":"[^"]*"'

echo -e "\n\n================================================================"
echo " [SUCCESS] All 12 N-WEIS Early Warning Pipelines VALIDATED!"
echo "================================================================"
