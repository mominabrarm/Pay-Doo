from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Brightloop Subscription Management System"
    API_V1_PREFIX: str = "/api"
    DATABASE_URL: str = "postgresql://brightloop:brightloop_password@localhost:5432/brightloop_db"
    DEBUG: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
