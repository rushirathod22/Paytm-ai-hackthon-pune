from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    APP_ENV: str = "development"
    PROJECT_NAME: str = "OpsSaathi AI"
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./opssaathi.db"
    
    # Auth
    JWT_SECRET: str = "opssaathi-build-for-india-2026-super-secret-key-change-in-prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Integrations
    LLM_PROVIDER: str = "gemini"  # "gemini" | "mock"
    GEMINI_API_KEY: Optional[str] = None
    
    VOICE_PROVIDER: str = "browser"  # "browser" | "sarvam"
    SARVAM_API_KEY: Optional[str] = None
    
    # Paytm Staging
    PAYTM_ENVIRONMENT: str = "staging"
    PAYTM_MID: str = "TEST_MERCHANT_MID_001"
    PAYTM_MERCHANT_KEY: str = "TEST_SECRET_KEY_DUMMY"
    PAYTM_WEBSITE_NAME: str = "WEBSTAGING"
    
    # Origin
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    DEMO_DATA_MODE: bool = True

settings = Settings()
