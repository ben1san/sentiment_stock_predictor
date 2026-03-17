"""Reddit API コレクター。

PRAW（Python Reddit API Wrapper）を使用して、指定したサブレディットから
株式関連の投稿を取得します。
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import praw
import praw.exceptions

from app.config import get_settings
from app.models.schemas import RedditPost

logger = logging.getLogger(__name__)

# 株式投資関連の主要サブレディット
DEFAULT_SUBREDDITS = [
    "stocks",
    "investing",
    "wallstreetbets",
    "SecurityAnalysis",
    "JapanFinance",
]


def _build_reddit_client() -> praw.Reddit | None:
    """PRAW Reddit クライアントを構築します。

    環境変数が未設定の場合は None を返します。
    """
    settings = get_settings()
    if not settings.reddit_client_id or not settings.reddit_client_secret:
        logger.warning(
            "Reddit API 認証情報が設定されていません。"
            "REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET を .env に設定してください。"
        )
        return None

    return praw.Reddit(
        client_id=settings.reddit_client_id,
        client_secret=settings.reddit_client_secret,
        user_agent=settings.reddit_user_agent,
        # 読み取り専用モード
        read_only=True,
    )


async def fetch_reddit_posts(
    query: str,
    subreddits: list[str] | None = None,
    max_items: int = 20,
    sort: str = "relevance",
    time_filter: str = "week",
) -> list[RedditPost]:
    """Reddit から株式関連の投稿を検索して取得します。

    Args:
        query: 検索クエリ（例: "Toyota stock", "7203.T"）。
        subreddits: 対象サブレディットのリスト。None の場合はデフォルト一覧を使用。
        max_items: 最大取得件数。
        sort: ソート順（"relevance", "hot", "top", "new", "comments"）。
        time_filter: 時間フィルタ（"all", "year", "month", "week", "day", "hour"）。

    Returns:
        RedditPost のリスト。
    """
    subreddits = subreddits or DEFAULT_SUBREDDITS
    subreddit_str = "+".join(subreddits)

    logger.info(
        "Reddit から投稿を取得中 query=%r subreddits=%s", query, subreddit_str
    )

    # 同期 PRAW を asyncio.to_thread でノンブロッキングに実行
    try:
        posts = await asyncio.to_thread(
            _sync_fetch_posts,
            query=query,
            subreddit_str=subreddit_str,
            max_items=max_items,
            sort=sort,
            time_filter=time_filter,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Reddit 投稿の取得に失敗しました: %s", exc)
        posts = []

    logger.info("Reddit: %d 件の投稿を取得しました", len(posts))
    return posts


def _sync_fetch_posts(
    query: str,
    subreddit_str: str,
    max_items: int,
    sort: str,
    time_filter: str,
) -> list[RedditPost]:
    """同期処理で Reddit 検索を実行します（asyncio.to_thread から呼び出す）。"""
    reddit = _build_reddit_client()
    if reddit is None:
        return _get_mock_posts(query)

    posts: list[RedditPost] = []
    try:
        subreddit = reddit.subreddit(subreddit_str)
        results = subreddit.search(
            query,
            sort=sort,
            time_filter=time_filter,
            limit=max_items,
        )

        for submission in results:
            posts.append(
                RedditPost(
                    post_id=submission.id,
                    title=submission.title,
                    body=submission.selftext[:2000] if submission.selftext else None,
                    score=submission.score,
                    num_comments=submission.num_comments,
                    subreddit=str(submission.subreddit),
                    url=f"https://www.reddit.com{submission.permalink}",
                    created_at=datetime.fromtimestamp(
                        submission.created_utc, tz=timezone.utc
                    ),
                )
            )
    except praw.exceptions.PRAWException as exc:
        logger.error("PRAW エラー: %s", exc)

    return posts


def _get_mock_posts(query: str) -> list[RedditPost]:
    """API 未設定時のモックデータを返します（開発・テスト用）。"""
    logger.info("Reddit API 未設定のためモックデータを使用します")
    now = datetime.now(tz=timezone.utc)
    return [
        RedditPost(
            post_id="mock_001",
            title=f"[Mock] {query} - Strong fundamentals observed this quarter",
            body="This is mock data. Please configure Reddit API credentials in .env",
            score=150,
            num_comments=42,
            subreddit="stocks",
            url="https://www.reddit.com/r/stocks/mock",
            created_at=now,
        ),
        RedditPost(
            post_id="mock_002",
            title=f"[Mock] {query} analyst upgrades price target",
            body="Mock: Analysts have raised their price target significantly.",
            score=89,
            num_comments=17,
            subreddit="investing",
            url="https://www.reddit.com/r/investing/mock",
            created_at=now,
        ),
    ]


async def fetch_hot_posts(
    subreddit_name: str = "stocks",
    max_items: int = 10,
) -> list[RedditPost]:
    """指定サブレディットのホット投稿を取得します。"""
    logger.info("r/%s のホット投稿を取得中", subreddit_name)

    try:
        posts = await asyncio.to_thread(
            _sync_fetch_hot, subreddit_name=subreddit_name, max_items=max_items
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("ホット投稿の取得に失敗しました: %s", exc)
        posts = []

    return posts


def _sync_fetch_hot(subreddit_name: str, max_items: int) -> list[RedditPost]:
    """同期処理でホット投稿を取得します。"""
    reddit = _build_reddit_client()
    if reddit is None:
        return []

    posts: list[RedditPost] = []
    subreddit = reddit.subreddit(subreddit_name)
    for submission in subreddit.hot(limit=max_items):
        posts.append(
            RedditPost(
                post_id=submission.id,
                title=submission.title,
                body=submission.selftext[:2000] if submission.selftext else None,
                score=submission.score,
                num_comments=submission.num_comments,
                subreddit=subreddit_name,
                url=f"https://www.reddit.com{submission.permalink}",
                created_at=datetime.fromtimestamp(
                    submission.created_utc, tz=timezone.utc
                ),
            )
        )
    return posts


# ──────────────────────────────────────────
# デバッグ用エントリポイント
# ──────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)

    async def _debug() -> None:
        posts = await fetch_reddit_posts("Toyota", max_items=5)
        for p in posts:
            print(p.model_dump_json(indent=2))

    asyncio.run(_debug())
