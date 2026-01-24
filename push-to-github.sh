#!/bin/bash

# Authenticate with GitHub (run once)
gh auth login

# Create the repository and push
gh repo create lprvst --public --source=. --remote=origin --push

echo "✅ Repository created and pushed to GitHub!"
echo "View it at: https://github.com/$(gh api user -q .login)/lprvst"
