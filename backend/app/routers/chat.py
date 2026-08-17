from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.attendance import ChatRequest, ChatResponse
from app.services.groq_service import get_groq_service

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])


@router.get("/models")
async def get_models():
    """
    Returns available AI models and provider configuration status (Groq / OpenRouter).
    """
    service = get_groq_service()
    return service.get_model_info()


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    AI-powered chatbot endpoint.
    Accepts natural language queries → returns structured response.
    Supports Groq & OpenRouter LLM providers and dynamic model selection.
    """
    service = get_groq_service()
    result = await service.chat(
        message=body.message,
        db=db,
        provider=body.provider,
        model=body.model,
    )
    return ChatResponse(**result)
