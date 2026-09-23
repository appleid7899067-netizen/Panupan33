from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str = ""
    default_model: str = "claude-sonnet-4-5-20250929"
    database_url: str = "postgresql://bossnu:bossnu@localhost:5432/bossnu"
    evidence_signing_key: str = "dev-key-change-me"
    jwt_secret: str = "dev-jwt"
    sandbox_image: str = "bossnu-sandbox:latest"
    sandbox_timeout: int = 60
    sandbox_mem_limit: str = "512m"
    port: int = 8000
    log_level: str = "info"

    class Config:
        env_file = ".env"

settings = Settings()
