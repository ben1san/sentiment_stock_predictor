"""Gemini API を用いたセンチメント分析サービス。

Google の Gemini Pro モデルを使い、テキストの感情極性（ポジティブ/ネガティブ/中立）を
スコアリングし、その根拠を日本語で説明します。
"""

from __future__ import annotations

import asyncio
import json
import logging
import re

import google.generativeai as genai

from app.config import get_settings
from app.models.schemas import SentimentArticle, SentimentResult

logger = logging.getLogger(__name__)

# Gemini モデル名
GEMINI_MODEL = "gemini-1.5-flash"

# ──────────────────────────────────────────
# プロンプトテンプレート
# ──────────────────────────────────────────

SENTIMENT_PROMPT_TEMPLATE = """\
あなたは株式市場の専門的なアナリストです。
以下のテキストを読み、株価に対するセンチメント（感情・見通し）を分析してください。

【テキスト】
タイトル: {title}
本文: {body}

【指示】
1. センチメントスコアを -1.0（非常にネガティブ）〜 +1.0（非常にポジティブ）の範囲で数値化してください。
2. ラベルを "positive"（0.1以上）, "neutral"（-0.1〜0.1）, "negative"（-0.1以下）のいずれかで分類してください。
3. そのスコアを付けた根拠を日本語で50〜100文字で説明してください。

【出力形式】（JSON のみ。余計な説明は不要）
{{
  "score": <float>,
  "label": "<positive|neutral|negative>",
  "explanation": "<根拠の説明>"
}}
"""


def _configure_genai() -> bool:
    """Gemini API キーを設定します。未設定の場合は False を返します。"""
    settings = get_settings()
    if not settings.gemini_api_key:
        logger.warning(
            "GEMINI_API_KEY が設定されていません。モック分析を使用します。"
        )
        return False
    genai.configure(api_key=settings.gemini_api_key)
    return True


async def analyze_sentiment(article: SentimentArticle) -> SentimentResult:
    """単一記事のセンチメントを Gemini API で分析します。

    Args:
        article: 分析対象の記事・投稿データ。

    Returns:
        センチメント分析結果。
    """
    if not _configure_genai():
        return _mock_sentiment(article)

    prompt = SENTIMENT_PROMPT_TEMPLATE.format(
        title=article.title,
        body=article.body or "（本文なし）",
    )

    try:
        result = await asyncio.to_thread(_sync_generate, prompt)
        return SentimentResult(
            title=article.title,
            score=result["score"],
            label=result["label"],
            explanation=result["explanation"],
            source=article.source,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gemini API 呼び出しに失敗しました: %s", exc)
        return _mock_sentiment(article)


async def analyze_sentiment_batch(
    articles: list[SentimentArticle],
    concurrency: int = 5,
) -> list[SentimentResult]:
    """複数記事を並列でセンチメント分析します。

    Args:
        articles: 分析対象の記事リスト。
        concurrency: 同時実行数（Gemini API のレート制限に配慮）。

    Returns:
        センチメント分析結果のリスト。
    """
    semaphore = asyncio.Semaphore(concurrency)

    async def _analyze_with_limit(article: SentimentArticle) -> SentimentResult:
        async with semaphore:
            # レート制限対策: 各リクエスト間に少し待機
            await asyncio.sleep(0.3)
            return await analyze_sentiment(article)

    results = await asyncio.gather(
        *[_analyze_with_limit(a) for a in articles],
        return_exceptions=False,
    )
    return list(results)


def _sync_generate(prompt: str) -> dict:
    """Gemini API を同期的に呼び出し、JSON レスポンスをパースします。"""
    model = genai.GenerativeModel(GEMINI_MODEL)
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.1,  # 一貫性重視
            max_output_tokens=256,
        ),
    )

    text = response.text.strip()
    # Markdown コードブロックを除去
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("```").strip()

    parsed = json.loads(text)

    # バリデーション
    score = float(parsed.get("score", 0.0))
    score = max(-1.0, min(1.0, score))  # クランプ

    label = parsed.get("label", "neutral")
    if label not in ("positive", "neutral", "negative"):
        label = _score_to_label(score)

    return {
        "score": score,
        "label": label,
        "explanation": str(parsed.get("explanation", "分析結果なし"))[:200],
    }


def _score_to_label(score: float) -> str:
    """スコア値からラベルを返します。"""
    if score >= 0.1:
        return "positive"
    if score <= -0.1:
        return "negative"
    return "neutral"


def calculate_aggregate_sentiment(
    results: list[SentimentResult],
) -> tuple[float, str]:
    """複数のセンチメント結果を集約して平均スコアと総合ラベルを返します。

    Args:
        results: センチメント結果のリスト。

    Returns:
        (平均スコア, 総合ラベル) のタプル。
    """
    if not results:
        return 0.0, "neutral"

    avg_score = sum(r.score for r in results) / len(results)
    label = _score_to_label(avg_score)
    return round(avg_score, 4), label


def _mock_sentiment(article: SentimentArticle) -> SentimentResult:
    """Gemini API 未設定時のモックセンチメント結果を返します。"""
    # タイトルにポジティブ/ネガティブキーワードが含まれるか簡易チェック
    title_lower = (article.title or "").lower()
    positive_keywords = ["up", "growth", "strong", "beat", "surge", "rally", "buy", "bullish", "好調", "上昇", "増益"]
    negative_keywords = ["down", "fall", "weak", "miss", "crash", "sell", "bearish", "悪化", "下落", "減益", "赤字"]

    pos_count = sum(1 for k in positive_keywords if k in title_lower)
    neg_count = sum(1 for k in negative_keywords if k in title_lower)

    if pos_count > neg_count:
        score, label = 0.45, "positive"
        explanation = "ポジティブキーワードが多く含まれているため、強気の見通しと判断（モックデータ）。"
    elif neg_count > pos_count:
        score, label = -0.40, "negative"
        explanation = "ネガティブキーワードが多く含まれているため、弱気の見通しと判断（モックデータ）。"
    else:
        score, label = 0.05, "neutral"
        explanation = "特定の方向性キーワードが少なく、中立的な内容と判断（モックデータ）。"

    return SentimentResult(
        title=article.title,
        score=score,
        label=label,
        explanation=explanation,
        source=article.source,
    )
