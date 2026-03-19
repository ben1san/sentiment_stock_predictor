"use client";

import React, { useState, useCallback } from "react";
import { fetchPrediction } from "@/lib/api";
import type { PredictionResponse } from "@/types/api";
import PredictionCard from "@/components/PredictionCard";
import AIAnalysisEngine from "@/components/AIAnalysisEngine";
import PriceChart from "@/components/PriceChart";
import SentimentGauge from "@/components/SentimentGauge";
import SentimentReasoning from "@/components/SentimentReasoning";
import CyberSearchBar from "@/components/SearchBar";

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
    "トヨタ自動車（7203）は、第3四半期において過去最高の営業利益を記録。北米市場でのハイブリッド車需要の拡大と、徹底したコスト削減施策が奏功し、強固な収益基盤を構築しています。中国市場での競争激化などの懸念材料はあるものの、全体として非常に強力な成長モメンタムを維持しています。",
  news_articles: [
    {
      title: "業績：第3四半期営業利益が過去最高更新",
      score: 0.85,
      label: "positive",
      explanation:
        "電動化への大規模投資と北米市場での販売増が利益を大幅に押し上げ、過去最高の更新へと繋がりました。",
      source: "TDnet",
    },
    {
      title: "上方修正：2024年度通期業績予想を上方修正",
      score: 0.72,
      label: "positive",
      explanation:
        "好調な北米販売を受け、通期営業利益を4.7兆円に上方修正。市場予想を大きく上回るポジティブな内容です。",
      source: "TDnet",
    },
    {
      title: "市場競争：中国現地メーカーとの価格競争が懸念",
      score: -0.38,
      label: "negative",
      explanation:
        "中国EVメーカーの台頭により現地シェアが低下傾向にあり、中長期的なマージン圧迫が警戒されています。",
      source: "Public",
    },
    {
      title: "外部要因：為替の円高転換リスク",
      score: -0.22,
      label: "negative",
      explanation:
        "現在の為替水準は追い風ですが、急激な円高転換が生じた場合の輸出採算性の低下がリスク要因となります。",
      source: "Public",
    },
  ],
  price_history: Array.from({ length: 30 }).map((_, i) => {
    const close = 28000 + Math.random() * 1000 - 500 + i * 20;
    return {
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      open: close - Math.random() * 200,
      high: close + Math.random() * 200,
      low: close - Math.random() * 400,
      close: close,
      volume: 1000000 + Math.random() * 500000
    };
  }),
  generated_at: new Date().toISOString(),
};

/* ── インラインサーチバー ── */
const POPULAR_TICKERS = [
  { label: "トヨタ", value: "7203.T" },
  { label: "任天堂", value: "7974.T" },
  { label: "ソニー", value: "6758.T" },
  { label: "ソフトバンクG", value: "9984.T" },
  { label: "Apple", value: "AAPL" },
  { label: "NVIDIA", value: "NVDA" },
];

