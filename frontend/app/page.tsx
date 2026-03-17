"use client";

import React, { useState, useCallback } from "react";
import { fetchPrediction } from "@/lib/api";
import type { PredictionResponse } from "@/types/api";
import PredictionCard from "@/components/PredictionCard";
import PriceChart from "@/components/PriceChart";
import NewsList from "@/components/NewsList";
import SearchBar from "@/components/SearchBar";

export default function DashboardPage() {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
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
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* ── ナビゲーション ── */}
      <header style={{
        borderBottom: "1px solid var(--border-subtle)",
        backdropFilter: "blur(20px)",
        background: "rgba(7,11,20,0.85)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--gradient-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}>
              📊
            </div>
            <div>
              <h1 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>
                Sentiment Stock Predictor
              </h1>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                AI-Powered Market Sentiment Analysis
              </p>
            </div>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.3)",
              color: "#34d399",
              borderRadius: "999px",
              padding: "4px 12px",
              fontSize: "0.72rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}>
              <span style={{ width: "6px", height: "6px", background: "#10b981", borderRadius: "50%", display: "inline-block" }} className="animate-pulse-glow" />
              Gemini AI
            </span>
          </nav>
        </div>
      </header>

      {/* ── ヒーローセクション ── */}
      <section style={{
        background: "var(--gradient-hero)",
        padding: "60px 24px 48px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* 背景装飾 */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "10%", left: "10%", width: "300px", height: "300px", background: "rgba(59,130,246,0.06)", borderRadius: "50%", filter: "blur(80px)" }} />
          <div style={{ position: "absolute", bottom: "10%", right: "10%", width: "250px", height: "250px", background: "rgba(16,185,129,0.06)", borderRadius: "50%", filter: "blur(80px)" }} />
        </div>

        <div style={{ position: "relative", maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ marginBottom: "16px" }}>
            <span style={{
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "var(--accent-blue)",
              borderRadius: "999px",
              padding: "6px 16px",
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}>
              🤖 Powered by Google Gemini API
            </span>
          </div>
          <h2
            className="gradient-text"
            style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1.2, marginBottom: "16px" }}
          >
            AIが読む<br />ニュースと株価の関係
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.7 }}>
            TDnet（適時開示）とSNS投稿をGeminiが分析し、<br />
            センチメントスコアから株価の方向性を予測します。
          </p>
        </div>
      </section>

      {/* ── メインコンテンツ ── */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: "24px",
          alignItems: "start",
        }}>
          {/* 左カラム：検索 */}
          <aside>
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />

            {/* 使い方ガイド */}
            <div className="glass-card" style={{ padding: "20px", marginTop: "20px" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>
                📖 使い方
              </h3>
              <ol style={{ paddingLeft: "18px", color: "var(--text-secondary)", fontSize: "0.8rem", lineHeight: 2 }}>
                <li>ティッカーを入力（日本株: 7203.T, 米株: AAPL）</li>
                <li>分析期間を設定（7〜90日）</li>
                <li>「AI予測を実行」をクリック</li>
                <li>センチメントスコアと予測方向を確認</li>
              </ol>
              <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "8px" }}>
                <p style={{ color: "#fbbf24", fontSize: "0.75rem" }}>
                  ⚠️ 本ツールは投資助言ではありません。参考情報としてご活用ください。
                </p>
              </div>
            </div>
          </aside>

          {/* 右カラム：結果 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* ローディング */}
            {isLoading && <LoadingState />}

            {/* エラー */}
            {error && !isLoading && <ErrorState message={error} />}

            {/* 初期状態 */}
            {!prediction && !isLoading && !error && <EmptyState />}

            {/* 結果表示 */}
            {prediction && !isLoading && (
              <>
                <PredictionCard data={prediction} />
                <PriceChart prices={prediction.price_history} ticker={prediction.ticker} />
                <NewsList articles={prediction.news_articles} />
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── フッター ── */}
      <footer style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "24px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.78rem",
        marginTop: "60px",
      }}>
        <p>Sentiment Stock Predictor &copy; 2026 — Powered by Gemini AI・yfinance・TDnet</p>
        <p style={{ marginTop: "4px" }}>本ツールは投資助言ではありません。投資判断は自己責任でお願いします。</p>
      </footer>
    </div>
  );
}

/* ── サブコンポーネント ── */

function LoadingState() {
  return (
    <div className="glass-card" style={{ padding: "48px", textAlign: "center" }}>
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "3px solid rgba(59,130,246,0.2)",
          borderTopColor: "var(--accent-blue)",
          borderRadius: "50%",
          margin: "0 auto 20px",
        }}
        className="animate-spin-slow"
      />
      <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: "8px" }}>
        AI分析中...
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
        TDnet・Redditを収集し、Geminiがセンチメント分析を実行しています
      </p>
      {/* スケルトン */}
      <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {[120, 80, 100].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: "16px", width: `${w}px`, margin: "0 auto", borderRadius: "8px" }} />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass-card glow-red" style={{ padding: "32px", textAlign: "center" }}>
      <p style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</p>
      <p style={{ color: "#f87171", fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}>
        エラーが発生しました
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{message}</p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "12px" }}>
        バックエンドが起動しているか確認してください（python main.py）
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card" style={{ padding: "60px 32px", textAlign: "center" }}>
      <p style={{ fontSize: "3rem", marginBottom: "16px" }}>📈</p>
      <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>
        銘柄を検索してください
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
        左側の検索フォームにティッカーを入力し、<br />
        「AI予測を実行」を押すと分析が始まります。
      </p>
    </div>
  );
}
