"""アプリケーション設定モジュール。環境変数を一括管理します。"""

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション全体の設定クラス。"""

    # --- Gemini API ---
    gemini_api_key: str = ""

    # --- Reddit API ---
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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """設定のシングルトンインスタンスを返します。"""
    return Settings()
