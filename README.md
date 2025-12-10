# laboRARE Engine

fastapi + next.js rag engine combining mistral's ocr with natural language q&a for pdf documents.

## Architecture

```
laboRARE-engine/
├── backend/                      # fastapi api server
│   ├── main.py                  # rest endpoints
│   ├── schemas.py               # pydantic models
│   └── services/
│       └── mistral_service.py   # mistral api client
├── frontend/                     # next.js web app
│   ├── app/                     # app router pages
│   ├── components/              # react components
│   └── lib/                     # utilities & state
└── run_server.py                # server launcher
```

**backend** - fastapi server handling document upload, ocr processing, and q&a via mistral api

**frontend** - next.js chat interface for document interaction

## Setup

**1. install dependencies**

```bash
# backend
pip install -r requirements.txt

# frontend
cd frontend
npm install
```

**2. configure environment**

rename `.env.sample` to `.env` and add your mistral api key:

```env
MISTRAL_API_KEY=your_actual_api_key_here
```

## Running

**backend**

```bash
python run_server.py
```
- server: `http://localhost:8000`
- api docs: `http://localhost:8000/docs`

**frontend**

```bash
cd frontend
npm run dev
```
- app: `http://localhost:3000`

## Features

- pdf upload (max 50mb, 1000 pages)
- ocr extraction with markdown output
- conversational q&a with history
- streaming responses
- document management