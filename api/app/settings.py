from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_VERSION = "0.1"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://ofs:ofs@localhost:5432/ofs"
    off_base_url: str = "https://world.openfoodfacts.org"
    off_contact: str = "set-OFF_CONTACT-in-.env"
    off_timeout_s: float = 4.0
    cache_days: int = 30
    usda_base_url: str = "https://api.nal.usda.gov"
    usda_api_key: str = "DEMO_KEY"  # free; a personal api.data.gov key raises the rate limit
    usda_timeout_s: float = 4.0

    @property
    def user_agent(self) -> str:
        return f"OpenFoodScanner/{APP_VERSION} ({self.off_contact})"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
