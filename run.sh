#!/bin/bash

# Create necessary directories
mkdir -p docs 

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "Error: backend directory not found"
    exit 1
fi

echo "Starting Course Materials RAG System..."
echo "Make sure you have configured your AI provider in .env (ANTHROPIC_API_KEY or AI_PROVIDER=bedrock)"

# Start the server from project root
uv run uvicorn backend.app:app --reload --port 8000