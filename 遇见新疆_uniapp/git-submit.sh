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

TEMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t xjtravelapp-publish)"
cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "Preparing snapshot repository..."
git -C "$TEMP_DIR" init --initial-branch "$TARGET_BRANCH" >/dev/null
git -C "$TEMP_DIR" remote add origin "$REMOTE_URL"

if git -C "$TEMP_DIR" fetch origin "$TARGET_BRANCH" --depth=1 >/dev/null 2>&1; then
  git -C "$TEMP_DIR" checkout -B "$TARGET_BRANCH" "origin/$TARGET_BRANCH" >/dev/null
else
  echo "Remote branch $TARGET_BRANCH does not exist yet. A new branch will be created."
fi

find "$TEMP_DIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$SCRIPT_DIR"/. "$TEMP_DIR"/

git -C "$TEMP_DIR" add -A
if git -C "$TEMP_DIR" diff --cached --quiet; then
  echo "Remote snapshot is already up to date."
  exit 0
fi

git -C "$TEMP_DIR" commit -m "$COMMIT_MSG"

echo "Pushing to $REMOTE_URL ($TARGET_BRANCH)..."
git -C "$TEMP_DIR" push origin "HEAD:refs/heads/$TARGET_BRANCH"

echo "Done."
