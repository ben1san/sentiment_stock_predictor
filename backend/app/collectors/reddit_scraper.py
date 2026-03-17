"""Reddit 投稿収集モジュール。

PRAW (Python Reddit API Wrapper) を使用して、指定した銘柄に関する投稿を収集します。
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import praw

from app.config import get_settings
from app.models.schemas import RedditPost

logger = logging.getLogger(__name__)


async def fetch_reddit_posts(
    query: str,
    max_items: int = 10,
    subreddits: list[str] | None = None,
) -> list[RedditPost]:
    """Reddit からキーワードに関連する投稿を取得します。

    Args:
        query: 検索キーワード（会社名やティッカー）。
        max_items: 最大取得件数。
        subreddits: 検索対象のサブレディット。None の場合は全て。

    Returns:
        RedditPost のリスト。
    """
    settings = get_settings()

    if not settings.reddit_client_id or not settings.reddit_client_secret:
        logger.warning("Reddit API の認証情報が設定されていません。投稿の収集をスキップします。")
        return []

    logger.info("Reddit から投稿を取得中: query=%s", query)

    # PRAW は同期ライブラリなので、別スレッドで実行することを検討するか、
    # 本格的な運用の場合は aio-praw への切り替えを推奨。
    # ここではシンプルにするため、同期メソッドをラップして実行（将来的に aio-praw も検討）。
    
    try:
        # PRAW クライアント初期化
        reddit = praw.Reddit(
            client_id=settings.reddit_client_id,
            client_secret=settings.reddit_client_secret,
            user_agent=settings.reddit_user_agent,
        )

        loop = asyncio.get_event_loop()
        posts = await loop.run_in_executor(
            None,
            lambda: list(reddit.subreddit("all").search(
                query, 
                limit=max_items,
                sort="relevance",
                time_filter="week"
            ))
        )

        results: list[RedditPost] = []
        for post in posts:
            results.append(
                RedditPost(
                    post_id=post.id,
                    title=post.title,
                    body=getattr(post, "selftext", "")[:1000],  # 本文（先頭 1000 文字）
                    score=post.score,
                    num_comments=post.num_comments,
                    subreddit=post.subreddit.display_name,
                    url=f"https://www.reddit.com{post.permalink}",
                    created_at=datetime.fromtimestamp(post.created_utc, tz=timezone.utc),
                )
            )

        logger.info("Reddit: %d 件の投稿を取得しました", len(results))
        return results

    except Exception as exc:
        logger.error("Reddit API エラー: %s", exc)
        return []


# ──────────────────────────────────────────
# デバッグ用エントリポイント
# ──────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    async def _debug() -> None:
        posts = await fetch_reddit_posts("Toyota", max_items=5)
        for p in posts:
            print(f"[{p.subreddit}] {p.title} (Score: {p.score})")
            print(f" URL: {p.url}")
            print("-" * 40)

    asyncio.run(_debug())
