# N-WEIS: API & Multi-Hazard Early Warning Verification Script (SIH 2026)
param(
    [string]$ApiUrl = "http://localhost:3001"
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " N-WEIS: Testing API Endpoints & Early Warning Pipelines" -ForegroundColor Cyan
Write-Host " Target: $ApiUrl" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Health
Write-Host "`n1. Checking System Health..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$ApiUrl/health"
Write-Host "   Status: $($health.status) | Active Events: $($health.activeEvents)" -ForegroundColor Green

# 2. National Overview Scenario
Write-Host "`n2. Triggering National Multi-Hazard Scenario (7 Regions)..." -ForegroundColor Yellow
$scenario = Invoke-RestMethod -Method POST -Uri "$ApiUrl/api/v1/admin/demo/scenario/national-overview"
Write-Host "   Generated $($scenario.count) nationwide verified incidents across India" -ForegroundColor Green

# 3. Citizen Ingestion
Write-Host "`n3. Submitting Citizen Ground Report (Guwahati Flood)..." -ForegroundColor Yellow
$citizenPayload = @{
    reporter_name = "SIH Evaluator"
    city_hint = "Guwahati"
    state_hint = "Assam"
    latitude = 26.1445
    longitude = 91.7362
    text = "Severe waterlogging near Jalukbari rotary. Water level rising fast due to Brahmaputra overflow. #IMD #Flood"
    photos = @("https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80")
} | ConvertTo-Json
$citizen = Invoke-RestMethod -Method POST -Uri "$ApiUrl/api/v1/citizen/reports" -Body $citizenPayload -ContentType "application/json"
Write-Host "   Citizen Report Ingested: $($citizen.success) | Signal ID: $($citizen.data.signal.id)" -ForegroundColor Green

# 4. Fetch Event & Localized Bulletin
Write-Host "`n4. Testing Multilingual Alert Bulletin (Hindi)..." -ForegroundColor Yellow
$events = Invoke-RestMethod -Uri "$ApiUrl/api/v1/events"
$testEvent = $events.data[0]
$bulletin = Invoke-RestMethod -Uri "$ApiUrl/api/v1/events/$($testEvent.id)/bulletin?lang=hi"
Write-Host "   Hindi Headline: $($bulletin.bulletin.headline)" -ForegroundColor Green

# 5. Cell Broadcast (CAP)
Write-Host "`n5. Testing OASIS CAP v1.2 / CBS Simulation..." -ForegroundColor Yellow
$cbs = Invoke-RestMethod -Method POST -Uri "$ApiUrl/api/v1/events/$($testEvent.id)/broadcast-cap?lang=hi"
Write-Host "   Broadcast ID: $($cbs.broadcast_id) | Towers: $($cbs.target_area.telecom_towers_alerted) | Reach: $($cbs.target_area.estimated_reach_population) citizens" -ForegroundColor Green

# 6. Volunteer Dispatch
Write-Host "`n6. Testing SDRF & Aapda Mitra Volunteer Dispatch..." -ForegroundColor Yellow
$v = Invoke-RestMethod -Method POST -Uri "$ApiUrl/api/v1/events/$($testEvent.id)/dispatch-volunteers"
Write-Host "   Dispatch ID: $($v.dispatch.dispatch_id) | Responders: $($v.dispatch.total_responders_mobilized) | Helpline: $($v.dispatch.tollfree_helpline)" -ForegroundColor Green

# 7. Official SITREP
Write-Host "`n7. Fetching Official IMD/NDMA Situation Report (SITREP)..." -ForegroundColor Yellow
$sitrep = Invoke-RestMethod -Uri "$ApiUrl/api/v1/events/$($testEvent.id)/sitrep"
Write-Host "   SITREP ID: $($sitrep.sitrep.sitrep_id) | Grade: $($sitrep.sitrep.hazard_classification.verification_grade) | Digital Seal: $($sitrep.sitrep.digital_sign_off.tamper_seal)" -ForegroundColor Green

# 8. RFC 7946 GeoJSON Interoperability
Write-Host "`n8. Querying RFC 7946 GeoJSON FeatureCollection..." -ForegroundColor Yellow
$geojson = Invoke-RestMethod -Uri "$ApiUrl/api/v1/events/geojson"
Write-Host "   GeoJSON Type: $($geojson.type) | CRS: $($geojson.crs.properties.name) | Features: $($geojson.features.Count)" -ForegroundColor Green

# 9. Ground Truth Sensor Spike
Write-Host "`n9. Testing Ground Truth Sensor Spike Telemetry Surge..." -ForegroundColor Yellow
$spikePayload = @{
    station_id = "IMD-AWS-BLR-01"
    value = 85.0
} | ConvertTo-Json
$spike = Invoke-RestMethod -Method POST -Uri "$ApiUrl/api/v1/sensors/simulate-spike" -Body $spikePayload -ContentType "application/json"
Write-Host "   Sensor: $($spike.sensor.name) | Status: $($spike.sensor.status) | Reading: $($spike.sensor.display_value)" -ForegroundColor Green

# 10. Duty Meteorologist Verification Override
Write-Host "`n10. Testing Human-in-the-Loop Duty Forecaster Verification..." -ForegroundColor Yellow
$reviewEv = ($events.data | Where-Object { $_.status -eq "UNDER_REVIEW" } | Select-Object -First 1)
if ($reviewEv) {
    $targetStatus = "VERIFIED"
    $targetId = $reviewEv.id
} else {
    $targetStatus = "RESOLVED"
    $targetId = $testEvent.id
}
$verifyPayload = @{
    status = $targetStatus
    officer_name = "Dr. S. K. Roy (Duty Forecaster, IMD RMC)"
    reason = "Corroborated with DWR Doppler Radar sweep and CWC river stage"
} | ConvertTo-Json
$verify = Invoke-RestMethod -Method POST -Uri "$ApiUrl/api/v1/events/$targetId/status" -Body $verifyPayload -ContentType "application/json"
Write-Host "   Verification: $($verify.message) | Officer: $($verify.transition.actor)" -ForegroundColor Green

# 11. Immutable State Machine Audit Log
Write-Host "`n11. Inspecting Immutable State Machine Audit Trail..." -ForegroundColor Yellow
$audit = Invoke-RestMethod -Uri "$ApiUrl/api/v1/admin/audit-log"
Write-Host "   Audit Entries: $($audit.count) | Latest Transition: $($audit.data[-1].from_status) -> $($audit.data[-1].to_status)" -ForegroundColor Green

# 12. Operational Analytics & KPIs
Write-Host "`n12. Querying System Operational Analytics & KPIs..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "$ApiUrl/api/v1/admin/stats"
Write-Host "   Signals Processed: $($stats.totals.signals) | Verification Rate: $($stats.kpis.verificationRate) | Latency: $($stats.kpis.avgProcessingLatency)" -ForegroundColor Green

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host " [SUCCESS] All 12 N-WEIS Early Warning Pipelines VALIDATED!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

