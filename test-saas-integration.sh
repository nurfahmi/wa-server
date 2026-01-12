#!/bin/bash

# Quick test script to verify the SaaS integration

echo "🔍 Testing SaaS Integration..."
echo ""

# Test 1: Check if membership hub is running
echo "1️⃣ Checking if membership hub is running on port 5001..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5001 | grep -q "200\|302\|404"; then
    echo "   ✅ Membership hub is running"
else
    echo "   ❌ Membership hub is NOT running on port 5001"
    echo "   Please start the membership hub first!"
    exit 1
fi

echo ""

# Test 2: Check if this app is running
echo "2️⃣ Checking if this app is running on port 3000..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302\|404"; then
    echo "   ✅ This app is running"
else
    echo "   ❌ This app is NOT running on port 3000"
    echo "   Please run: npm run dev"
    exit 1
fi

echo ""

# Test 3: Check environment variables
echo "3️⃣ Checking environment variables..."
if [ -f .env ]; then
    echo "   ✅ .env file exists"
    
    if grep -q "MEMBERSHIP_HUB_URL=http://localhost:5001" .env; then
        echo "   ✅ MEMBERSHIP_HUB_URL is correct"
    else
        echo "   ⚠️  MEMBERSHIP_HUB_URL might be incorrect"
    fi
    
    if grep -q "MEMBERSHIP_SERVICE_ID=1" .env; then
        echo "   ✅ MEMBERSHIP_SERVICE_ID is set to 1"
    else
        echo "   ⚠️  MEMBERSHIP_SERVICE_ID might be incorrect"
    fi
    
    if grep -q "MEMBERSHIP_API_KEY=sk_" .env; then
        echo "   ✅ MEMBERSHIP_API_KEY is set"
    else
        echo "   ❌ MEMBERSHIP_API_KEY is missing"
    fi
else
    echo "   ❌ .env file not found"
fi

echo ""
echo "4️⃣ Next steps:"
echo "   1. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)"
echo "   2. Open browser console (F12)"
echo "   3. Run: localStorage.clear(); location.reload();"
echo "   4. Click 'Sign in with Membership Hub'"
echo "   5. Watch the console for [AUTH-CALLBACK] logs"
echo ""
echo "📋 Expected console logs:"
echo "   [AUTH-CALLBACK] Starting authentication callback..."
echo "   [AUTH-CALLBACK] Token present: true"
echo "   [AUTH-CALLBACK] Exchanging token with backend..."
echo "   [AUTH-CALLBACK] Exchange successful!"
echo ""
echo "🔧 If you see errors, check the backend terminal for [OAUTH] logs"
