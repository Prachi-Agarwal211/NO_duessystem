#!/bin/bash

# 🚀 JECRC No Dues System - Quick Deploy Script
# This script deploys all code fixes to production

echo "======================================"
echo "🚀 JECRC No Dues System Deployment"
echo "======================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository"
    echo "Please initialize git first: git init"
    exit 1
fi

# Check for uncommitted changes
echo "📋 Checking for changes..."
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "✅ Found changes to commit"
else
    echo "⚠️  No changes detected"
    echo "Files may already be committed"
fi

echo ""
echo "📁 Files to be deployed:"
echo "  - src/components/student/SubmitForm.jsx (session year fix)"
echo "  - src/app/api/student/route.js (validation fix)"
echo ""

# Confirm deployment
read -p "🚀 Ready to deploy? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "📦 Staging files..."
git add src/components/student/SubmitForm.jsx
git add src/app/api/student/route.js

echo "💬 Creating commit..."
git commit -m "Fix: Email validation and session year handling

- College email domain: jecrc.ac.in -> jecrcu.edu.in
- Session year validation: Handle empty strings as null
- Improved error messages and validation logic

Fixes:
- Email validation now accepts @jecrcu.edu.in
- Session years can be left empty (optional fields)
- Better null/empty string handling in both frontend and backend"

if [ $? -ne 0 ]; then
    echo "⚠️  Commit failed or no changes to commit"
    echo "Files may already be committed"
    echo ""
    echo "Checking current status..."
    git status
    echo ""
    read -p "Push anyway? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

echo ""
echo "🌐 Pushing to remote..."
echo "Detecting branch..."

# Get current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $BRANCH"

# Try to push
git push origin $BRANCH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📊 Next steps:"
    echo "1. Check Vercel dashboard: https://vercel.com/dashboard"
    echo "2. Wait for deployment to complete (2-5 minutes)"
    echo "3. Run database setup in Supabase (see COMPLETE_FIX_GUIDE.md)"
    echo "4. Test the production site: https://no-duessystem.vercel.app"
    echo ""
    echo "⚠️  IMPORTANT: Database setup is REQUIRED for dropdowns to work!"
    echo "   Run FINAL_COMPLETE_DATABASE_SETUP.sql in Supabase SQL Editor"
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "Common issues:"
    echo "1. Remote repository not configured"
    echo "   Fix: git remote add origin <your-repo-url>"
    echo ""
    echo "2. Branch not tracking remote"
    echo "   Fix: git push --set-upstream origin $BRANCH"
    echo ""
    echo "3. Authentication required"
    echo "   Fix: Configure git credentials"
    echo ""
    exit 1
fi