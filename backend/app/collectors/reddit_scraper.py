"""Reddit 投稿収集モジュール。

APIキー不要の .json エンドポイントを使用して、指定した銘柄に関する投稿を収集します。
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
import requests

from app.models.schemas import RedditPost

logger = logging.getLogger(__name__)

MOCK_FILE_PATH = "data/mock_wsb_data.json"

async def fetch_reddit_posts(
    query: str,
    max_items: int = 10,
    subreddits: list[str] | None = None,
) -> list[RedditPost]:
    """Reddit からキーワードに関連する投稿を取得します（APIキー不要の JSON エンドポイント使用）。

    Args:
        query: 検索キーワード（会社名やティッカー）。
        max_items: 最大取得件数。
        subreddits: 検索対象のサブレディット。None の場合は全て。

    Returns:
        RedditPost のリスト。
    """
    logger.info("Reddit から投稿を取得中: query=%s", query)

    # 検索対象を特定のサブレディットに絞る（デフォルトで r/wallstreetbets）
    # restrict_sr=1 でサブレディット内検索に限定
    subreddit_path = f"r/{subreddits[0]}/" if subreddits else "r/wallstreetbets/"
    url = f"https://www.reddit.com/{subreddit_path}search.json?q={query}&restrict_sr=1&sort=new&limit={max_items}"
    
    # Redditに弾かれないよう、適当なUser-Agentを設定（必須）
    headers = {
        'User-Agent': 'macos:hellowallstreet.hackathon:v1.0 (by /u/che_vi)'
    }

    try:
        response = await asyncio.to_thread(requests.get, url, headers=headers, timeout=10)
        response.raise_for_status() # エラーなら例外を投げる
        
        data = response.json()
        posts_data: list[RedditPost] = []
        
        # JSONの構造をパースして必要な情報だけ抽出
        for child in data.get('data', {}).get('children', []):
            post = child.get('data', {})
            post_url = post.get('url', '')
            
            # TODO: Add logic to extract image URL for schemas that support it, 
            # or pass url intact if RedditPost schema can use it.
            
            created_at_val = post.get('created_utc', 0)
            
            posts_data.append(
                RedditPost(
                    post_id=post.get('id', ''),
                    title=post.get('title', ''),
                    body=post.get('selftext', '')[:1000],  # 本文（先頭 1000 文字）
                    score=post.get('score', 0),
                    num_comments=post.get('num_comments', 0),
                    subreddit=post.get('subreddit', 'wallstreetbets'),
                    url=f"https://www.reddit.com{post.get('permalink', '')}" if not post_url.startswith('https') else post_url,
                    created_at=datetime.fromtimestamp(created_at_val, tz=timezone.utc),
                )
            )
            
        logger.info("Reddit: %d 件の投稿を取得しました", len(posts_data))
        return posts_data

    except Exception as exc:
        logger.error("Reddit JSON Fetch Error: %s. Falling back to mock data.", exc)
        try:
            with open(MOCK_FILE_PATH, "r") as f:
                mock_data = json.load(f)
                return [
                    RedditPost(
                        post_id="mock",
                        title=d.get("Title", ""),
                        body=d.get("Body", ""),
                        score=d.get("Score", 0),
                        num_comments=0,
                        subreddit="wallstreetbets",
                        url=d.get("URL", ""),
                        created_at=datetime.utcnow()
                    )
                    for d in mock_data
                ][:max_items]
        except Exception as mock_exc:
            logger.error("モックデータの読み込みにも失敗しました: %s", mock_exc)
            return []


# ──────────────────────────────────────────
# デバッグ用エントリポイント
# ──────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    async def _debug() -> None:
        posts = await fetch_reddit_posts("NVDA", max_items=5)
        for p in posts:
            print(f"[{p.subreddit}] {p.title} (Score: {p.score})")
            print(f" URL: {p.url}")
            print("-" * 40)

    asyncio.run(_debug())
