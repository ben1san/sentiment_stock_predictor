from fastapi import FastAPI
from services.reddit_client import fetch_reddit_posts

app = FastAPI(title="Hello, Wall Street. API")

@app.get("/api/v1/analyze/{ticker}")
async def analyze_sentiment(ticker: str, limit: int = 5):
    """
    指定したティッカーのReddit投稿を取得し、フロントエンドに返すAPI
    (将来的にはここでGemini APIを噛ませて感情分析結果も追加する)
    """
    reddit_data = fetch_reddit_posts(ticker=ticker, limit=limit)
    
    # 現段階では取得したデータそのものを返す
    return {
        "status": "success",
        "ticker": ticker.upper(),
        "data_count": len(reddit_data),
        "posts": reddit_data
    }