function HeaderSearchBar({
  onSearch,
  isLoading,
}: {
  onSearch: (ticker: string, days: number) => void;
  isLoading: boolean;
}) {
  const [ticker, setTicker] = useState("7203.T");
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) onSearch(ticker.trim().toUpperCase(), 30);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, maxWidth: "600px" }}
    >
      <div style={{ position: "relative", flex: 1 }}>
        {/* 指紋/光沢アニメーション */}
        <input
          id="header-ticker-input"
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="銘柄コードを入力 (例: 7203.T / AAPL)"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            background: focused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${focused ? "rgba(56,189,248,0.25)" : "rgba(255,255,255,0.04)"}`,
            borderRadius: "12px",
            padding: "10px 20px",
            color: "var(--text-primary)",
            fontSize: "0.95rem",
            fontWeight: 600,
            outline: "none",
            transition: "all 0.3s cubic-bezier(0.19, 1, 0.22, 1)",
            letterSpacing: "0.04em",
          }}
        />
        {isLoading && (
          <div
            style={{
              position: "absolute",
              bottom: 0, left: "20px", right: "20px", height: "1px",
              background: "linear-gradient(90deg, #38bdf8, #34d399, #38bdf8)",
              animation: "scan 1.5s infinite linear"
            }}
          />
        )}
      </div>
      <button
        id="header-predict-btn"
        type="submit"
        disabled={isLoading}
        className="btn-primary"
        style={{
          padding: "10px 24px", fontSize: "0.85rem", whiteSpace: "nowrap",
          borderRadius: "12px", boxShadow: "0 0 16px rgba(56,189,248,0.15)"
        }}
      >
        {isLoading ? "ANALYZING..." : "ANALYZE"}
      </button>
    </form>
  );
}

export default function DashboardPage() {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(DUMMY_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (ticker: string, days: number = 30) => {
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
    <div style={{ minHeight: "100vh", background: "#06090c", position: "relative", color: "#f8fafc" }}>
      {/* 高級感のある背景装飾 */}
      <div
        style={{
          position: "fixed", inset: 0,
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(52,211,153,0.04) 0%, transparent 35%)",
          pointerEvents: "none", zIndex: 0
        }}
      />
      <div className="cyber-grid" style={{ position: "fixed", inset: 0, opacity: 0.15, pointerEvents: "none" }} />

      {/* ───── ヘッダー ───── */}
      <header style={{
        borderBottom: "1px solid rgba(255,255,255,0.03)",
        backdropFilter: "blur(40px)",
        background: "rgba(6,9,12,0.85)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: "1360px", margin: "0 auto", padding: "0 40px", height: "64px", display: "flex", alignItems: "center", gap: "40px" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "linear-gradient(135deg, #0e1116, #1a232e)",
              border: "1px solid rgba(56,189,248,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", boxShadow: "0 0 20px rgba(56,189,248,0.1)",
            }}>
              📊
            </div>
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "0.02em", lineHeight: 1.2 }}>
                Sentiment Predictor
              </p>
              <p style={{ fontSize: "0.55rem", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Minimal Futuristic
              </p>
            </div>
          </div>

          <HeaderSearchBar onSearch={handleSearch} isLoading={isLoading} />

          <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{
              background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.15)",
              color: "#34d399", borderRadius: "8px", padding: "4px 14px", fontSize: "0.65rem", fontWeight: 900,
              letterSpacing: "0.1em"
            }}>
              CONNECTED: GEMINI-1.5-PRO
            </span>
          </div>
        </div>
      </header>

      {/* ───── メイン ───── */}
      <main style={{
        maxWidth: "1360px",
        margin: "0 auto",
        padding: "40px",
        position: "relative",
        zIndex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: "24px",
        alignItems: "start"
      }}>
        {/* 左側: メインコンテンツ */}
        <div style={{ minHeight: "600px" }}>
          {isLoading && <LoadingState />}
          {error && !isLoading && <ErrorState message={error} />}
          {!prediction && !isLoading && !error && <EmptyState />}

          {prediction && !isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* トップ: ヘッダー的な予測カード */}
              
              <div className="glass-card" style={{ padding: "24px", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
                    <SentimentGauge score={prediction.sentiment_score} label="総合センチメント" size={220} />
                  </div>

              {/* 中断: 予測カード */}
              <PredictionCard data={prediction} />

              {/* 下段2: 理由とニュースリスト */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
                <SentimentReasoning articles={prediction.news_articles} ticker={prediction.ticker} />
              </div>
            </div>
          )}
        </div>

        {/* 右側: サイドバー (SearchBar + PriceChart) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <CyberSearchBar onSearch={handleSearch} isLoading={isLoading} />
          {prediction && !isLoading && (
            <PriceChart prices={prediction.price_history} ticker={prediction.ticker} />
          )}
        </div>
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.02)", padding: "24px 40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.65rem" }}>
        <p style={{ letterSpacing: "0.05em" }}>SENTIMENT STOCK PREDICTOR &copy; 2026 ・ POWERED BY GEMINI AI</p>
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="glass-card" style={{ padding: "80px 40px", textAlign: "center" }}>
      <div style={{ width: "48px", height: "48px", border: "2px solid rgba(56,189,248,0.1)", borderTopColor: "#38bdf8", borderRadius: "50%", margin: "0 auto 24px" }} className="animate-spin-slow" />
      <p style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>銘柄をAIが詳細解析中</p>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>一次情報（適時開示）と二次情報（SNS）のセンチメントを計算しています...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass-card" style={{ padding: "40px", textAlign: "center", borderColor: "rgba(244,63,94,0.2)" }}>
      <p style={{ fontSize: "2rem", marginBottom: "16px" }}>⚠️</p>
      <p style={{ color: "#f43f5e", fontWeight: 700, marginBottom: "8px" }}>解析に失敗しました</p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card" style={{ padding: "100px 40px", textAlign: "center" }}>
      <p style={{ fontSize: "3rem", marginBottom: "20px" }}>📈</p>
      <p style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: "12px", color: "var(--text-primary)" }}>銘柄レポートを生成します</p>
      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "400px", margin: "0 auto" }}>最先端のAIが最新の適時開示情報と世論を統合し、即時にセンチメントを可視化します。</p>
    </div>
  );
}
