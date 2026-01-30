#!/bin/bash
# Trigger certificate generation for 22BCOM1367
# Run: bash scripts/trigger-certificate.sh
# Or manually call the API endpoint

FORM_ID="9efc323a-0431-4d52-8744-0c7935917f36"

echo "Triggering certificate generation for form: $FORM_ID"

curl -X POST "https://your-domain.vercel.app/api/certificate/generate" \
  -H "Content-Type: application/json" \
  -d "{\"formId\": \"$FORM_ID\"}"

echo ""
echo "If using locally, use: http://localhost:3000/api/certificate/generate"
