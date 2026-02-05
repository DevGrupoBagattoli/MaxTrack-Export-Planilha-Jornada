#!/bin/bash

# Test script for MaxTrack Export API

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🧪 Testing MaxTrack Export API"
echo "================================"
echo ""

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✅ Health check passed: $HEALTH"
else
    echo "❌ Health check failed: $HEALTH"
    exit 1
fi
echo ""

# Test 2: Missing credentials
echo "2️⃣  Testing validation (missing credentials)..."
VALIDATION=$(curl -s "$BASE_URL/api/journey-export")
if echo "$VALIDATION" | grep -q '"error":"Email and password are required"'; then
    echo "✅ Validation passed: $VALIDATION"
else
    echo "❌ Validation failed: $VALIDATION"
    exit 1
fi
echo ""

# Test 3: Invalid credentials
echo "3️⃣  Testing authentication (invalid credentials)..."
AUTH=$(curl -s "$BASE_URL/api/journey-export" \
    -H "email: wrong@email.com" \
    -H "password: wrong")
if echo "$AUTH" | grep -q '"error":"Authentication failed'; then
    echo "✅ Authentication error handled: Rejected invalid credentials"
else
    echo "❌ Authentication test failed: $AUTH"
fi
echo ""

# Test 4: 404 handling
echo "4️⃣  Testing 404 handling..."
NOT_FOUND=$(curl -s "$BASE_URL/notfound")
if echo "$NOT_FOUND" | grep -q '"error":"Not found"'; then
    echo "✅ 404 handling passed: $NOT_FOUND"
else
    echo "❌ 404 handling failed: $NOT_FOUND"
    exit 1
fi
echo ""

# Test 5: Real request (optional - requires valid credentials)
if [ ! -z "$TEST_EMAIL" ] && [ ! -z "$TEST_PASSWORD" ]; then
    echo "5️⃣  Testing real API request..."
    RESULT=$(curl -s "$BASE_URL/api/journey-export" \
        -H "email: $TEST_EMAIL" \
        -H "password: $TEST_PASSWORD")
    
    if echo "$RESULT" | grep -q '"success":true'; then
        URL=$(echo "$RESULT" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
        echo "✅ Real request succeeded!"
        echo "   Process ID: $(echo "$RESULT" | grep -o '"processId":[0-9]*' | cut -d':' -f2)"
        echo "   URL: ${URL:0:80}..."
    else
        echo "⚠️  Real request failed (this may be expected): $RESULT"
    fi
    echo ""
fi

echo "================================"
echo "✅ All basic tests passed!"
echo ""
echo "To test with real credentials:"
echo "  TEST_EMAIL='your@email.com' TEST_PASSWORD='yourpass' ./test.sh"
