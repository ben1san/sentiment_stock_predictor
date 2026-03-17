"use client";

import React, { useState, useCallback, useEffect } from "react";
import { fetchPrediction } from "@/lib/api";
import type { PredictionResponse } from "@/types/api";
import StockPriceCard from "@/components/StockPriceCard";
import PriceChart from "@/components/PriceChart";
import NewsList from "@/components/NewsList";
import SearchBar from "@/components/SearchBar";
import AIAnalysisEngine from "@/components/AIAnalysisEngine";

/* ── トヨタ(7203)ダミーデータ ── */
const DUMMY_DATA: PredictionResponse = {
  ticker: "7203.T",
  company_name: "トヨタ自動車",
  current_price: 28450,
  predicted_direction: "up",
  predicted_change_pct: 2.34,
  confidence: 0.78,
  sentiment_score: 0.62,
  sentiment_label: "positive",
  sentiment_summary:
    "トヨタ自動車（7203）は、第3四半期において過去最高の増益を記録しました。TDnet適時開示によると、電動化戦略の加速とコスト削減施策が奏功し、営業利益が前年同期比28%増加。北米市場でのBullish Breakoutが確認されており、ハイブリッド車需要の急増が続いています。パブリックセンチメント分析でも強気のシグナルが支配的で、特に機関投資家による買い圧力が高まっています。Profit Increase の継続と堅調な受注残を踏まえると、中期的な上昇トレンドの継続が見込まれます。",
  news_articles: [
    {
      title: "トヨタ、第3四半期営業利益が過去最高更新 — 電動化戦略が奏功",
      score: 0.85,
      label: "positive",
      explanation: "電動化への大規模投資と北米市場での販売増が利益を押し上げた。",
      source: "TDnet",
    },
    {
      title: "トヨタ自動車、2024年度通期業績予想を上方修正",
      score: 0.72,
      label: "positive",
      explanation: "円安と北米販売好調を受け、通期営業利益を4.7兆円に上方修正。",
      source: "TDnet",
    },
    {
      title: "ハイブリッド車の世界需要が急増、トヨタに追い風",
      score: 0.61,
      label: "positive",
      explanation: "欧米でのハイブリッド車需要増加がトヨタの販売台数を押し上げている。",
      source: "Public",
    },
    {
      title: "半導体供給の一部回復でトヨタの生産制約が緩和",
      score: 0.45,
      label: "positive",
      explanation: "車載半導体の供給改善により、生産台数の増加が見込まれる。",
      source: "Public",
    },
  ],
  price_history: Array.from({ length: 30 }, (_, i) => {
    const base = 27200 + i * 40;
    const noise = (Math.random() - 0.4) * 300;
    return {
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      open: Math.round(base + noise - 50),
      high: Math.round(base + noise + 150),
      low: Math.round(base + noise - 200),
      close: Math.round(base + noise),
      volume: Math.round(8000000 + Math.random() * 4000000),
    };
  }),
  generated_at: new Date().toISOString(),
};

