# Signal Clone

A functional, full-stack clone of the Signal messaging application built as a vertical slice demonstration. It supports instantaneous real-time WebSockets messaging, 1:1 and Group chats, and seamless database persistence.

## Architecture & Technology Stack

- **Frontend:** Next.js (React), TypeScript, Tailwind CSS, Zustand, Lucide React
- **Backend:** Python, FastAPI, WebSockets, SQLAlchemy, PyJWT
- **Database:** SQLite (Relational structure)

### Why this stack?
- **FastAPI** provides native asynchronous support and built-in WebSocket managers, making it far superior to Django Channels for rapid real-time messaging implementation without the need for external brokers like Redis.
- **SQLite** eliminates infrastructure friction, keeping the project highly portable while supporting full relational queries for complex joins (e.g. Conversation -> Members -> Users).
- **Zustand** allows for frictionless, highly-performant state management for the WebSocket connection and message list, avoiding React Context re-render penalties.

## Implemented Features (Slices 1-12)
- ✅ JWT Authentication (Registration & Login)
- ✅ Global User Search & Directory
- ✅ 1:1 Conversation Creation
- ✅ Full Realtime WebSocket Integration (Live messaging & broadcasting)
- ✅ Message Persistence & Historic Timeline Fetching
- ✅ Multi-user Group Creation & Administration
- ✅ Dynamic Sidebar UI & "Signal Blue" Design System
- ✅ Seed Data Generation

## Running Locally

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt

# Run the seed script to populate demo users and conversations
python scripts/seed.py

# Start the FastAPI server
uvicorn main:app --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Start the Next.js Dev Server
npm run dev
```

### 3. Usage
- Access the frontend at `http://localhost:3000`
- You can register a new account, or log in with the seeded demo account:
  - Phone: `+15550001111`
  - Password: `password`

## Design Decisions
- **WebSocket Broadcasting:** Instead of polling the DB, the server intercepts `chat_message` WS payloads, commits them to the DB atomically, and then instantly iterates over the active WebSocket `ConnectionManager` pool to broadcast the `new_message` payload to all relevant recipients.
- **Group vs 1:1 Routing:** Both 1:1 and Group chats share the exact same `Conversation` and `Message` tables. The distinction is handled dynamically by the `is_group` boolean flag and how many `ConversationMember` relations exist. This radically simplified the schema and routing logic.
