#!/bin/bash
# Test device register API (same request as Roku).
# Usage: ./scripts/test-register-api.sh [CODE]
# Example: ./scripts/test-register-api.sh 10012

CODE="${1:-10012}"
URL="${NEXT_PUBLIC_APP_URL:-https://menuslide.com}/api/device/register"

echo "POST $URL"
echo "Body: {\"displayCode\":\"$CODE\",\"deviceId\":\"test-device-123\",\"deviceModel\":\"Roku\"}"
echo "---"
curl -s -w "\nHTTP %{http_code}\n" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{\"displayCode\":\"$CODE\",\"deviceId\":\"test-device-123\",\"deviceModel\":\"Roku\"}"
echo ""
