# Course Materials RAG System

A Retrieval-Augmented Generation (RAG) system designed to answer questions about course materials using semantic search and AI-powered responses.

## Overview

This application is a full-stack web application that enables users to query course materials and receive intelligent, context-aware responses. It uses ChromaDB for vector storage, Claude AI for response generation, and provides a web interface for interaction.

## AI Provider Options

This application supports two ways to access Claude AI:

- **Direct Anthropic API** - Use your Anthropic API key directly
- **AWS Bedrock** - Use Claude through AWS Bedrock (recommended for AWS users)

## Prerequisites

- Python 3.13 or higher
- uv (Python package manager)
- **Either:**
  - An Anthropic API key, **OR**
  - AWS credentials configured (for Bedrock access)
- **For Windows**: Use Git Bash to run the application commands - [Download Git for Windows](https://git-scm.com/downloads/win)

## Installation

1. **Install uv** (if not already installed)
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Install Python dependencies**
   ```bash
   uv sync
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory with one of the following configurations:

   **Option A: Direct Anthropic API (Default)**
   ```bash
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

   **Option B: AWS Bedrock (Recommended)**
   ```bash
   AI_PROVIDER=bedrock
   # AWS credentials will be auto-detected from your AWS profile/environment
   ```

   **Advanced Bedrock Configuration (Optional)**
   ```bash
   AI_PROVIDER=bedrock
   AWS_REGION=us-east-1           # Default: us-east-1
   AWS_PROFILE=your-profile-name  # Optional: use specific AWS profile
   BEDROCK_MODEL=sonnet-4         # Default: sonnet-4 (Claude Sonnet 4)
   ```

   **Available Bedrock Models:**
   - `sonnet-4` - Claude Sonnet 4 (recommended)
   - `opus-4.1` - Claude Opus 4.1 (most capable)
   - `haiku-3.5` - Claude Haiku 3.5 (fastest)

## Running the Application

### Quick Start

Use the provided shell script:
```bash
chmod +x run.sh
./run.sh
```

### Manual Start

**From project root (recommended):**
```bash
uv run uvicorn backend.app:app --reload --port 8000
```

**Legacy method (from backend directory):**
```bash
cd backend
uv run uvicorn app:app --reload --port 8000
```

The application will be available at:
- Web Interface: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

## AWS Bedrock Setup

If you're using AWS Bedrock, ensure your AWS credentials are configured:

```bash
# Option 1: Use AWS Profile (recommended)
aws configure --profile your-profile-name

# Option 2: Use environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1

# Option 3: Use default AWS credentials
aws configure
```

The application will automatically detect your AWS credentials and connect to Bedrock.

