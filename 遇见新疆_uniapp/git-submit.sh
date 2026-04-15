#!/usr/bin/env bash

set -euo pipefail

REMOTE_URL="${REMOTE_URL:-https://github.com/someh7162-ui/XjtravelApp.git}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: current folder is not inside a git repository."
  exit 1
fi

REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
REL_PATH="$(git -C "$SCRIPT_DIR" rev-parse --show-prefix)"
REL_PATH="${REL_PATH%/}"

if [ -z "$REL_PATH" ]; then
  echo "Error: this script is meant to run from the XjtravelApp project subfolder."
  exit 1
fi

COMMIT_MSG="${*:-chore: update XjtravelApp $(date '+%Y-%m-%d %H:%M:%S')}"

STAGED_OUTSIDE=0
while IFS= read -r file; do
  [ -z "$file" ] && continue
  case "$file" in
    "$REL_PATH"|"$REL_PATH"/*) ;;
    *)
      STAGED_OUTSIDE=1
      echo "Error: there are already staged changes outside $REL_PATH"
      echo " - $file"
      ;;
  esac
done < <(git -C "$REPO_ROOT" diff --cached --name-only)

if [ "$STAGED_OUTSIDE" -eq 1 ]; then
  echo "Please commit or unstage those files first, then run this script again."
  exit 1
fi

if [ -z "$(git -C "$REPO_ROOT" status --short -- "$REL_PATH")" ]; then
  echo "No changes found in $REL_PATH"
  exit 0
fi

echo "Staging project files: $REL_PATH"
git -C "$REPO_ROOT" add -- "$REL_PATH"

if git -C "$REPO_ROOT" diff --cached --quiet -- "$REL_PATH"; then
  echo "No committable changes found in $REL_PATH"
  exit 0
fi

echo "Creating commit in parent repository..."
git -C "$REPO_ROOT" commit -m "$COMMIT_MSG"

echo "Building subtree split for $REL_PATH..."
SPLIT_SHA="$(git -C "$REPO_ROOT" subtree split --prefix="$REL_PATH")"

echo "Pushing to $REMOTE_URL ($TARGET_BRANCH)..."
git -C "$REPO_ROOT" push "$REMOTE_URL" "$SPLIT_SHA:refs/heads/$TARGET_BRANCH"

echo "Done."
