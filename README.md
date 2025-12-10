# laboRARE Engine

a fastapi + next.js rag engine that combines mistral's ocr capabilities with natural language q&a for pdf documents.

## Architecture

```
laboRARE-engine/
├── backend/              # fastapi backend
│   ├── main.py          # api endpoints
│   ├── schemas.py       # pydantic models
│   └── services/
│       └── mistral_service.py  # mistral api integration
├── frontend/            # next.js frontend
│   ├── app/            # next.js app router
│   ├── components/     # react components
│   └── lib/            # utilities and stores
└── run_server.py       # backend entry point
```

**backend**: fastapi server that handles document upload, ocr processing, and q&a queries using mistral api.

**frontend**: next.js application with chat interface for document interaction.

## Setup

1. **install dependencies**

backend:
```bash
pip install -r requirements.txt
```

frontend:
```bash
cd frontend
npm install
```

2. **environment variables**

create `.env` in project root:
```env
MISTRAL_API_KEY=your_mistral_api_key_here
```

## How to run

### backend

```bash
python run_server.py
```

server runs at `http://localhost:8000`

api docs: `http://localhost:8000/docs`

### frontend

```bash
cd frontend
npm run dev
```

app runs at `http://localhost:3000`

## Features

- upload pdf documents (max 50mb, 1000 pages)
- ocr extraction with markdown output
- natural language q&a with conversation history
- streaming responses
- document management (list, delete)