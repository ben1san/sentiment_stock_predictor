from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os
from dotenv import load_dotenv

# 手動で .env をロードしてみる (念のため)
# プロジェクトルート / backend / .env
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(base_dir, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

class Settings(BaseSettings):
    """アプリケーション全体の設定クラス。"""

    # --- Gemini API ---
    gemini_api_key: str = ""

    # --- Reddit API (https://www.reddit.com/prefs/apps から取得) ---
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "SentimentStockPredictor/1.0"

    # --- TDnet ---
    tdnet_base_url: str = "https://www.release.tdnet.info/inbs/"

    # --- CORS ---
    cors_origins: list[str] = ["http://localhost:3000", "https://*.vercel.app"]

    # --- アプリ設定 ---
    debug: bool = False
    app_name: str = "Sentiment Stock Predictor API"
    app_version: str = "0.1.0"

    model_config = SettingsConfigDict(env_prefix="", case_sensitive=False, extra="ignore")

@lru_cache
def get_settings() -> Settings:
    """設定のシングルトンインスタンスを返します。"""
    settings = Settings()
    # デバッグ用にキーが空なら警告
    if not settings.gemini_api_key:
        print("WARNING: GEMINI_API_KEY is empty in Settings!")
    return settings
