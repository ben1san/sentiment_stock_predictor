"""TDnet（適時開示情報閲覧サービス）スクレイパー。

TDnet の公開ページから企業の開示情報を収集します。
本モジュールは雛形（MVP）実装です。
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

from app.models.schemas import TdnetArticle

logger = logging.getLogger(__name__)

# TDnet 適時開示情報閲覧サービス
TDNET_INDEX_URL = "https://www.release.tdnet.info/inbs/I_main_00.html"
TDNET_BASE_URL = "https://www.release.tdnet.info/inbs/"


async def fetch_latest_disclosures(
    ticker: str | None = None,
    max_items: int = 20,
) -> list[TdnetArticle]:
    """TDnet から最新の適時開示情報を取得します。

    Args:
        ticker: 絞り込む証券コード（例: "7203"）。None の場合は全件取得。
        max_items: 最大取得件数。

    Returns:
        TdnetArticle のリスト。
    """
    logger.info("TDnet から開示情報を取得中 ticker=%s", ticker)

    articles: list[TdnetArticle] = []

    try:
        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={"User-Agent": "SentimentStockPredictor/1.0 (research)"},
        ) as client:
            resp = await client.get(TDNET_INDEX_URL)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # TDnet の開示一覧テーブルを解析
        rows = soup.select("table.I_main-table tr")
        if not rows:
            # フォールバック: div ベースのレイアウトに対応
            rows = soup.select("div.I_main-index")
            logger.warning("テーブル形式が変更されている可能性があります。div をフォールバックとして使用します。")

        for row in rows[:max_items]:
            article = _parse_disclosure_row(row, ticker)
            if article:
                articles.append(article)

    except httpx.HTTPStatusError as exc:
        logger.error("TDnet HTTP エラー: %s", exc)
    except httpx.RequestError as exc:
        logger.error("TDnet 接続エラー: %s", exc)
    except Exception as exc:  # noqa: BLE001
        logger.exception("TDnet スクレイピング中の予期しないエラー: %s", exc)

    logger.info("TDnet: %d 件の開示情報を取得しました", len(articles))
    return articles


def _parse_disclosure_row(
    row: BeautifulSoup,
    ticker_filter: str | None,
) -> TdnetArticle | None:
    """HTML の行要素から TdnetArticle を生成します。"""
    try:
        cells = row.find_all("td")
        if len(cells) < 4:
            return None

        # セル構造: [時刻, 証券コード, 会社名, タイトル, (更新フラグ)]
        time_text = cells[0].get_text(strip=True)
        code_text = cells[1].get_text(strip=True)
        company_text = cells[2].get_text(strip=True)
        title_text = cells[3].get_text(strip=True)

        # 証券コードフィルタ
        if ticker_filter and code_text and ticker_filter not in code_text:
            return None

        # リンク取得
        link_tag = cells[3].find("a")
        doc_url = ""
        doc_id = ""
        if link_tag and link_tag.get("href"):
            href = link_tag["href"]
            doc_url = href if href.startswith("http") else TDNET_BASE_URL + href
            # ドキュメント ID をパス末尾から抽出
            doc_id = re.sub(r"[^A-Za-z0-9_-]", "", href.split("/")[-1].split(".")[0])

        # 日時パース（形式: HH:MM または YYYY/MM/DD HH:MM）
        try:
            today = datetime.today()
            if ":" in time_text and "/" not in time_text:
                h, m = map(int, time_text.split(":"))
                published_at = today.replace(hour=h, minute=m, second=0, microsecond=0)
            else:
                published_at = datetime.strptime(time_text, "%Y/%m/%d %H:%M")
        except ValueError:
            published_at = datetime.now()

        return TdnetArticle(
            document_id=doc_id or f"tdnet_{hash(title_text)}",
            company_name=company_text or "不明",
            ticker=code_text or None,
            title=title_text or "（タイトルなし）",
            url=doc_url,
            published_at=published_at,
        )

    except Exception as exc:  # noqa: BLE001
        logger.debug("行のパースに失敗: %s", exc)
        return None


async def fetch_disclosure_text(url: str) -> str:
    """開示文書の本文テキストを取得します。

    Args:
        url: 開示文書の URL。

    Returns:
        テキスト本文（HTML タグを除去済み）。
    """
    if not url:
        return ""

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            # スクリプト・スタイルを除去してテキスト取得
            for tag in soup(["script", "style", "nav", "header", "footer"]):
                tag.decompose()
            return soup.get_text(separator="\n", strip=True)[:5000]  # 最大 5000 文字
    except Exception as exc:  # noqa: BLE001
        logger.error("開示文書の取得に失敗: %s", exc)
        return ""


# ──────────────────────────────────────────
# デバッグ用エントリポイント
# ──────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)

    async def _debug() -> None:
        articles = await fetch_latest_disclosures(max_items=5)
        for a in articles:
            print(a.model_dump_json(indent=2))

    asyncio.run(_debug())
