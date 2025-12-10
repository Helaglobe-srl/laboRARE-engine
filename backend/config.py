"""configuration settings for laborare engine"""

import os
from typing import Optional
from dotenv import load_dotenv

try:
    from pydantic_settings import BaseSettings
except ImportError:
    # fallback for older pydantic versions
    from pydantic import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    """application settings"""
    
    # mistral api settings
    mistral_api_key: str = os.environ.get("MISTRAL_API_KEY", "")
    
    # api settings
    api_title: str = "mistral ocr and q&a rag engine"
    api_description: str = "api for managing documents with mistral ocr and natural language q&a"
    api_version: str = "1.0.0"
    
    # server settings
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True
    
    # file upload limits
    max_file_size_mb: int = 50
    max_pages: int = 1000
    allowed_extensions: list = [".pdf"]
    
    # mistral model settings
    default_qa_model: str = "mistral-small-latest"
    ocr_model: str = "mistral-ocr-latest"
    
    # cors settings
    cors_origins: list = ["*"]
    cors_credentials: bool = True
    cors_methods: list = ["*"]
    cors_headers: list = ["*"]
    
    class Config:
        """pydantic config"""
        env_file = ".env"
        case_sensitive = False


# global settings instance
settings = Settings()


def get_settings() -> Settings:
    """get application settings
    
    returns:
        settings instance
    """
    return settings

