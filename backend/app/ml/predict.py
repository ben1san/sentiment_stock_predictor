"""株価方向性予測ロジック。

センチメントスコアと価格履歴から翌日の株価方向性を予測します。
MVP では Gemini API を用いたルールベース + 統計的手法を組み合わせます。
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Literal

from app.ml.model import build_feature_vector
from app.models.schemas import (
    PredictionResponse,
    SentimentResult,
    StockPricePoint,
)
from app.services.sentiment_analyzer import calculate_aggregate_sentiment
from app.services.stock_fetcher import get_current_price

logger = logging.getLogger(__name__)


async def predict_stock_direction(
    ticker: str,
    company_name: str | None,
    price_history: list[StockPricePoint],
    sentiment_results: list[SentimentResult],
) -> PredictionResponse:
    """株価の翌日方向性を予測します。

    MVP アルゴリズム:
        1. センチメントスコアの加重平均（最新記事ほど重み大）
        2. 直近 5 日のモメンタム（価格トレンド）
        3. ボラティリティ補正
        -> 方向性スコアを -1〜1 で算出し、閾値で分類

    Args:
        ticker: 証券ティッカー
        company_name: 会社名
        price_history: 株価履歴（古い順）
        sentiment_results: センチメント分析結果リスト

    Returns:
        PredictionResponse
    """
    current_price = price_history[-1].close if price_history else 0.0

    # --- センチメント集計 ---
    avg_score, overall_label = calculate_aggregate_sentiment(sentiment_results)

    # --- 特徴量ベクトル構築 ---
    price_dicts = [
        {"date": p.date, "close": p.close} for p in price_history
    ]
    features = build_feature_vector(price_dicts, avg_score, overall_label)

    # --- 方向性予測（ルールベース） ---
    direction, predicted_change_pct, confidence = _rule_based_predict(
        features=features,
        sentiment_score=avg_score,
        sentiment_label=overall_label,
    )

    # --- センチメントサマリー生成 ---
    sentiment_summary = _build_sentiment_summary(
        sentiment_results=sentiment_results,
        avg_score=avg_score,
        overall_label=overall_label,
    )

    return PredictionResponse(
        ticker=ticker,
        company_name=company_name,
        current_price=current_price,
        predicted_direction=direction,
        predicted_change_pct=round(predicted_change_pct, 2),
        confidence=round(confidence, 3),
        sentiment_score=avg_score,
        sentiment_label=overall_label,
        sentiment_summary=sentiment_summary,
        news_articles=sentiment_results[:10],  # 最大 10 件
        price_history=price_history[-30:],     # 最大 30 日分
        generated_at=datetime.now(),
    )


def _rule_based_predict(
    features: "import numpy as np; np.ndarray",
    sentiment_score: float,
    sentiment_label: str,
) -> tuple[Literal["up", "down", "neutral"], float, float]:
    """ルールベースの方向性予測。

    Returns:
        (direction, predicted_change_pct, confidence)
    """
    import numpy as np

    # 特徴量からモメンタムスコアを算出
    recent_returns = features[:5]  # 直近 5 日のリターン
    momentum = float(np.mean(recent_returns)) if len(recent_returns) > 0 else 0.0
    volatility = float(features[7]) if len(features) > 7 else 0.0

    # 総合スコア（センチメント 60% + モメンタム 40%）
    composite_score = 0.60 * sentiment_score + 0.40 * np.sign(momentum) * min(abs(momentum) * 10, 1.0)

    # 信頼度（ボラティリティが低いほど高信頼）
    base_confidence = min(abs(composite_score), 1.0)
    volatility_penalty = min(volatility * 5, 0.3)
    confidence = max(0.1, base_confidence - volatility_penalty)

    # 予測変動率（センチメントスコアをベースに推定）
    predicted_change_pct = composite_score * 3.0  # 最大 ±3%

    # 方向性分類
    if composite_score >= 0.15:
        direction = "up"
    elif composite_score <= -0.15:
        direction = "down"
    else:
        direction = "neutral"
        confidence = max(0.1, confidence * 0.7)  # 中立は信頼度を下げる

    return direction, predicted_change_pct, confidence


def _build_sentiment_summary(
    sentiment_results: list[SentimentResult],
    avg_score: float,
    overall_label: str,
) -> str:
    """センチメント結果の要約文を生成します。"""
    n = len(sentiment_results)
    if n == 0:
        return "分析対象の記事がありませんでした。"

    pos_count = sum(1 for r in sentiment_results if r.label == "positive")
    neg_count = sum(1 for r in sentiment_results if r.label == "negative")
    neu_count = n - pos_count - neg_count

    label_map = {
        "positive": "Positive（強気）",
        "neutral": "Neutral（中立）",
        "negative": "Negative（弱気）",
    }

    summary = (
        f"直近 {n} 件の記事を分析した結果、"
        f"ポジティブ {pos_count} 件、中立 {neu_count} 件、ネガティブ {neg_count} 件でした。"
        f"総合センチメントスコア: {avg_score:+.3f}（{label_map.get(overall_label, overall_label)}）。"
    )

    # 代表的な説明を追加
    if sentiment_results:
        top = max(sentiment_results, key=lambda r: abs(r.score))
        summary += f" 最もスコアが高い記事: 「{top.title[:40]}…」（スコア: {top.score:+.2f}）"

    return summary
