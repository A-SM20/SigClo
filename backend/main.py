from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import engine, Base
from api.routers import auth, ws, users, contacts, conversations, messages

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Signal Clone API")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(ws.router, tags=["websocket"])

@app.get("/")
def root():
    return {"message": "Welcome to Signal Clone API"}
