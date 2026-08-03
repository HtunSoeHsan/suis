from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.attendance import ChatRequest, ChatResponse
from app.services.groq_service import get_groq_service

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    AI-powered chatbot endpoint.
    Accepts natural language queries → returns structured response.
    Internally uses Groq LLM for Text-to-SQL or general info retrieval.
    """
    service = get_groq_service()
    result = await service.chat(body.message, db)
    return ChatResponse(**result)
