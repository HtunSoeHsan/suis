"""
Application settings — loaded from .env via pydantic-settings.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ─── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/suis_db"

    # ─── Groq & OpenRouter AI ──────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct"
    DEFAULT_AI_PROVIDER: str = "groq"

    # ─── JWT Auth ─────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "changeme"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # ─── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000"

    # ─── Face Recognition ─────────────────────────────────────────────────────
    SIMILARITY_THRESHOLD: float = 0.45
    LIVENESS_THRESHOLD: float = 0.6

    # ─── App ──────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"

    # ─── Telegram Bot ─────────────────────────────────────────────────────────
    TELEGRAM_BOT_TOKEN: str = ""
    # Comma-separated Telegram usernames WITHOUT @  e.g. "htunsoehsan,john_doe"
    TELEGRAM_ALLOWED_USERNAMES: str = ""
    # "polling" for local dev | "webhook" for VPS production
    BOT_MODE: str = "polling"
    # Only required when BOT_MODE=webhook — must be HTTPS
    WEBHOOK_BASE_URL: str = ""
    WEBHOOK_SECRET_TOKEN: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_usernames_set(self) -> set[str]:
        return {u.strip().lower() for u in self.TELEGRAM_ALLOWED_USERNAMES.split(",") if u.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
