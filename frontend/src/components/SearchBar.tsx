"use client";

import React, { useState } from "react";

interface SearchBarProps {
  onSearch: (ticker: string, days: number) => void;
  isLoading: boolean;
}

const POPULAR_TICKERS = [
  { label: "トヨタ", value: "7203.T" },
  { label: "任天堂", value: "7974.T" },
  { label: "ソニー", value: "6758.T" },
  { label: "ソフトバンクG", value: "9984.T" },
  { label: "Apple", value: "AAPL" },
  { label: "NVIDIA", value: "NVDA" },
  { label: "Tesla", value: "TSLA" },
];

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [ticker, setTicker] = useState("7203.T");
  const [days, setDays] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) onSearch(ticker.trim().toUpperCase(), days);
  };

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: "28px" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>
        🔍 銘柄を検索
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* ティッカー入力 */}
        <div>
          <label
            htmlFor="ticker-input"
            style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "8px", fontWeight: 500 }}
          >
            ティッカーシンボル
          </label>
          <input
            id="ticker-input"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="例: 7203.T / AAPL"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "var(--text-primary)",
              fontSize: "1rem",
              fontWeight: 600,
              outline: "none",
              transition: "border-color 0.2s",
              letterSpacing: "0.05em",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-blue)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
            }}
          />
        </div>

        {/* 期間選択 */}
        <div>
          <label
            htmlFor="days-select"
            style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "8px", fontWeight: 500 }}
          >
            分析期間: <span style={{ color: "var(--accent-blue)", fontWeight: 700 }}>{days}日</span>
          </label>
          <input
            id="days-select"
            type="range"
            min={7}
            max={90}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent-blue)" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "4px" }}>
            <span>7日</span>
            <span>90日</span>
          </div>
        </div>

        {/* 実行ボタン */}
        <button
          id="predict-btn"
          type="submit"
          disabled={isLoading}
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          {isLoading ? (
            <>
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white",
                  borderRadius: "50%",
                  display: "inline-block",
                }}
                className="animate-spin-slow"
              />
              分析中...
            </>
          ) : (
            "🚀 AI予測を実行"
          )}
        </button>
      </form>

      {/* 人気銘柄 */}
      <div style={{ marginTop: "20px" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "10px" }}>人気銘柄</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {POPULAR_TICKERS.map((t) => (
            <button
              key={t.value}
              id={`quick-${t.value.replace(/\./g, "_")}`}
              type="button"
              onClick={() => {
                setTicker(t.value);
                onSearch(t.value, days);
              }}
              style={{
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: "6px",
                padding: "5px 12px",
                color: "var(--accent-blue)",
                fontSize: "0.78rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 0.2s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.2)";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.1)";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
            >
              {t.label}
              <span style={{ color: "var(--text-muted)", marginLeft: "4px", fontSize: "0.7rem" }}>
                {t.value}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
