# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is the companion codebase for the DeepLearning.AI course: **"Claude Code: A Highly Agentic Coding Assistant"**
- Course URL: https://www.deeplearning.ai/short-courses/claude-code-a-highly-agentic-coding-assistant/
- This serves as a practical example of building RAG systems that integrate with AI coding assistants

## Development Commands

### Project Setup
- **Install dependencies**: `uv sync`
- **Create .env file**: Copy `.env.example` to `.env` and add `ANTHROPIC_API_KEY=your_key_here`
- **Always use uv to run any python code**
- **For any uv commands that sync, add, install or upgrade dependencies, prepend them with `UV_EXTRA_INDEX_URL= `**

### Running the Application
- **Quick start**: `./run.sh` (starts server on port 8000)
- **Manual start**: `cd backend && uv run uvicorn app:app --reload --port 8000`
- **Access points**: 
  - Web interface: http://localhost:8000
  - API docs: http://localhost:8000/docs

### Python Environment
- Uses `uv` package manager (not pip/conda)
- Python 3.13+ required
- No test framework currently configured

## Architecture Overview

This is a RAG (Retrieval-Augmented Generation) chatbot system with a modular backend architecture:

### Core Components
- **RAGSystem** (`rag_system.py`): Main orchestrator that coordinates all components
- **VectorStore** (`vector_store.py`): ChromaDB-based vector storage for course content and metadata
- **AIGenerator** (`ai_generator.py`): Anthropic Claude API integration with tool support
- **DocumentProcessor** (`document_processor.py`): Processes course documents into structured chunks
- **SessionManager** (`session_manager.py`): Manages conversation history and sessions
- **ToolManager** (`search_tools.py`): Handles AI tool-based search functionality

### Data Models
All models defined in `models.py`:
- **Course**: Contains course metadata, lessons, and instructor info
- **Lesson**: Individual lessons with titles and links
- **CourseChunk**: Text chunks for vector storage with course/lesson context

### API Structure
- **FastAPI** backend in `backend/app.py` with CORS enabled
- **Frontend**: Static HTML/CSS/JS served from `/frontend/`
- **Main endpoints**: `/api/query` (chat), `/api/courses` (stats)

### Key Configuration
- **Config class** (`config.py`): Centralizes all settings including API keys, chunk sizes, and model parameters
- **Environment**: Uses `.env` file for sensitive data like `ANTHROPIC_API_KEY`
- **Model**: Currently uses `claude-sonnet-4-20250514`

### Document Processing Flow
1. Documents from `/docs/` folder are processed on startup
2. Content is chunked (800 chars, 100 overlap) and embedded
3. Vector storage includes both course metadata and content chunks
4. AI uses tool-based search to retrieve relevant content

### Session Management
- Conversation history maintained per session ID
- Limited to 2 previous exchanges (configurable in `config.py`)
- Sessions created automatically if not provided

## Query Flow Architecture

### User Query Processing Flow
1. **Frontend** (`script.js`): User input → POST `/api/query` with session tracking
2. **FastAPI** (`app.py`): Route handling → RAG system delegation  
3. **RAGSystem** (`rag_system.py`): Orchestrates components, manages conversation history
4. **AIGenerator** (`ai_generator.py`): Claude API integration with tool definitions
5. **Tool Decision**: Claude automatically decides whether to search based on query type
6. **CourseSearchTool** (`search_tools.py`): Semantic search execution if needed
7. **VectorStore** (`vector_store.py`): ChromaDB similarity search with filtering
8. **Response Path**: Results → AI synthesis → Session storage → Frontend display

![Query Flow Diagram](query-flow-diagram.png)

The key architectural insight: **Intelligent tool usage** - Claude decides when to search course content vs. using general knowledge, demonstrating how AI assistants can make smart decisions about tool usage.

## Important Notes
- No existing test suite - add tests when implementing new features  
- Uses ChromaDB for persistence (stored in `./chroma_db/`)
- Course content loaded from `/docs/` on application startup
- All components follow dependency injection pattern through the config object