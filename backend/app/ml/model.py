"""機械学習モデルの定義（XGBoost + センチメント特徴量）。

株価の翌営業日の方向性（上昇/下落/中立）を予測するモデルを定義します。
"""

from __future__ import annotations

import logging

import numpy as np
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


def build_feature_vector(
    price_history: list[dict],
    sentiment_score: float,
    sentiment_label: str,
) -> np.ndarray:
    """価格履歴とセンチメントから特徴量ベクトルを構築します。

    Features:
        - 直近 5 日間のリターン（%）
        - 5 日移動平均からの乖離率
        - 20 日移動平均からの乖離率（データが足りない場合は 0）
        - センチメントスコア（-1〜1）
        - センチメントラベルのワンホット（positive, neutral, negative）
        - ボラティリティ（直近 5 日の標準偏差）

    Args:
        price_history: {'date': ..., 'close': float} のリスト（古い順）
        sentiment_score: センチメントスコア (-1〜1)
        sentiment_label: "positive" | "neutral" | "negative"

    Returns:
        1D numpy 配列の特徴量ベクトル。
    """
    closes = np.array([p["close"] for p in price_history], dtype=float)

    if len(closes) < 2:
        # データ不足時はゼロベクトル
        return np.zeros(12)

    # --- 価格ベース特徴量 ---
    # 直近 1〜5 日リターン
    returns = np.diff(closes) / closes[:-1]
    recent_returns = returns[-5:] if len(returns) >= 5 else np.pad(returns, (5 - len(returns), 0))

    # 5 日移動平均からの乖離率
    ma5 = np.mean(closes[-5:]) if len(closes) >= 5 else closes.mean()
    ma5_deviation = (closes[-1] - ma5) / ma5 if ma5 != 0 else 0.0

    # 20 日移動平均からの乖離率
    ma20 = np.mean(closes[-20:]) if len(closes) >= 20 else closes.mean()
    ma20_deviation = (closes[-1] - ma20) / ma20 if ma20 != 0 else 0.0

    # ボラティリティ（直近 5 日）
    volatility = float(np.std(recent_returns)) if len(recent_returns) > 1 else 0.0

    # --- センチメント特徴量 ---
    is_positive = 1.0 if sentiment_label == "positive" else 0.0
    is_neutral = 1.0 if sentiment_label == "neutral" else 0.0
    is_negative = 1.0 if sentiment_label == "negative" else 0.0

    feature_vector = np.array([
        *recent_returns.tolist(),   # 5 次元
        ma5_deviation,              # 1 次元
        ma20_deviation,             # 1 次元
        volatility,                 # 1 次元
        sentiment_score,            # 1 次元
        is_positive,                # 1 次元
        is_neutral,                 # 1 次元
        is_negative,                # 1 次元
    ], dtype=float)

    return feature_vector  # 合計 12 次元


FEATURE_NAMES = [
    "return_d1", "return_d2", "return_d3", "return_d4", "return_d5",
    "ma5_deviation", "ma20_deviation", "volatility",
    "sentiment_score", "is_positive", "is_neutral", "is_negative",
]