export default function DashboardPage() {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(DUMMY_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (ticker: string, days: number) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const data = await fetchPrediction(ticker, days);
      setPrediction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05080A",
        position: "relative",
      }}
    >
      {/* サイバーグリッド背景 */}
      <div
        className="cyber-grid"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.4,
        }}
      />

      {/* 背景ブルーム */}
      <div
        style={{
          position: "fixed",
          top: "10%",
          left: "5%",
          width: "500px",
          height: "400px",
          background: "radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "10%",
          right: "5%",
          width: "400px",
          height: "300px",
          background: "radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── ナビゲーション ── */}
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px)",
          background: "rgba(5,8,10,0.9)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "1440px",
            margin: "0 auto",
            padding: "0 32px",
            height: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* ロゴ */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "9px",
                background: "linear-gradient(135deg, #0f3460, #38bdf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                boxShadow: "0 0 20px rgba(56,189,248,0.3)",
              }}
            >
              📊
            </div>
            <div>
              <h1
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                  letterSpacing: "0.02em",
                }}
              >
                Sentiment Stock Predictor
              </h1>
              <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                AI-POWERED MARKET ANALYSIS
              </p>
            </div>
          </div>

          {/* ステータスバッジ */}
          <nav style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.25)",
                color: "#34d399",
                borderRadius: "6px",
                padding: "4px 12px",
                fontSize: "0.68rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                letterSpacing: "0.05em",
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  background: "#34d399",
                  borderRadius: "50%",
                  display: "inline-block",
                  boxShadow: "0 0 6px #34d399",
                }}
                className="animate-pulse-glow"
              />
              GEMINI AI LIVE
            </span>
            <span
              style={{
                background: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(56,189,248,0.2)",
                color: "#38bdf8",
                borderRadius: "6px",
                padding: "4px 12px",
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              TDnet CONNECTED
            </span>
          </nav>
        </div>
      </header>

      {/* ── メインコンテンツ ── */}
      <main
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "28px 32px 60px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* ── 左サイドバー：検索 ── */}
          <aside style={{ position: "sticky", top: "80px" }}>
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </aside>

          {/* ── 右カラム：メインダッシュボード ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>

            {/* ローディング状態 */}
            {isLoading && <ScanningState />}

            {/* エラー */}
            {error && !isLoading && <ErrorState message={error} />}

            {/* 初期状態（ダミーデータなし＆検索前） */}
            {!prediction && !isLoading && !error && <EmptyState />}

            {/* 結果表示 */}
            {prediction && !isLoading && (
              <>
                {/* ── ① メインエリア: 株価 + センチメントゲージ 3カラム ── */}
                <StockPriceCard data={prediction} />

                {/* ── ② 株価チャート ── */}
                <PriceChart prices={prediction.price_history} ticker={prediction.ticker} />

                {/* ── ③ AIアナリストエンジン (Full Width) ── */}
                <AIAnalysisEngine
                  summary={prediction.sentiment_summary}
                  ticker={prediction.ticker}
                  direction={prediction.predicted_direction}
                  confidence={prediction.confidence}
                  sentimentScore={prediction.sentiment_score}
                />

                {/* ── ④ ニュースリスト ── */}
                <NewsList articles={prediction.news_articles} />
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── フッター ── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "20px 32px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.72rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p>
          Sentiment Stock Predictor &copy; 2026 —{" "}
          <span className="neon-text-blue">Gemini AI</span> ・ yfinance ・ TDnet
        </p>
        <p style={{ marginTop: "4px", opacity: 0.6 }}>
          本ツールは投資助言ではありません。投資判断は自己責任でお願いします。
        </p>
      </footer>
    </div>
  );
}

/* ── スキャン中状態 ── */
function ScanningState() {
  const [scanLine, setScanLine] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setScanLine((s) => (s + 1) % 4), 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="glass-card"
      style={{ padding: "48px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}
    >
      {/* スキャンライン */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: "linear-gradient(90deg, transparent, #38bdf8, #34d399, transparent)",
          animation: "scan 2s linear infinite",
        }}
      />

      <div
        style={{
          width: "56px",
          height: "56px",
          border: "2px solid rgba(56,189,248,0.15)",
          borderTopColor: "var(--accent-blue)",
          borderRightColor: "var(--accent-emerald)",
          borderRadius: "50%",
          margin: "0 auto 20px",
        }}
        className="animate-spin-slow"
      />

      <p
        style={{
          color: "var(--text-primary)",
          fontWeight: 700,
          fontSize: "1rem",
          marginBottom: "8px",
          letterSpacing: "0.02em",
        }}
      >
        AI解析システム起動中
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "24px" }}>
        TDnet適時開示データを収集し、Gemini AIがセンチメント分析を実行しています
      </p>

      {/* ステップ表示 */}
      {["TDnetスクレイピング中...", "センチメント解析中...", "株価データ取得中...", "AI予測生成中..."].map(
        (step, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center",
              margin: "6px 0",
              opacity: i <= scanLine ? 1 : 0.3,
              transition: "opacity 0.3s",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: i < scanLine ? "#34d399" : i === scanLine ? "#38bdf8" : "rgba(255,255,255,0.2)",
                display: "inline-block",
                boxShadow: i <= scanLine ? "0 0 8px currentColor" : "none",
              }}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "'Courier New', monospace" }}>
              {step}
            </span>
          </div>
        )
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="glass-card glow-red"
      style={{ padding: "32px", textAlign: "center", borderColor: "rgba(244,63,94,0.3)" }}
    >
      <p style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</p>
      <p style={{ color: "#f43f5e", fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}>
        エラーが発生しました
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "12px" }}>
        {message}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
        バックエンドが起動しているか確認してください（python main.py）
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card" style={{ padding: "72px 32px", textAlign: "center" }}>
      <div
        style={{
          width: "72px",
          height: "72px",
          margin: "0 auto 20px",
          borderRadius: "50%",
          background: "rgba(56,189,248,0.06)",
          border: "1px solid rgba(56,189,248,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
        }}
      >
        📈
      </div>
      <p
        style={{
          color: "var(--text-primary)",
          fontWeight: 700,
          fontSize: "1.1rem",
          marginBottom: "8px",
        }}
      >
        銘柄を検索してください
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
        左側の検索フォームにティッカーを入力し、
        <br />
        「AI予測を実行」を押すと分析が始まります。
      </p>
    </div>
  );
}
