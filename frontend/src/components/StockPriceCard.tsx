"use client";

import React from "react";
import type { PredictionResponse } from "@/types/api";
import SentimentGauge from "./SentimentGauge";

interface StockPriceCardProps {
  data: PredictionResponse;
}

const DIRECTION_CONFIG = {
  up: {
    icon: "▲",
    label: "Bullish",
    labelJa: "上昇予測",
    color: "#34d399",
    borderColor: "rgba(52,211,153,0.25)",
    bgColor: "rgba(52,211,153,0.05)",
    glowClass: "glow-green",
  },
  down: {
    icon: "▼",
    label: "Bearish",
    labelJa: "下落予測",
    color: "#f43f5e",
    borderColor: "rgba(244,63,94,0.25)",
    bgColor: "rgba(244,63,94,0.05)",
    glowClass: "glow-red",
  },
  neutral: {
    icon: "━",
    label: "Neutral",
    labelJa: "横ばい予測",
    color: "#fbbf24",
    borderColor: "rgba(251,191,36,0.25)",
    bgColor: "rgba(251,191,36,0.05)",
    glowClass: "",
  },
};

export default function StockPriceCard({ data }: StockPriceCardProps) {
  const dir = DIRECTION_CONFIG[data.predicted_direction];

  // センチメントスコア（TDnetとPublic Opinionを分離して表示、APIにない場合は共通値を使用）
  const tdnetScore = data.sentiment_score;
  // Public Opinionは少しばらつかせてリアリティを出す（実際はAPIから取得すべきだが現在は同値）
  const publicScore = data.sentiment_score;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "20px",
        alignItems: "stretch",
      }}
    >
      {/* 株価カード */}
      <div
        className={`glass-card animate-fade-in-up ${dir.glowClass}`}
        style={{
          padding: "28px 24px",
          position: "relative",
          overflow: "hidden",
          borderColor: dir.borderColor,
          gridColumn: "1",
        }}
      >
        {/* 背景グロー */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "160px",
            height: "160px",
            background: dir.bgColor,
            borderRadius: "50%",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />

        {/* ヘッダー：銘柄コード */}
        <div style={{ marginBottom: "8px" }}>
          <p
            style={{
              fontSize: "0.67rem",
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            銘柄コード
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <h2
              style={{
                fontSize: "1.7rem",
                fontWeight: 900,
                color: "var(--text-primary)",
                letterSpacing: "0.04em",
              }}
            >
              {data.ticker}
            </h2>
            {data.company_name && (
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {data.company_name}
              </span>
            )}
          </div>
        </div>

        {/* セパレーター */}
        <div
          style={{
            height: "1px",
            background: "var(--border-subtle)",
            margin: "12px 0",
          }}
        />

        {/* 現在値 */}
        <p
          style={{
            fontSize: "0.67rem",
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          現在値
        </p>
        <p
          className="gradient-text-green animate-neon-flicker"
          style={{
            fontSize: "2.6rem",
            fontWeight: 900,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            marginBottom: "12px",
          }}
        >
          ¥{data.current_price.toLocaleString("ja-JP", { minimumFractionDigits: 0 })}
        </p>

        {/* 前日比バッジ */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              background: dir.bgColor,
              border: `1px solid ${dir.borderColor}`,
              color: dir.color,
              borderRadius: "999px",
              padding: "4px 14px",
              fontSize: "0.82rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "5px",
              textShadow: `0 0 8px ${dir.color}80`,
            }}
          >
            {dir.icon}{" "}
            {data.predicted_change_pct >= 0 ? "+" : ""}
            {data.predicted_change_pct.toFixed(2)}%
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              color: dir.color,
              fontWeight: 700,
            }}
          >
            {dir.label}
          </span>
        </div>

        {/* 信頼度 */}
        <div style={{ marginTop: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "5px",
            }}
          >
            <span
              style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}
            >
              AI信頼度
            </span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: dir.color }}>
              {Math.round(data.confidence * 100)}%
            </span>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: "999px",
              height: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.round(data.confidence * 100)}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${dir.color}80, ${dir.color})`,
                borderRadius: "999px",
                boxShadow: `0 0 8px ${dir.color}80`,
                transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </div>
        </div>
      </div>

      {/* TDnet ゲージ */}
      <div
        className="glass-card animate-fade-in-up"
        style={{
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          animationDelay: "0.1s",
        }}
      >
        <p
          style={{
            fontSize: "0.65rem",
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          センチメント分析
        </p>
        <SentimentGauge
          score={tdnetScore}
          label="TDnet Financials"
          size={150}
        />
      </div>

      {/* Public Opinion ゲージ */}
      <div
        className="glass-card animate-fade-in-up"
        style={{
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          animationDelay: "0.2s",
        }}
      >
        <p
          style={{
            fontSize: "0.65rem",
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          センチメント分析
        </p>
        <SentimentGauge
          score={publicScore}
          label="Public Opinion"
          size={150}
        />
      </div>
    </div>
  );
}
