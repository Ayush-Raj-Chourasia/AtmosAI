#!/bin/bash

# API Base URL
API_URL="http://localhost:3001"

echo "1. Sending Test Notification (Generic)..."
curl -X POST "$API_URL/admin/demo/test-notification" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🔔 System Test",
    "body": "This is a test notification verifying the push system is operational.",
    "eventType": "system"
  }'

echo -e "\n\n2. Sending Incident Alert (Simulated Earthquake)..."
curl -X POST "$API_URL/admin/demo/test-incident-alert" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "earthquake",
    "severity": "high",
    "city": "Jakarta Selatan"
  }'

echo -e "\n\n✅ Done! Check your device/PWA."
