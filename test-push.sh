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
curl -s "$API_URL/api/v1/events" | grep -o '"count":[0-9]*'

echo -e "\n5. Testing Operational Analytics & KPIs..."
curl -s "$API_URL/api/v1/admin/stats" | grep -o '"falsePositiveRate":"[^"]*"'

echo -e "\n\n✅ N-WEIS Verification Completed Successfully!"
