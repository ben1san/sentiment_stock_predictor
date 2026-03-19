"use client";

import React, { useState, useCallback } from "react";
import { fetchPrediction } from "@/lib/api";
import type { PredictionResponse } from "@/types/api";
import StockPriceCard from "@/components/StockPriceCard";
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
    "トヨタ自動車（7203）は、第3四半期において過去最高の営業利益を記録。北米市場でのハイブリッド車需要の拡大と、徹底したコスト削減施策が奏功し、強固な収益基盤を構築しています。中国市場での競争激化などの懸念材料はあるものの、全体として非常に強力な成長モメンタムを維持しています。",
  analysis: {
    fundamental_reason: "過去最高の営業利益と北米市場の好調が継続。供給網の安定化により通期見通しも明るい。",
    social_insight: "新型ハイブリッド車への期待感と利益水準への驚きがポジティブに反応。",
    risk_factor: "中国市場での販売シェア減と、原材料コストの変動が主要なリスク。"
  },
  scores: {
    fundamental: 0.82,
    social: 0.45,
    gap: 0.37
  },
  judgment: "BUY",
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
  ],
  price_history: [],
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
  onSearch: (ticker: string) => void;
  isLoading: boolean;
}) {
  const [ticker, setTicker] = useState("7203.T");
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) onSearch(ticker.trim().toUpperCase());
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, maxWidth: "600px" }}
    >
      <div style={{ position: "relative", flex: 1 }}>
        <input
          id="ticker-input"
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
            color: "#f8fafc",
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
        id="predict-btn"
        type="submit"
        disabled={isLoading}
        className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 text-sm uppercase tracking-wider"
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

  const handleSearch = useCallback(async (ticker: string) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    try {
      const data = await fetchPrediction(ticker, 30);
      setPrediction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#06090c", position: "relative", color: "#f8fafc" }}>
      <div 
        style={{ position: "fixed", inset: 0, 
        backgroundImage: "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(52,211,153,0.04) 0%, transparent 35%)",
        pointerEvents: "none", zIndex: 0 }} 
      />

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
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "0.02em", lineHeight: 1.2 }}>
                Sentiment Predictor
              </p>
              <p style={{ fontSize: "0.55rem", color: "#94a3b8", letterSpacing: "0.15em", textTransform: "uppercase" }}>
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

      <main style={{ maxWidth: "1360px", margin: "0 auto", padding: "40px", position: "relative", zIndex: 1 }}>
        {isLoading && <LoadingState />}
        {error && !isLoading && <ErrorState message={error} />}
        {!prediction && !isLoading && !error && <EmptyState />}

        {prediction && !isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <StockPriceCard data={prediction} />
            <AIAnalysisEngine 
              summary={prediction.sentiment_summary}
              ticker={prediction.ticker}
              direction={prediction.predicted_direction}
              confidence={prediction.confidence}
              sentimentScore={prediction.sentiment_score}
              analysis={prediction.analysis}
              scores={prediction.scores}
              judgment={prediction.judgment}
            />
          </div>
        )}
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.02)", padding: "24px 40px", textAlign: "center", color: "#94a3b8", fontSize: "0.65rem" }}>
        <p style={{ letterSpacing: "0.05em" }}>SENTIMENT STOCK PREDICTOR &copy; 2026 ・ POWERED BY GEMINI AI</p>
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-20 text-center">
      <div className="w-12 h-12 border-2 border-sky-500/10 border-t-sky-500 rounded-full animate-spin mx-auto mb-6" />
      <p className="font-bold text-lg mb-2 text-slate-100">銘柄をAIが詳細解析中</p>
      <p className="text-sm text-slate-400">一次情報（適時開示）と二次情報（SNS）のセンチメントを計算しています...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-slate-900/40 border border-rose-500/20 rounded-2xl p-10 text-center">
      <p className="text-3xl mb-4">⚠️</p>
      <p className="text-rose-400 font-bold mb-2">解析に失敗しました</p>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-24 text-center">
      <p className="text-4xl mb-6">📈</p>
      <p className="font-bold text-xl mb-3 text-slate-100">銘柄レポートを生成します</p>
      <p className="text-slate-400 text-sm max-w-sm mx-auto">最先端のAIが最新の適時開示情報と世論を統合し、即時にセンチメントを可視化します。</p>
    </div>
  );
}
