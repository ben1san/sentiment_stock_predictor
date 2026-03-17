"use client";

import React, { useState, useCallback } from "react";
import { fetchPrediction } from "@/lib/api";
import type { PredictionResponse } from "@/types/api";
import StockPriceCard from "@/components/StockPriceCard";
import SentimentReasoning from "@/components/SentimentReasoning";

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
    "トヨタ自動車（7203）は、第3四半期において過去最高の増益を記録。電動化戦略の加速とコスト削減施策が奏功し、北米市場でのブレイクアウトが確認されています。パブリックセンチメントも強気優勢。",
  news_articles: [
    {
      title: "トヨタ、第3四半期営業利益が過去最高更新 — 電動化戦略が奏功",
      score: 0.85,
      label: "positive",
      explanation:
        "電動化への大規模投資と北米市場での販売増が利益を大幅に押し上げた。ハイブリッド車需要の急増により、競合他社との差別化が明確に。",
      source: "TDnet",
    },
    {
      title: "トヨタ自動車、2024年度通期業績予想を上方修正",
      score: 0.72,
      label: "positive",
      explanation:
        "円安と北米販売好調を受け、通期営業利益を4.7兆円に上方修正。ガイダンスの引き上げは市場予想を上回り、強気シグナルとして評価。",
      source: "TDnet",
    },
    {
      title: "ハイブリッド車の世界需要が急増、トヨタが恩恵",
      score: 0.61,
      label: "positive",
      explanation:
        "欧米でのハイブリッド車需要増加がトヨタの販売台数を持続的に押し上げている。政策的追い風も加わりポジティブ評価。",
      source: "Public",
    },
    {
      title: "中国市場での競争激化、現地EVメーカーとの価格競争が懸念",
      score: -0.38,
      label: "negative",
      explanation:
        "BYDをはじめとする中国EVメーカーの台頭により、中国でのシェアが低下傾向にある。価格競争の激化がマージン圧迫要因として働く可能性。",
      source: "Public",
    },
    {
      title: "半導体供給の一部回復でトヨタの生産制約が緩和",
      score: 0.45,
      label: "positive",
      explanation:
        "車載半導体供給の改善により生産台数増加が見込まれ、需要への対応力が向上。在庫正常化への進展が追い風。",
      source: "TDnet",
    },
    {
      title: "為替変動リスク：円高進行でのコスト増加シナリオ",
      score: -0.22,
      label: "negative",
      explanation:
        "現在の円安が業績を下支えしているが、急激な円高転換が生じた場合、輸出企業として売上・利益への影響が懸念される。",
      source: "Public",
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
      style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, maxWidth: "560px" }}
    >
      <div style={{ position: "relative", flex: 1 }}>
        {/* スキャンライン */}
        {isLoading && (
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, height: "2px",
              background: "linear-gradient(90deg, transparent, #38bdf8, #34d399, transparent)",
              animation: "scan 1.8s linear infinite",
              borderRadius: "999px",
            }}
          />
        )}
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
            background: focused ? "rgba(56,189,248,0.06)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${focused ? "rgba(56,189,248,0.45)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "9px",
            padding: "9px 16px",
            color: "var(--text-primary)",
            fontSize: "0.9rem",
            fontWeight: 600,
            outline: "none",
            transition: "all 0.2s",
            letterSpacing: "0.04em",
            boxShadow: focused ? "0 0 0 3px rgba(56,189,248,0.1)" : "none",
          }}
        />
      </div>
      <button
        id="predict-btn"
        type="submit"
        disabled={isLoading}
        className="btn-primary"
        style={{ padding: "9px 20px", fontSize: "0.85rem", whiteSpace: "nowrap" }}
      >
        {isLoading ? (
          <span
            style={{
              width: "14px", height: "14px",
              border: "2px solid rgba(255,255,255,0.2)",
              borderTopColor: "white",
              borderRadius: "50%", display: "inline-block",
            }}
            className="animate-spin-slow"
          />
        ) : (
          "🚀 分析"
        )}
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
    <div style={{ minHeight: "100vh", background: "#05080A", position: "relative" }}>
      {/* サイバーグリッド背景 */}
      <div
        className="cyber-grid"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.35 }}
      />
      {/* アンビエントグロー */}
      <div style={{
        position: "fixed", top: "15%", left: "5%",
        width: "500px", height: "400px",
        background: "radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "10%", right: "8%",
        width: "400px", height: "300px",
        background: "radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* ══════════ ヘッダー（検索バー内蔵） ══════════ */}
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px)",
          background: "rgba(5,8,10,0.92)",
          position: "sticky", top: 0, zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "1400px", margin: "0 auto",
            padding: "0 28px", height: "58px",
            display: "flex", alignItems: "center", gap: "20px",
          }}
        >
          {/* ロゴ */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "linear-gradient(135deg, #0f3460, #38bdf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "15px", boxShadow: "0 0 16px rgba(56,189,248,0.3)",
            }}>
              📊
            </div>
            <div>
              <p style={{
                fontSize: "0.88rem", fontWeight: 800,
                color: "var(--text-primary)", letterSpacing: "0.01em", lineHeight: 1.2,
              }}>
                Sentiment Stock Predictor
              </p>
              <p style={{ fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                AI-POWERED MARKET ANALYSIS
              </p>
            </div>
          </div>

          {/* 中央：検索バー */}
          <HeaderSearchBar onSearch={handleSearch} isLoading={isLoading} />

          {/* 右：クイック選択 */}
          <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
            {POPULAR_TICKERS.map((t) => (
              <button
                key={t.value}
                id={`quick-${t.value.replace(/\./g, "_")}`}
                type="button"
                onClick={() => handleSearch(t.value)}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  color: "var(--text-secondary)",
                  fontSize: "0.7rem", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(56,189,248,0.12)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#38bdf8";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,189,248,0.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ステータス */}
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            <span style={{
              background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.22)",
              color: "#34d399", borderRadius: "6px", padding: "3px 10px",
              fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em",
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              <span style={{
                width: "5px", height: "5px", background: "#34d399",
                borderRadius: "50%", display: "inline-block", boxShadow: "0 0 6px #34d399",
              }} className="animate-pulse-glow" />
              GEMINI AI
            </span>
          </div>
        </div>
      </header>

      {/* ══════════ メインコンテンツ ══════════ */}
      <main
        style={{
          maxWidth: "1400px", margin: "0 auto",
          padding: "24px 28px 60px",
          position: "relative", zIndex: 1,
        }}
      >
        {/* ローディング */}
        {isLoading && <LoadingState />}

        {/* エラー */}
        {error && !isLoading && <ErrorState message={error} />}

        {/* 初期 */}
        {!prediction && !isLoading && !error && <EmptyState />}

        {/* ── データ表示 ── */}
        {prediction && !isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* ① 株価カード + センチメントゲージ 3カラム */}
            <StockPriceCard data={prediction} />

            {/* ② センチメントスコアの根拠（適時開示・群衆の理由を緑/赤で） */}
            <SentimentReasoning
              articles={prediction.news_articles}
              ticker={prediction.ticker}
            />

          </div>
        )}
      </main>

      {/* フッター */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "16px 28px", textAlign: "center",
        color: "var(--text-muted)", fontSize: "0.7rem",
        position: "relative", zIndex: 1,
      }}>
        <p>
          Sentiment Stock Predictor &copy; 2026 —{" "}
          <span className="neon-text-blue">Gemini AI</span> ・ TDnet 適時開示
        </p>
        <p style={{ marginTop: "3px", opacity: 0.55 }}>
          本ツールは投資助言ではありません。投資判断は自己責任でお願いします。
        </p>
      </footer>
    </div>
  );
}

/* ── ローディング ── */
function LoadingState() {
  return (
    <div className="glass-card" style={{ padding: "56px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: "linear-gradient(90deg, transparent, #38bdf8, #34d399, transparent)",
        animation: "scan 2s linear infinite",
      }} />
      <div style={{
        width: "52px", height: "52px",
        border: "2px solid rgba(56,189,248,0.15)",
        borderTopColor: "#38bdf8", borderRightColor: "#34d399",
        borderRadius: "50%", margin: "0 auto 18px",
      }} className="animate-spin-slow" />
      <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1rem", marginBottom: "6px" }}>
        解析中...
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
        TDnet 適時開示を収集し、Gemini AI がセンチメント分析を実行しています
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass-card glow-red" style={{ padding: "32px", textAlign: "center", borderColor: "rgba(244,63,94,0.3)" }}>
      <p style={{ fontSize: "2rem", marginBottom: "10px" }}>⚠️</p>
      <p style={{ color: "#f43f5e", fontWeight: 700, marginBottom: "8px" }}>エラーが発生しました</p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card" style={{ padding: "80px 32px", textAlign: "center" }}>
      <p style={{ fontSize: "3rem", marginBottom: "16px" }}>📈</p>
      <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>
        銘柄を入力して分析を開始
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
        上部の検索バーにティッカーシンボルを入力してください
      </p>
    </div>
  );
}
