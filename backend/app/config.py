from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password733@localhost:5432/suis_db"

    # Groq AI
    GROQ_API_KEY: str = "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"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002"

    # Face recognition
    SIMILARITY_THRESHOLD: float = 0.45
    LIVENESS_THRESHOLD: float = 0.6

    # JWT Auth
    JWT_SECRET_KEY: str = "suis_secret_jwt_key_2026_ucsp_super_secure_key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # App
    APP_ENV: str = "development"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
