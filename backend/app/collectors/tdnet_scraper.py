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
    iframe の中身を直接取得するように修正。
    """
    logger.info("TDnet から開示情報を取得中 ticker=%s", ticker)

    # 現在の日付に基づいた iframe の URL を構築
    today_str = datetime.now().strftime("%Y%m%d")
    tdnet_list_url = f"https://www.release.tdnet.info/inbs/I_list_001_{today_str}.html"
    
    articles: list[TdnetArticle] = []

    try:
        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"},
        ) as client:
            resp = await client.get(tdnet_list_url)
            # もし当日の URL がなければメインを試す（前日分が表示されている可能性など）
            if resp.status_code != 200:
                resp = await client.get(TDNET_INDEX_URL)
            
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # 1. ページ内に iframe があるかチェック（メインページの場合）
        iframe = soup.find("iframe", id="main_list")
        if iframe and iframe.get("src"):
            iframe_url = TDNET_BASE_URL + iframe["src"]
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(iframe_url)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")

        # 2. テーブル（#main-list-table tr）を解析
        rows = soup.select("#main-list-table tr")
        if not rows:
            # フォールバック
            rows = soup.select("table tr")

        for row in rows:
            if len(articles) >= max_items:
                break
            article = _parse_disclosure_row(row, ticker)
            if article:
                articles.append(article)

    except Exception as exc:  # noqa: BLE001
        logger.exception("TDnet スクレイピング中にエラー: %s", exc)

    logger.info("TDnet: %d 件の開示情報を取得しました", len(articles))
    return articles


def _parse_disclosure_row(
    row: BeautifulSoup,
    ticker_filter: str | None,
) -> TdnetArticle | None:
    """HTML の行要素から TdnetArticle を生成します。"""
    try:
        # セル構造: kjTime, kjCode, kjName, kjTitle
        time_cell = row.select_one(".kjTime")
        code_cell = row.select_one(".kjCode")
        name_cell = row.select_one(".kjName")
        title_cell = row.select_one(".kjTitle")

        if not all([time_cell, code_cell, name_cell, title_cell]):
            # クラス名がない場合、td の順番で試す
            cells = row.find_all("td")
            if len(cells) < 4:
                return None
            time_text = cells[0].get_text(strip=True)
            code_text = cells[1].get_text(strip=True)[:4] # 4桁に制限
            company_text = cells[2].get_text(strip=True)
            title_tag = cells[3].find("a")
            title_text = cells[3].get_text(strip=True)
        else:
            time_text = time_cell.get_text(strip=True)
            code_text = code_cell.get_text(strip=True)[:4]
            company_text = name_cell.get_text(strip=True)
            title_tag = title_cell.find("a")
            title_text = title_cell.get_text(strip=True)

        # 証券コードフィルタ
        if ticker_filter and code_text and ticker_filter not in code_text:
            return None

        # リンク
        doc_url = ""
        doc_id = ""
        if title_tag and title_tag.get("href"):
            href = title_tag["href"]
            doc_url = href if href.startswith("http") else TDNET_BASE_URL + href
            doc_id = re.sub(r"[^A-Za-z0-9_-]", "", href.split("/")[-1].split(".")[0])

        # 日時
        try:
            today = datetime.today()
            if ":" in time_text:
                h, m = map(int, time_text.split(":"))
                published_at = today.replace(hour=h, minute=m, second=0, microsecond=0)
            else:
                published_at = today
        except Exception:
            published_at = datetime.now()

        return TdnetArticle(
            document_id=doc_id or f"tdnet_{hash(title_text)}",
            company_name=company_text,
            ticker=code_text,
            title=title_text,
            url=doc_url,
            published_at=published_at,
        )

    except Exception:
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
