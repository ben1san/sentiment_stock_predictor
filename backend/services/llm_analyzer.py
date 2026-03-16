import os
import json
import logging
import requests
import asyncio
from io import BytesIO
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key or api_key == "YOUR_ACTUAL_API_KEY_HERE":
    logger.warning("GEMINI_API_KEY is not set correctly. AI analysis will fail or use mock.")
    genai.configure(api_key="DUMMY_KEY") # Prevent crash on load
else:
    genai.configure(api_key=api_key)

# Use the latest fast multimodal model for hackathon
MODEL_NAME = 'gemini-3-flash-preview'

def download_image(url: str) -> Image.Image | None:
    """Downloads an image from URL and converts it to PIL Image in memory."""
    if not url:
        return None
    try:
        # User-Agent is required even for image downloads sometimes
        headers = {'User-Agent': 'macos:hellowallstreet.app:v1.0.0 (by /u/hackathon)'}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return Image.open(BytesIO(response.content))
    except Exception as e:
        logger.warning(f"Failed to download image from {url}: {e}")
        return None

async def analyze_wsb_post(title: str, body: str, image_url: str = None, finbert_label: str = "Unknown", finbert_score: float = 0.0) -> dict:
    """Analyzes Reddit post (text+image) using Gemini 3 Flash and returns JSON."""
    
    # Robustness: Mock fallback if API key is missing or mock mode is on
    if not os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") == "YOUR_ACTUAL_API_KEY_HERE" or os.getenv("USE_MOCK_DATA", "False") == "True":
        logger.info("[MOCK] Returning mock AI analysis.")
        return {
            "sentiment": "Bullish",
            "apeConvictionScore": 99,
            "aiCommentary": "[MOCK] Can't read text, image looks like a green crayon. FULL PORT NVDA!",
            "is_mock": True
        }

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        # System prompt defined within the call to include FinBERT context
        system_prompt = f"""
        You are "Hello, Wall Street.", a highly analytical yet completely degenerate AI trading algorithm born in r/wallstreetbets.
        Analyze the provided Reddit post (title, body, and attached image if any).
        The image might be a meme or a screenshot of a portfolio/chart.
        
        You act as an ensemble layer. We have already run a quantitative financial model (FinBERT) on the text.
        FinBERT Model Analysis: {{finbert_label}} with confidence {{finbert_score:.2f}}
        
        Task:
        1. Determine the final ensemble sentiment towards the specific stock ticker mentioned: "Bullish", "Bearish", or "Neutral". Weigh the FinBERT score against the context (e.g., meme images might flip the sentiment).
        2. Assess "apeConvictionScore" (0 to 100). Higher means more degenerate conviction.
        3. Provide "aiCommentary": a short WSB-style comment about why you agreed or disagreed with FinBERT based on the multimodal context.
        
        Output strictly in valid JSON format matching this schema exactly:
        {{{{
            "sentiment": "string",
            "apeConvictionScore": 0,
            "aiCommentary": "string"
        }}}}
        """
        
        # Construct multimodal contents
        user_context = f"Post Title: {title}\nPost Body: {body}"
        contents = [system_prompt, user_context]
        
        # Process image if URL exists - use asyncio.to_thread to prevent blocking
        if image_url:
            image = await asyncio.to_thread(download_image, image_url)
            if image:
                contents.append(image)
                logger.info(f"Including image in Gemini analysis for post: {title[:20]}...")

        # Force JSON response via generation config - use async method
        response = await model.generate_content_async(
            contents,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Parse the JSON string result
        return json.loads(response.text)

    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        return {
            "sentiment": "Unknown",
            "apeConvictionScore": 0,
            "aiCommentary": f"My brain is smooth, API errored out: {str(e)}",
            "error": True
        }