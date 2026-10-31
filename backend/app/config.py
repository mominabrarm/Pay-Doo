from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Brightloop Subscription Management System"
    API_V1_PREFIX: str = "/api"
    DATABASE_URL: str = "sqlite:///./brightloop.db"
    DEBUG: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
