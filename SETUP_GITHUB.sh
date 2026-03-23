#!/usr/bin/env bash
# ============================================================
# Telegram Bridge — One-click GitHub Setup Script
# Run this script ONCE from your local machine to:
#   1. Create the private GitHub repo
#   2. Push all code
#   3. Create the v1.0.0 release with the .vsix attached
# ============================================================

set -e

# ── Token handling: use GITHUB_TOKEN env var or prompt ───────
if [ -z "$GITHUB_TOKEN" ]; then
  echo -n "Enter your GitHub Personal Access Token: "
  read -s TOKEN
  echo ""
else
  TOKEN="$GITHUB_TOKEN"
fi

export TOKEN

REPO_NAME="telegram-bridge-vscode"
HEADERS=(-H "Authorization: token $TOKEN" -H "Content-Type: application/json" -H "Accept: application/vnd.github.v3+json")

echo ""
echo "✈️  Telegram Bridge — GitHub Setup"
echo "===================================="
echo ""

# ── Step 1: Get username ─────────────────────────────────────
echo "→ Fetching your GitHub username..."
USERNAME=$(curl -sf "${HEADERS[@]}" https://api.github.com/user | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")
echo "  ✓ Logged in as: @$USERNAME"

# ── Step 2: Create private repo ─────────────────────────────
echo ""
echo "→ Creating private repository '$REPO_NAME'..."
EXISTING=$(curl -s "${HEADERS[@]}" "https://api.github.com/repos/$USERNAME/$REPO_NAME" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('full_name',''))" 2>/dev/null || true)

if [ -n "$EXISTING" ]; then
  echo "  ⚠️  Repo already exists: $EXISTING — skipping creation"
else
  curl -sf "${HEADERS[@]}" https://api.github.com/user/repos \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"✈️ Connect VS Code to any Telegram bot seamlessly — just a Bot Token and Chat ID\",\"private\":true,\"has_issues\":true}" > /dev/null
  echo "  ✓ Repository created: https://github.com/$USERNAME/$REPO_NAME"
fi

# ── Step 3: Push code ────────────────────────────────────────
echo ""
echo "→ Pushing code to GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://${TOKEN}@github.com/${USERNAME}/${REPO_NAME}.git"
git push -u origin main --force
echo "  ✓ Code pushed!"

# ── Step 4: Push tag ─────────────────────────────────────────
echo ""
echo "→ Creating release tag v1.0.0..."
git tag -f v1.0.0
git push origin v1.0.0 --force
echo "  ✓ Tag pushed!"

# ── Step 5: Create GitHub Release ────────────────────────────
echo ""
echo "→ Creating GitHub Release v1.0.0..."
RELEASE_BODY=$(cat CHANGELOG.md | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" | sed 's/^"//;s/"$//')

RELEASE_ID=$(curl -sf "${HEADERS[@]}" \
  "https://api.github.com/repos/$USERNAME/$REPO_NAME/releases" \
  -d "{
    \"tag_name\": \"v1.0.0\",
    \"name\": \"✈️ Telegram Bridge v1.0.0 — Initial Release\",
    \"body\": \"Connect VS Code to any Telegram bot in seconds!\\n\\n## What's Included\\n- Send messages, code, and files to Telegram\\n- Build/debug/save notifications\\n- Beautiful in-editor config panel\\n- Activity bar with logs and quick actions\\n\\nSee CHANGELOG.md for full details.\",
    \"draft\": false,
    \"prerelease\": false
  }" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "  ✓ Release created (id: $RELEASE_ID)"

# ── Step 6: Upload .vsix asset ───────────────────────────────
VSIX_FILE=$(ls *.vsix 2>/dev/null | head -1)
if [ -n "$VSIX_FILE" ]; then
  echo ""
  echo "→ Uploading $VSIX_FILE to release..."
  curl -sf \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/octet-stream" \
    "https://uploads.github.com/repos/$USERNAME/$REPO_NAME/releases/$RELEASE_ID/assets?name=$VSIX_FILE" \
    --data-binary "@$VSIX_FILE" > /dev/null
  echo "  ✓ .vsix uploaded!"
fi

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "🎉 ALL DONE!"
echo ""
echo "  📁 Repository  : https://github.com/$USERNAME/$REPO_NAME"
echo "  🚀 Release     : https://github.com/$USERNAME/$REPO_NAME/releases/tag/v1.0.0"
echo ""
echo "  Install locally:"
echo "  code --install-extension $VSIX_FILE"
echo "============================================"
echo ""