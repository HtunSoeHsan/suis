from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/suis_db"

    # Groq AI
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # CORS — override via env: CORS_ORIGINS=https://app.example.com,https://www.example.com
    CORS_ORIGINS: str = "http://localhost:3000"

    # Face recognition
    SIMILARITY_THRESHOLD: float = 0.45
    LIVENESS_THRESHOLD: float = 0.6

    # JWT Auth — MUST be set via env in production: openssl rand -hex 32
    JWT_SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # App
    APP_ENV: str = "development"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
