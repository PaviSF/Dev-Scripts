#!/bin/bash

# Colors
GREEN="\033[1;32m"
BLUE="\033[1;34m"
YELLOW="\033[1;33m"
RESET="\033[0m"

# Determine changed files
if [ "$#" -eq 2 ]; then
    # Compare between two provided Git references
    changed_files=$(git diff --name-only "$1" "$2")
elif [ "$#" -eq 0 ]; then
    # Compare working directory changes
    changed_files=$(git status --porcelain | awk '{print $2}')
else
    echo "Usage: $0 [<commit1> <commit2>]"
    exit 1
fi

# Count files
count=$(echo "$changed_files" | grep -c '.*')

# Line-by-line output in green header
echo -e "${GREEN}Line-by-line output:${RESET}"
for file in $changed_files; do
    echo "$file"
done

echo ""
# Space-separated quoted output with blue header
echo -e "${BLUE}Space-separated in quotes:${RESET}"
for file in $changed_files; do
    printf "\"%s\" " "$file"
done
echo

# File count in yellow
echo -e "\n${YELLOW}Total changed files: $count${RESET}\n"
