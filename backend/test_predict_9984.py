import asyncio
import os
from app.routers.predict import run_prediction
from app.models.schemas import PredictionRequest
import logging

# Set up logging to see what's happening
logging.basicConfig(level=logging.INFO)

async def test():
    req = PredictionRequest(ticker="9984.T", period_days=30)
    try:
        print("Testing 9984.T...")
        result = await run_prediction(req)
        print("Success!")
        print(f"Ticker: {result.ticker}")
        print(f"Confidence: {result.confidence}")
        print(f"Result: {result.predicted_direction}")
    except Exception as e:
        print(f"Failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Ensure Gemini API key is set if needed
    # os.environ["GOOGLE_API_KEY"] = "..." 
    asyncio.run(test())
