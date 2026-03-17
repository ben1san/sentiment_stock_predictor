"""FastAPI メインアプリケーション。"""

from __future__ import annotations

from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.schemas import HealthResponse
from app.routers import predict, sentiment, stocks, wsb
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="感情分析 × 株価予測 API（Gemini + yfinance）",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ──────────────────────────────────────────
# CORS ミドルウェア
# ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────
# ルーター登録
# ──────────────────────────────────────────
app.include_router(predict.router)
app.include_router(sentiment.router)
app.include_router(stocks.router)
app.include_router(wsb.router)


# ──────────────────────────────────────────
# ヘルスチェック
# ──────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """サーバーの稼働状態を確認します。"""
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        timestamp=datetime.now(),
    )


@app.get("/", tags=["root"])
async def root() -> dict:
    """ルートエンドポイント。"""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "docs": "/docs",
    }
