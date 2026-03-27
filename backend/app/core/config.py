from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Hackathon HrFlow.AI 2026 API"
    app_version: str = "0.1.0"

    api_key: str
    user_email: str
    hrflow_board_key: str = ""


settings = Settings()
