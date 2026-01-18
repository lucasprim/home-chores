#!/bin/bash

# Watch GitHub Actions build and deploy on success
# Usage: ./scripts/watch-and-deploy.sh [run-id]
#
# If no run-id is provided, watches the most recent run for the current branch.

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables from .env.local or .env
if [ -f "$PROJECT_DIR/.env.local" ]; then
    set -a
    source "$PROJECT_DIR/.env.local"
    set +a
elif [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: gh CLI is not installed${NC}"
    echo "Install it with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Get run ID
RUN_ID="$1"

if [ -z "$RUN_ID" ]; then
    BRANCH=$(git branch --show-current)
    echo -e "${BLUE}Finding most recent workflow run for branch: ${YELLOW}$BRANCH${NC}"

    RUN_ID=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null)

    if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
        echo -e "${RED}No workflow runs found for branch: $BRANCH${NC}"
        echo ""
        echo "Recent runs across all branches:"
        gh run list --limit 5
        exit 1
    fi
fi

echo -e "${BLUE}Watching workflow run: ${YELLOW}$RUN_ID${NC}"
echo ""

# Show run info (disable pager)
GH_PAGER="" gh run view "$RUN_ID"
echo ""

# Watch the run
echo -e "${BLUE}Waiting for workflow to complete...${NC}"
echo "(Press Ctrl+C to stop watching - this won't cancel the workflow)"
echo ""

if gh run watch "$RUN_ID" --exit-status; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Build succeeded! Starting deploy...${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    # Run the redeploy script
    if [ -f "$SCRIPT_DIR/redeploy.ts" ]; then
        npx tsx "$SCRIPT_DIR/redeploy.ts"
    else
        echo -e "${RED}Error: redeploy.ts not found${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Build failed! Deploy skipped.${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "View the failed run:"
    echo "  gh run view $RUN_ID --log-failed"
    exit 1
fi
