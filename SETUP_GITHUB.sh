#!/usr/bin/env bash
# ============================================================
# Telegram Bridge — One-click GitHub Setup (v2.0.0)
# Run once from your local machine to:
#   1. Get your GitHub username from the token
#   2. Create the private repo
#   3. Push all code + tags
#   4. Create the v2.0.0 release with .vsix attached
# ============================================================
set -euo pipefail

TOKEN="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"
REPO="telegram-bridge-vscode"
API="https://api.github.com"

echo ""
echo "  ✈️  Telegram Bridge — GitHub Setup"
echo "  ===================================="
echo ""

# Step 1: Get username
echo "  Authenticating..."
USERNAME=$(curl -sf \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "$API/user" | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")
echo "  OK: signed in as @$USERNAME"

# Step 2: Create repo
echo "  Creating repository..."
EXISTING=$(curl -s \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "$API/repos/$USERNAME/$REPO" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('full_name',''))" 2>/dev/null || true)

if [ -n "$EXISTING" ]; then
  echo "  OK: repo already exists ($EXISTING)"
else
  curl -sf \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    "$API/user/repos" \
    -d "{\"name\":\"$REPO\",\"description\":\"Connect VS Code to any Telegram bot\",\"private\":true,\"has_issues\":true}" > /dev/null
  echo "  OK: https://github.com/$USERNAME/$REPO"
fi

# Step 3: Push code
echo "  Pushing code..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://${TOKEN}@github.com/${USERNAME}/${REPO}.git"
git push -u origin main --force
echo "  OK: code pushed"

# Step 4: Tag
echo "  Tagging v2.0.0..."
git tag -f v2.0.0
git push origin v2.0.0 --force
echo "  OK: tag pushed"

# Step 5: Create release
echo "  Creating GitHub Release..."
RELEASE_ID=$(curl -sf \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  "$API/repos/$USERNAME/$REPO/releases" \
  -d "{\"tag_name\":\"v2.0.0\",\"name\":\"Telegram Bridge v2.0.0\",\"body\":\"Full-featured Telegram integration for VS Code. See CHANGELOG.md for details.\",\"draft\":false,\"prerelease\":false}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  OK: release created (id: $RELEASE_ID)"

# Step 6: Upload vsix
VSIX=$(ls telegram-bridge-*.vsix 2>/dev/null | sort -V | tail -1 || true)
if [ -n "$VSIX" ]; then
  echo "  Uploading $VSIX..."
  curl -sf \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/octet-stream" \
    "https://uploads.github.com/repos/$USERNAME/$REPO/releases/$RELEASE_ID/assets?name=$VSIX" \
    --data-binary "@$VSIX" > /dev/null
  echo "  OK: $VSIX uploaded"
else
  echo "  WARN: no .vsix found, run: npm run package"
fi

echo ""
echo "  ============================================"
echo "  DONE!"
echo "  Repo:    https://github.com/$USERNAME/$REPO"
echo "  Release: https://github.com/$USERNAME/$REPO/releases/tag/v2.0.0"
if [ -n "${VSIX:-}" ]; then
  echo "  Install: code --install-extension $VSIX"
fi
echo "  ============================================"
echo ""
