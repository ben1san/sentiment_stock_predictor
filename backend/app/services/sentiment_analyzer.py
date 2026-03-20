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

COMPREHENSIVE_ANALYST_PROMPT = """\
# Role
あなたは日本の株式市場、特に中小型株（グロース・スタンダード市場）に精通したシニア証券アナリスト、およびSNSセンチメント解析のエキスパートです。

# Objective
提供された「適時開示情報（決算短信）」と「SNSの投稿データ」を詳細に分析し、以下の2つの軸で-1.0〜+1.0の範囲でセンチメントスコアを算出してください。
1. 【Fundamental Score】: 決算内容自体の良し悪しと持続性
2. 【Social Score】: SNS上での注目度と反応の質

# Constraints
- アナリストのカバーがない中小企業であることを前提に、情報の非対称性を考慮してください。
- 数字の表面的な変化だけでなく、その「理由（一過性か構造的か）」を重視してください。
- SNSの投稿が「ノイズ（煽り）」か「冷静な評価」かを見極めてください。

# Input Data
## 1. 銘柄情報
- 銘柄コード: {ticker}
- 社名: {company_name}

## 2. 決算短信の要約（TDnet）
{tdnet_text}

## 3. SNSの反応（X / Reddit）
{social_text}

# Analysis Instructions
以下のステップで分析を行い、JSON形式で出力してください。

### Step 1: 決算内容の深掘り
- 利益の増減理由は何か？（売上拡大、コスト削減、一過性の売却益など）
- 通期計画に対する進捗率は？
- 「ネガティブ視される可能性のあるポジティブ（例：材料出尽くし）」はないか？

### Step 2: SNSの熱量と質の分析
- 反応の数は多いか？（普段と比較して）
- 投稿者は「買い煽り」か「内容の精査」をしているか？
- まだ誰も気づいていないような「隠れた好材料」に言及があるか？

### Step 3: スコアリング
1. Fundamental Score (-1.0 to 1.0): 決算の本質的な強さ
2. Social Score (-1.0 to 1.0): SNSでの盛り上がりとポジティブさ
3. Gap Score (Fundamental - Social): 情報の伝達遅延度合い（数値が高いほど「良いのに気づかれていない」）

# Output Format (JSON)
{{
  "ticker": "{ticker}",
  "analysis": {{
    "fundamental_reason": "理由の要約",
    "social_insight": "SNS反応の傾向",
    "risk_factor": "懸念点"
  }},
  "scores": {{
    "fundamental": 0.85,
    "social": 0.2,
    "gap": 0.65
  }},
  "judgment": "BUY / HOLD / WATCH"
}}
"""

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

async def analyze_comprehensive_sentiment(
    ticker: str,
    company_name: str,
    tdnet_articles: list[SentimentArticle],
    social_articles: list[SentimentArticle],
) -> dict:
    """アナリスト視点での総合分析を Gemini で実行します。"""
    client = _get_genai_client()
    
    tdnet_text = "\n".join([f"- {a.title}: {a.body or ''}" for a in tdnet_articles]) or "情報なし"
    social_text = "\n".join([f"- {a.title}: {a.body or ''}" for a in social_articles]) or "情報なし"
    
    prompt = COMPREHENSIVE_ANALYST_PROMPT.format(
        ticker=ticker,
        company_name=company_name,
        tdnet_text=tdnet_text,
        social_text=social_text,
    )

    if not client:
        return _mock_comprehensive(ticker)

    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text.strip())
    except Exception as e:
        logger.error("Comprehensive analysis failed: %s", e)
        return _mock_comprehensive(ticker)

def _mock_comprehensive(ticker: str) -> dict:
    """API 未設定時のモック。"""
    return {
        "ticker": ticker,
        "analysis": {
            "fundamental_reason": "（モックモード）直近の決算では利益成長が見られ、本業の収益性が改善しています。",
            "social_insight": "（モックモード）SNSでは一部で注目を集めていますが、全体としてはまだ過熱感はありません。",
            "risk_factor": "市場全体のボラティリティと、原材料価格の高騰がリスク要因です。"
        },
        "scores": {
            "fundamental": 0.65,
            "social": 0.15,
            "gap": 0.50
        },
        "judgment": "WATCH"
    }

async def analyze_sentiment_batch(
    articles: list[SentimentArticle],
    concurrency: int = 5,
) -> list[SentimentResult]:
    """複数記事を一度のプロンプトでセンチメント分析します。"""
    if not articles:
        return []

    client = _get_genai_client()
    if not client:
        return [_mock_sentiment(a) for a in articles]

    articles_text = ""
    for i, a in enumerate(articles):
        articles_text += f"---\n[Index: {i}]\nタイトル: {a.title}\n本文: {a.body or 'なし'}\n"

    prompt = SENTIMENT_PROMPT_TEMPLATE.format(articles_text=articles_text)

    try:
        response = await asyncio.to_thread(_sync_generate_batch, client, prompt)
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
    except Exception as exc:
        logger.exception("Gemini API バッチ呼び出しに失敗しました: %s", exc)
        return [_mock_sentiment(a) for a in articles]

def _sync_generate_batch(client: genai.Client, prompt: str) -> list[dict]:
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.1,  
            max_output_tokens=8192,
            response_mime_type="application/json",
        ),
    )
    text = response.text.strip()
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("```").strip()
    try:
        parsed_list = json.loads(text)
        if not isinstance(parsed_list, list):
            parsed_list = [parsed_list]
    except Exception as e:
        logger.error("JSON batch parse failed. Raw text: %s", text)
        raise e

    cleaned_list = []
    for item in parsed_list:
        score = float(item.get("score", 0.0))
        score = max(-1.0, min(1.0, score))
        label = _score_to_label(score)
        cleaned_list.append({
            "index": item.get("index", 0),
            "score": score,
            "label": label,
            "explanation": str(item.get("explanation", "分析結果なし"))[:200],
        })
    return cleaned_list

def _score_to_label(score: float) -> str:
    if score >= 0.1: return "positive"
    if score <= -0.1: return "negative"
    return "neutral"

def calculate_aggregate_sentiment(results: list[SentimentResult]) -> tuple[float, str]:
    if not results: return 0.0, "neutral"
    avg_score = sum(r.score for r in results) / len(results)
    return round(avg_score, 4), _score_to_label(avg_score)

def _mock_sentiment(article: SentimentArticle) -> SentimentResult:
    title_lower = (article.title or "").lower()
    positive_keywords = ["up", "growth", "strong", "beat", "好調", "上昇", "増益"]
    negative_keywords = ["down", "fall", "weak", "miss", "悪化", "下落", "減益"]
    pos_count = sum(1 for k in positive_keywords if k in title_lower)
    neg_count = sum(1 for k in negative_keywords if k in title_lower)
    if pos_count > neg_count:
        score, label = 0.45, "positive"
        explanation = "Positiveキーワードが含まれているため（モック）。"
    elif neg_count > pos_count:
        score, label = -0.40, "negative"
        explanation = "Negativeキーワードが含まれているため（モック）。"
    else:
        score, label = 0.0, "neutral"
        explanation = "特筆すべき方向性なし（モック）。"
    return SentimentResult(
        title=article.title, score=score, label=label, explanation=explanation, source=article.source
    )
