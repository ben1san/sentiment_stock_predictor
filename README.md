# Sentiment Stock Predictor

AIとセンチメント分析によって日本株・米国株の株価方向性を予測するWebアプリケーション。

## アーキテクチャ

```
sentiment_stock_predictor/
├── backend/                    # Python / FastAPI バックエンド
│   ├── app/
│   │   ├── main.py             # FastAPI アプリ定義
│   │   ├── config.py           # 環境変数管理
│   │   ├── collectors/
│   │   │   ├── tdnet_scraper.py    # TDnet 適時開示スクレイパー
│   │   │   └── reddit_api.py       # Reddit API コレクター
│   │   ├── services/
│   │   │   ├── sentiment_analyzer.py  # Gemini API センチメント分析
│   │   │   └── stock_fetcher.py       # yfinance 株価取得
│   │   ├── ml/
│   │   │   ├── model.py        # 特徴量エンジニアリング
│   │   │   └── predict.py      # 予測ロジック
│   │   ├── routers/
│   │   │   ├── predict.py      # /api/predict
│   │   │   ├── sentiment.py    # /api/sentiment
│   │   │   └── stocks.py       # /api/stocks
│   │   └── models/
│   │       └── schemas.py      # Pydantic スキーマ定義
│   ├── main.py                 # エントリポイント
│   ├── pyproject.toml
│   └── .env                    # ← GitHub に上げないこと！
├── frontend/                   # Next.js フロントエンド
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # ダッシュボード
│   │   └── globals.css
│   ├── src/
│   │   ├── components/
│   │   │   ├── PredictionCard.tsx  # 予測結果カード
│   │   │   ├── PriceChart.tsx      # 株価チャート (SVG)
│   │   │   ├── NewsList.tsx        # ニュース一覧
│   │   │   └── SearchBar.tsx       # 検索フォーム
│   │   ├── lib/
│   │   │   └── api.ts          # API クライアント
│   │   └── types/
│   │       └── api.ts          # TypeScript 型定義
│   └── .env.local              # ← GitHub に上げないこと！
└── vercel.json                 # Vercel デプロイ設定
```

## セットアップ

### 1. 環境変数の設定

```bash
# backend/.env を作成（.gitignore に含まれているためコミットされません）
cp backend/.env.example backend/.env
# GEMINI_API_KEY, REDDIT_CLIENT_ID などを設定

# frontend/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
```

### 2. バックエンド起動

```bash
cd backend
uv sync          # 依存関係インストール（uv 使用）
# または: pip install -e .
python main.py   # http://localhost:8000 で起動
# API ドキュメント: http://localhost:8000/docs
```

### 3. フロントエンド起動

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000 で起動
```

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/health` | ヘルスチェック |
| GET | `/api/predict/quick?ticker=7203.T` | 株価予測（簡易） |
| POST | `/api/predict/` | 株価予測（詳細リクエスト） |
| POST | `/api/sentiment/analyze` | センチメント一括分析 |
| GET | `/api/stocks/{ticker}` | 株価データ取得 |

## 使用技術

- **Frontend**: Next.js 16 / React 19 / TypeScript / Tailwind CSS
- **Backend**: Python 3.13 / FastAPI / Uvicorn
- **AI**: Google Gemini API (`gemini-1.5-flash`)
- **株価データ**: yfinance
- **情報収集**: TDnet スクレイパー / PRAW (Reddit)
- **Deployment**: Vercel

## デプロイ (Vercel)

```bash
# フロントエンドをデプロイ
cd frontend
vercel --prod

# バックエンドは別途 Vercel Serverless Functions または
# Railway / Render 等にデプロイ後、NEXT_PUBLIC_API_URL を更新
```

## ⚠️ 免責事項

本ツールは投資助言を目的としておりません。投資判断は必ず自己責任で行ってください。