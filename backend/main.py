import asyncio
from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline

# Existing import
from services.reddit_client import fetch_reddit_posts
from services.llm_analyzer import analyze_wsb_post

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


app = FastAPI(title="Hello, Wall Street. API")

# Add CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # * is added for hackathon flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize FinBERT globally so it loads once on startup
print("Loading FinBERT model...")
finbert = pipeline("sentiment-analysis", model="ProsusAI/finbert")
print("FinBERT model loaded successfully.")

@app.get("/api/v1/analyze/{ticker}", response_model=SentimentResponse)
async def analyze_sentiment(ticker: str, limit: int = 3):
    """
    Fetches Reddit posts, runs text through FinBERT, and combines with Gemini for ensemble analysis.
    """
    # 1. Fetch raw posts from Reddit
    raw_posts = fetch_reddit_posts(ticker=ticker, limit=limit)
    
    async def analyze_and_merge(post):
        # 2. FinBERT Analysis
        text_content = f"{post['Title']} {post['Body']}".strip()
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
                title=post["Title"],
                body=post["Body"],
                image_url=post["URL"],
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

        return {
            **post, 
            "finbert_label": finbert_label,
            "finbert_score": finbert_score,
            "ai_analysis": ai_analysis
        }

    # Create tasks for all posts
    tasks = [analyze_and_merge(post) for post in raw_posts]
    
    # 4. Wait for all tasks to complete concurrently
    analyzed_results = await asyncio.gather(*tasks)

    return SentimentResponse(
        status="success",
        ticker=ticker.upper(),
        count=len(analyzed_results),
        posts=analyzed_results
    )