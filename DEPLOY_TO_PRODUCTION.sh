#!/bin/bash

# JECRC No Dues System - Deploy to Production
# This script deploys your local fixes to Vercel production

echo "🚀 JECRC No Dues System - Production Deployment"
echo "================================================"
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"
echo ""

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes!"
    echo ""
    git status -s
    echo ""
    read -p "❓ Do you want to commit these changes? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "💾 Committing changes..."
        git add .
        read -p "📝 Enter commit message (or press Enter for default): " COMMIT_MSG
        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="Fix: Session year validation and production deployment"
        fi
        git commit -m "$COMMIT_MSG"
        echo "✅ Changes committed!"
    else
        echo "❌ Deployment cancelled. Please commit or stash your changes first."
        exit 1
    fi
    echo ""
fi

# Switch to render branch
echo "🔄 Switching to 'render' branch (production branch)..."
git checkout render
if [ $? -ne 0 ]; then
    echo "❌ Failed to switch to render branch!"
    echo "💡 Make sure the 'render' branch exists."
    exit 1
fi
echo "✅ Switched to render branch"
echo ""

# Merge from AWS branch
echo "🔀 Merging changes from '$CURRENT_BRANCH' branch..."
git merge $CURRENT_BRANCH -m "Merge fixes from $CURRENT_BRANCH to production"
if [ $? -ne 0 ]; then
    echo "❌ Merge failed! You may have conflicts to resolve."
    echo "💡 Resolve conflicts, then run: git merge --continue"
    exit 1
fi
echo "✅ Merge successful"
echo ""

# Push to GitHub (triggers Vercel deployment)
echo "📤 Pushing to GitHub..."
git push origin render
if [ $? -ne 0 ]; then
    echo "❌ Push failed!"
    echo "💡 Check your network connection and GitHub credentials."
    exit 1
fi
echo "✅ Pushed to GitHub"
echo ""

# Switch back to original branch
echo "🔙 Switching back to '$CURRENT_BRANCH' branch..."
git checkout $CURRENT_BRANCH
echo "✅ Back on $CURRENT_BRANCH branch"
echo ""

echo "================================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "================================================"
echo ""
echo "🎉 Your fixes are now being deployed to Vercel!"
echo ""
echo "📊 Next steps:"
echo "   1. Check Vercel dashboard for build status"
echo "   2. Wait 2-3 minutes for build to complete"
echo "   3. Test production site: https://no-duessystem.vercel.app"
echo "   4. Verify:"
echo "      - Session year fields (empty should work)"
echo "      - College email validation"
echo "      - Cascading dropdowns"
echo ""
echo "🔍 Vercel Dashboard: https://vercel.com/dashboard"
echo ""