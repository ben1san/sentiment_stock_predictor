"use client";

import React, { useState, useEffect, useCallback } from "react";

interface CyberSearchBarProps {
  onSearch: (ticker: string, days: number) => void;
  isLoading: boolean;
}

const POPULAR_TICKERS = [
  { label: "トヨタ", value: "7203.T", flag: "🇯🇵" },
  { label: "任天堂", value: "7974.T", flag: "🇯🇵" },
  { label: "ソニー", value: "6758.T", flag: "🇯🇵" },
  { label: "ソフトバンクG", value: "9984.T", flag: "🇯🇵" },
  { label: "Apple", value: "AAPL", flag: "🇺🇸" },
  { label: "NVIDIA", value: "NVDA", flag: "🇺🇸" },
  { label: "Tesla", value: "TSLA", flag: "🇺🇸" },
];

// スキャニング文字列アニメーション
function ScanningText({ isActive }: { isActive: boolean }) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    if (!isActive) { setDots(""); return; }
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 300);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;
  return (
    <span
      style={{
        fontSize: "0.7rem",
        color: "var(--accent-blue)",
        fontFamily: "'Courier New', monospace",
        letterSpacing: "0.05em",
        animation: "none",
      }}
    >
      スキャン中{dots}
    </span>
  );
}

export default function CyberSearchBar({ onSearch, isLoading }: CyberSearchBarProps) {
  const [ticker, setTicker] = useState("7203.T");
  const [days, setDays] = useState(30);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (ticker.trim()) onSearch(ticker.trim().toUpperCase(), days);
    },
    [ticker, days, onSearch]
  );

  return (
    <div
      className="glass-card"
      style={{
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* スキャンライン効果 */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, var(--accent-blue), var(--accent-emerald), transparent)",
            animation: "scan 2s linear infinite",
          }}
        />
      )}

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
          }}
        >
          🔍
        </div>
        <div>
          <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Stock Scanner
          </p>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
            銘柄を検索
          </h2>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <ScanningText isActive={isLoading} />
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* ティッカー入力 */}
        <div>
          <label
            htmlFor="ticker-input"
            style={{
              display: "block",
              color: "var(--text-muted)",
              fontSize: "0.67rem",
              marginBottom: "6px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            ティッカーシンボル
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="ticker-input"
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="例: 7203.T / AAPL"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.3)",
                border: `1px solid ${isFocused ? "rgba(56,189,248,0.5)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "10px",
                padding: "11px 16px",
                color: "var(--text-primary)",
                fontSize: "1rem",
                fontWeight: 700,
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
                letterSpacing: "0.06em",
                fontFamily: "'Inter', monospace",
                boxShadow: isFocused ? "0 0 0 3px rgba(56,189,248,0.1)" : "none",
              }}
            />
            {/* スキャンアニメーション */}
            {isLoading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "10px",
                  background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.06) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.2s infinite",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>

        {/* 期間選択 */}
        <div>
          <label
            htmlFor="days-select"
            style={{
              display: "block",
              color: "var(--text-muted)",
              fontSize: "0.67rem",
              marginBottom: "6px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            分析期間:{" "}
            <span style={{ color: "var(--accent-blue)", fontWeight: 800 }}>{days}日</span>
          </label>
          <input
            id="days-select"
            type="range"
            min={7}
            max={90}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent-blue)", cursor: "pointer" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "var(--text-muted)",
              fontSize: "0.65rem",
              marginTop: "3px",
            }}
          >
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
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            padding: "12px",
          }}
        >
          {isLoading ? (
            <>
              <span
                style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid rgba(255,255,255,0.2)",
                  borderTopColor: "white",
                  borderRadius: "50%",
                  display: "inline-block",
                }}
                className="animate-spin-slow"
              />
              AI解析中...
            </>
          ) : (
            "🚀  AI予測を実行"
          )}
        </button>
      </form>

      {/* 人気銘柄 */}
      <div style={{ marginTop: "16px" }}>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.65rem",
            marginBottom: "8px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          クイック選択
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
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
                background: "rgba(56,189,248,0.07)",
                border: "1px solid rgba(56,189,248,0.15)",
                borderRadius: "6px",
                padding: "4px 10px",
                color: "var(--text-secondary)",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(56,189,248,0.15)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-blue)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,189,248,0.35)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(56,189,248,0.07)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,189,248,0.15)";
              }}
            >
              {t.flag} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 警告 */}
      <div
        style={{
          marginTop: "14px",
          padding: "10px 12px",
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.15)",
          borderRadius: "8px",
        }}
      >
        <p style={{ color: "rgba(251,191,36,0.7)", fontSize: "0.67rem", lineHeight: 1.5 }}>
          ⚠️ 本ツールは投資助言ではありません
        </p>
      </div>
    </div>
  );
}
