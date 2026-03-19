"""Gemini API を用いたセンチメント分析サービス。

Google の Gemini Pro モデルを使い、テキストの感情極性（ポジティブ/ネガティブ/中立）を
スコアリングし、その根拠を日本語で説明します。
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import os

from google import genai
from google.genai import types

from app.config import get_settings
from app.models.schemas import SentimentArticle, SentimentResult

logger = logging.getLogger(__name__)

# Gemini モデル名
GEMINI_MODEL = "models/gemini-1.5-flash"

# ──────────────────────────────────────────
# プロンプトテンプレート
# ──────────────────────────────────────────

SENTIMENT_PROMPT_TEMPLATE = """\
あなたは株式市場の専門的なアナリストです。
以下のテキストリストを読み、各テキストの株価に対するセンチメント（感情・見通し）を分析してください。

【テキストリスト】
{articles_text}

【指示】
1. 各テキストごとにセンチメントスコアを -1.0（非常にネガティブ）〜 +1.0（非常にポジティブ）の間で数値化してください。
2. ラベルを "positive"（0.1以上）, "neutral"（-0.1〜0.1）, "negative"（-0.1以下）のいずれかで分類してください。
3. そのスコアを付けた根拠を日本語で50〜100文字で説明してください。

【出力形式】（JSON配列のみ。余計な説明は絶対に出力しないでください）
[
  {{
    "index": <対応するテキストのインデックス(0から始まる整数)>,
    "score": <float>,
    "label": "<positive|neutral|negative>",
    "explanation": "<根拠の説明>"
  }}
]
"""


def _get_genai_client() -> genai.Client | None:
    """Gemini API クライアントを取得します。未設定の場合は None を返します。"""
    settings = get_settings()
    if not settings.gemini_api_key:
        logger.warning(
            "GEMINI_API_KEY が設定されていません。モック分析を使用します。"
        )
        return None
    return genai.Client(api_key=settings.gemini_api_key)


async def analyze_sentiment(article: SentimentArticle) -> SentimentResult:
    """単一記事のセンチメントを Gemini API で分析（バッチ処理を利用）。"""
    results = await analyze_sentiment_batch([article])
    return results[0] if results else _mock_sentiment(article)


async def analyze_sentiment_batch(
    articles: list[SentimentArticle],
    concurrency: int = 5,
) -> list[SentimentResult]:
    """複数記事を一度のプロンプトでセンチメント分析します。
    （API のレート制限を回避するため、複数記事をまとめてリクエストします）
    """
    if not articles:
        return []

    client = _get_genai_client()
    if not client:
        return [_mock_sentiment(a) for a in articles]

    # 一度に送信するテキストを構築
    articles_text = ""
    for i, a in enumerate(articles):
        articles_text += f"---\n[Index: {i}]\nタイトル: {a.title}\n本文: {a.body or 'なし'}\n"

    prompt = SENTIMENT_PROMPT_TEMPLATE.format(
        articles_text=articles_text
    )

    try:
        response = await asyncio.to_thread(_sync_generate_batch, client, prompt)
        
        # 結果をマッピング
        results = []
        for i, article in enumerate(articles):
            res_dict = next((r for r in response if r.get("index") == i), None)
            if res_dict:
                results.append(
                    SentimentResult(
                        title=article.title,
                        score=res_dict["score"],
                        label=res_dict["label"],
                        explanation=res_dict["explanation"],
                        source=article.source,
                    )
                )
            else:
                results.append(_mock_sentiment(article))
        return results

    except Exception as exc:  # noqa: BLE001
        logger.exception("Gemini API バッチ呼び出しに失敗しました: %s", exc)
        return [_mock_sentiment(a) for a in articles]


def _sync_generate_batch(client: genai.Client, prompt: str) -> list[dict]:
    """Gemini API を同期的に呼び出し、JSON配列レスポンスをパースします。"""
    
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.1,  
            max_output_tokens=8192,  # 複数記事のため十分大きめに設定
            response_mime_type="application/json",
        ),
    )

    text = response.text.strip()
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("```").strip()
    
    try:
        parsed_list = json.loads(text)
        if not isinstance(parsed_list, list):
            parsed_list = [parsed_list] # 単一オブジェクトの場合はリスト化
    except Exception as e:
        logger.error("JSON batch parse failed. Raw text: %s", text)
        raise e

    # クリーンアップ
    cleaned_list = []
    for item in parsed_list:
        score = float(item.get("score", 0.0))
        score = max(-1.0, min(1.0, score))
        label = item.get("label", "neutral")
        if label not in ("positive", "neutral", "negative"):
            label = _score_to_label(score)
            
        cleaned_list.append({
            "index": item.get("index", 0),
            "score": score,
            "label": label,
            "explanation": str(item.get("explanation", "分析結果なし"))[:200],
        })

    return cleaned_list


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
        explanation = "Positiveキーワードが含まれているため、Positiveと判断（モックモード）。"
    elif neg_count > pos_count:
        score, label = -0.40, "negative"
        explanation = "Negativeキーワードが含まれているため、Negativeと判断（モックモード）。"
    else:
        # 完全に固定値だと不自然なので、微小な変動を持たせる
        import random
        score = round(random.uniform(-0.02, 0.02), 3)
        label = "neutral"
        explanation = "特筆すべき方向性が見られず、Neutral（中立）な内容と判断（モックモード）。"

    return SentimentResult(
        title=article.title,
        score=score,
        label=label,
        explanation=explanation,
        source=article.source,
    )
