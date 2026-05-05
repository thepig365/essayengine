#!/bin/zsh

cd "$(dirname "$0")" || exit 1
npm run engine-ui

echo
echo "Essay Engine UI has stopped. You can close this window."
read -r "?Press Return to close..."
