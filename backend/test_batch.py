import asyncio
import os
import logging
from app.config import get_settings
from app.models.schemas import SentimentArticle
from app.services.sentiment_analyzer import analyze_sentiment_batch

logging.basicConfig(level=logging.DEBUG)

async def test():
    article = SentimentArticle(
        title="Apple seems to be testing the iPhone 17 with satellite-to-cell connectivity",
        body="This is an amazing feature for the future. Apple stock might go up.",
        source="reddit"
    )
    articles = [article] * 20
    result = await analyze_sentiment_batch(articles)
    print(result)

if __name__ == "__main__":
    asyncio.run(test())
