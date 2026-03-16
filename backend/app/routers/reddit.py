import logging
from fastapi import APIRouter
# Depending on where these services ended up, we try to import them
try:
    from services.reddit_client import fetch_reddit_posts
    from services.llm_analyzer import analyze_wsb_post
except ImportError:
    # If they are moved to app.services
    try:
        from app.services.reddit_client import fetch_reddit_posts
        from app.services.llm_analyzer import analyze_wsb_post
    except ImportError:
        pass

router = APIRouter(prefix="/api/v1/reddit", tags=["reddit"])
logger = logging.getLogger(__name__)

@router.get("/analyze/{ticker}")
async def analyze_sentiment(ticker: str, limit: int = 3):
    """
    Fetches Reddit posts and analyzes them using Gemini multimodal API.
    """
    # 1. Fetch raw posts from Reddit (bypassing API key requirement)
    # Ensure fetch_reddit_posts / analyze_wsb_post are in scope
    raw_posts = fetch_reddit_posts(ticker=ticker, limit=limit)
    
    analyzed_results = []
    
    # 2. Iterate and analyze each post with Gemini
    # Note: Sequential processing for now. Might need parallel processing for higher limits.
    for post in raw_posts:
        ai_analysis = analyze_wsb_post(
            title=post["Title"],
            body=post["Body"],
            image_url=post["URL"]
        )
        
        # Merge raw data with AI analysis
        combined_data = {**post, "ai_analysis": ai_analysis}
        analyzed_results.append(combined_data)

    return {
        "status": "success",
        "ticker": ticker.upper(),
        "count": len(analyzed_results),
        "posts": analyzed_results
    }
