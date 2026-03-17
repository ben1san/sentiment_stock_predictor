import asyncio
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from transformers import pipeline

from app.collectors.reddit_scraper import fetch_reddit_posts
from app.services.llm_analyzer import analyze_wsb_post

router = APIRouter(prefix="/api/v1/analyze", tags=["wsb"])

# Define Pydantic models for the response
class AIAnalysis(BaseModel):
    sentiment: str
    apeConvictionScore: int
    aiCommentary: str

class PostData(BaseModel):
    Title: str
    Body: str
    Score: int
    URL: Optional[str] = None
    finbert_label: str
    finbert_score: float
    ai_analysis: AIAnalysis

class SentimentResponse(BaseModel):
    status: str
    ticker: str
    count: int
    posts: List[PostData]


# Initialize FinBERT globally so it loads once on startup
print("Loading FinBERT model for WSB Router...")
finbert = pipeline("sentiment-analysis", model="ProsusAI/finbert")
print("FinBERT model loaded successfully.")

@router.get("/{ticker}", response_model=SentimentResponse)
async def analyze_sentiment(ticker: str, limit: int = 3):
    """
    Fetches Reddit posts, runs text through FinBERT, and combines with Gemini for ensemble analysis.
    """
    # 1. Fetch raw posts from Reddit (using new reddit_scraper schemas)
    reddit_posts = await fetch_reddit_posts(query=ticker, max_items=limit)
    
    async def analyze_and_merge(post):
        # 2. FinBERT Analysis
        text_content = f"{post.title} {post.body}".strip()
        if not text_content:
            text_content = "No text provided."
            
        try:
            # Run FinBERT synchronously in a thread to prevent blocking
            finbert_result = await asyncio.to_thread(
                lambda: finbert(text_content, truncation=True, max_length=512)[0]
            )
            finbert_label = finbert_result['label']
            finbert_score = finbert_result['score']
        except Exception as e:
            print(f"FinBERT Error: {e}")
            finbert_label = "neutral"
            finbert_score = 0.0

        # 3. Gemini Ensemble Analysis
        try:
            ai_data = await analyze_wsb_post(
                title=post.title,
                body=post.body,
                image_url=post.url,
                finbert_label=finbert_label,
                finbert_score=finbert_score
            )
            
            ai_analysis = AIAnalysis(
                sentiment=ai_data.get("sentiment", "Unknown"),
                apeConvictionScore=int(ai_data.get("apeConvictionScore", ai_data.get("conviction_score", 0))),
                aiCommentary=ai_data.get("aiCommentary", ai_data.get("wsb_comment", "Analysis failed."))
            )
        except Exception as e:
            ai_analysis = AIAnalysis(
                sentiment="Unknown",
                apeConvictionScore=0,
                aiCommentary=f"Failed wrapper: {e}"
            )

        return PostData(
            Title=post.title,
            Body=post.body or "",
            Score=post.score,
            URL=post.url,
            finbert_label=finbert_label,
            finbert_score=finbert_score,
            ai_analysis=ai_analysis
        )

    # Create tasks for all posts
    tasks = [analyze_and_merge(post) for post in reddit_posts]
    
    # 4. Wait for all tasks to complete concurrently
    analyzed_results = await asyncio.gather(*tasks)

    return SentimentResponse(
        status="success",
        ticker=ticker.upper(),
        count=len(analyzed_results),
        posts=analyzed_results
    )
