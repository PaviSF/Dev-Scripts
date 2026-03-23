#!/bin/bash

# Check if fzf is installed
if ! command -v fzf &> /dev/null; then
  echo "❌ fzf not found. Please install fzf first."
  exit 1
fi

# Get branch name from argument or ask with fzf
branch="$1"

if [ -z "$branch" ]; then
  echo "Select a branch to delete:"
  branch=$(git branch --format="%(refname:short)" | fzf)
  
  if [ -z "$branch" ]; then
    echo "❌ No branch selected. Exiting."
    exit 1
  fi
fi

# Confirm local deletion
read -p "Are you sure you want to delete local branch '$branch'? (y/n): " confirm_local
if [[ "$confirm_local" == "y" || "$confirm_local" == "Y" ]]; then
  git branch -d "$branch" 2>/dev/null || git branch -D "$branch"
  echo "✅ Local branch '$branch' deleted."
else
  echo "❌ Skipped deleting local branch."
fi

# Confirm remote deletion
read -p "Do you also want to delete the remote branch '$branch'? (y/n): " confirm_remote
if [[ "$confirm_remote" == "y" || "$confirm_remote" == "Y" ]]; then
  git push origin --delete "$branch"
  echo "✅ Remote branch '$branch' deleted."
else
  echo "❌ Skipped deleting remote branch."
fi
