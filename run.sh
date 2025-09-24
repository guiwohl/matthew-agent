#!/usr/bin/env bash

# Minimal: start the local Google ADK API so index.html can talk to it.

set -euo pipefail

# Entering Virtual Env
source .venv/bin/activate

# If your agents live in ./agents (with agents/mateus_rag/__init__.py exporting root_agent), this works:
cd "$(dirname "$0")/agents"

# Allow calls from your file:// index.html
exec adk api_server --allow_origins="*" .
