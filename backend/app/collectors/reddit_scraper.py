"""Reddit 投稿収集モジュール。

PRAW (Python Reddit API Wrapper) を使用して、指定した銘柄に関する投稿を収集します。
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta

import praw

from app.config import get_settings
from app.models.schemas import RedditPost

logger = logging.getLogger(__name__)


async def fetch_reddit_posts_window(
    query: str,
    start_time: datetime,
    max_items: int = 10,
    initial_window_hours: int = 24,
    max_window_hours: int = 168,  # 最大1週間
) -> list[RedditPost]:
    """特定の開始日時から時間枠を広げながら投稿を収集します。

    Args:
        query: 検索クエリ。
        start_time: 検索の基準となる開始日時（TDnet開示時刻）。
        max_items: 最大取得件数。
        initial_window_hours: 初期の時間枠（時間）。
        max_window_hours: 最大の時間枠（時間）。
    """
    settings = get_settings()
    if not settings.reddit_client_id or not settings.reddit_client_secret:
        return []

    window = initial_window_hours
    results: list[RedditPost] = []

    while window <= max_window_hours:
        logger.info("Reddit 検索中 (Window: %dh): query=%s", window, query)
        
        # PRAW で検索実行（sort="new" で最新から取得し、時間でフィルタリング）
        try:
            reddit = praw.Reddit(
                client_id=settings.reddit_client_id,
                client_secret=settings.reddit_client_secret,
                user_agent=settings.reddit_user_agent,
            )

            loop = asyncio.get_event_loop()
            # 検索時は余裕を持って多めに取得し、コード側で時間フィルタリング
            posts = await loop.run_in_executor(
                None,
                lambda: list(reddit.subreddit("all").search(
                    query, 
                    limit=max_items * 5,
                    sort="new",
                    time_filter="month" # 十分な範囲を指定
                ))
            )

            # 時間フィルタリング: [start_time, start_time + window]
            end_time = start_time.replace(tzinfo=timezone.utc) if start_time.tzinfo is None else start_time
            end_limit = end_time.timestamp() + (window * 3600)
            start_limit = end_time.timestamp()

            for post in posts:
                created_utc = post.created_utc
                # 開示後からウィンドウ終了までの投稿を抽出
                if start_limit <= created_utc <= end_limit:
                    if len(results) >= max_items:
                        break
                    results.append(
                        RedditPost(
                            post_id=post.id,
                            title=post.title,
                            body=getattr(post, "selftext", "")[:1000],
                            score=post.score,
                            num_comments=post.num_comments,
                            subreddit=post.subreddit.display_name,
                            url=f"https://www.reddit.com{post.permalink}",
                            created_at=datetime.fromtimestamp(created_utc, tz=timezone.utc),
                        )
                    )
            
            if results:
                logger.info("Reddit: Window %dh で %d 件ヒット", window, len(results))
                break
            
            # ヒットしなければウィンドウを拡大
            window += 24
            
        except Exception as exc:
            logger.error("Reddit 検索ループエラー: %s", exc)
            break

    return results


# ──────────────────────────────────────────
# デバッグ用エントリポイント
# ──────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    async def _debug() -> None:
        posts = await fetch_reddit_posts_window("Toyota", start_time=datetime.now() - timedelta(days=7), max_items=5)
        for p in posts:
            print(f"[{p.subreddit}] {p.title} (Score: {p.score})")
            print(f" URL: {p.url}")
            print("-" * 40)

    asyncio.run(_debug())
