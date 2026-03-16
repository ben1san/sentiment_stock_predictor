import os
import json
import logging
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

MOCK_FILE_PATH = "data/mock_wsb_data.json"

def fetch_reddit_posts(ticker: str = "NVDA", limit: int = 10) -> list:
    use_mock = os.getenv("USE_MOCK_DATA", "False") == "True"

    if use_mock:
        logger.info("[SAFE MODE] Loading mock WSB data.")
        with open(MOCK_FILE_PATH, "r") as f:
            return json.load(f)

    # プランB: APIキー不要の .json エンドポイントを直接叩く
    # restrict_sr=1 でサブレディット内検索に限定
    url = f"https://www.reddit.com/r/wallstreetbets/search.json?q={ticker}&restrict_sr=1&sort=new&limit={limit}"
    
    # Redditに弾かれないよう、適当なUser-Agentを設定（必須）
    headers = {
        'User-Agent': 'macos:hellowallstreet.hackathon:v1.0 (by /u/che_vi)'
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status() # エラーなら例外を投げる
        
        data = response.json()
        posts_data = []
        
        # JSONの構造をパースして必要な情報だけ抽出
        for child in data.get('data', {}).get('children', []):
            post = child.get('data', {})
            post_url = post.get('url', '')
            
            # 画像かどうかの判定
            is_image = bool(post_url) and any(
                domain in post_url.lower() for domain in ['i.redd.it', 'imgur.com', '.jpg', '.png', '.jpeg']
            )
            
            posts_data.append({
                "Date": datetime.utcfromtimestamp(post.get('created_utc', 0)).strftime('%Y-%m-%d %H:%M:%S'),
                "Title": post.get('title', ''),
                "Body": post.get('selftext', ''),
                "Score": post.get('score', 0),
                "URL": post_url if is_image else None,
                "Is_Meme": is_image
            })
            
        return posts_data

    except Exception as e:
        logger.error(f"Reddit JSON Fetch Error: {e}. Falling back to mock data.")
        # 429 Too Many Requests 等で弾かれたら、即座にモックに切り替えてデモを死守
        with open(MOCK_FILE_PATH, "r") as f:
            return json.load(f)