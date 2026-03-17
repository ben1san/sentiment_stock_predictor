"use client";

import React from "react";
import type { PredictionResponse } from "@/types/api";

interface PredictionCardProps {
  data: PredictionResponse;
}

const DIRECTION_CONFIG = {
  up: {
    icon: "↑",
    label: "上昇予測",
    className: "glow-green",
    gradient: "var(--gradient-green)",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  down: {
    icon: "↓",
    label: "下落予測",
    className: "glow-red",
    gradient: "var(--gradient-red)",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  neutral: {
    icon: "→",
    label: "横ばい予測",
    className: "",
    gradient: "linear-gradient(135deg, #374151 0%, #6b7280 100%)",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
};

export default function PredictionCard({ data }: PredictionCardProps) {
  const dir = DIRECTION_CONFIG[data.predicted_direction];
  const confidencePct = Math.round(data.confidence * 100);
  const sentimentPct = Math.round(((data.sentiment_score + 1) / 2) * 100);

  return (
    <div
      className={`glass-card ${dir.className} animate-fade-in-up`}
      style={{ padding: "32px", position: "relative", overflow: "hidden" }}
    >
      {/* 背景グロー装飾 */}
      <div
        style={{
          position: "absolute",
          top: "-60px",
          right: "-60px",
          width: "200px",
          height: "200px",
          background: dir.bgColor,
          borderRadius: "50%",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>
            銘柄
          </p>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {data.ticker}
          </h2>
          {data.company_name && (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "2px" }}>
              {data.company_name}
            </p>
          )}
        </div>

        {/* 現在値 */}
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "4px" }}>現在値</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)" }}>
            ¥{data.current_price.toLocaleString("ja-JP", { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* 予測方向 */}
      <div
        style={{
          background: dir.bgColor,
          border: `1px solid ${dir.borderColor}`,
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>{dir.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ color: dir.color, fontWeight: 800, fontSize: "1.1rem" }}>{dir.label}</p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
            予測変動率:{" "}
            <span style={{ color: dir.color, fontWeight: 600 }}>
              {data.predicted_change_pct >= 0 ? "+" : ""}
              {data.predicted_change_pct.toFixed(2)}%
            </span>
          </p>
        </div>
      </div>

      {/* メトリクス */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        {/* 信頼度 */}
        <MetricBar
          label="信頼度"
          value={confidencePct}
          color={dir.color}
          suffix="%"
        />
        {/* センチメント */}
        <MetricBar
          label="センチメント"
          value={sentimentPct}
          color={
            data.sentiment_label === "positive"
              ? "#10b981"
              : data.sentiment_label === "negative"
              ? "#ef4444"
              : "#f59e0b"
          }
          suffix="%"
          displayValue={`${data.sentiment_score >= 0 ? "+" : ""}${data.sentiment_score.toFixed(3)}`}
        />
      </div>

      {/* センチメントサマリー */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "10px",
          padding: "14px 16px",
        }}
      >
        <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          AI 分析サマリー
        </p>
        <p style={{ color: "var(--text-primary)", fontSize: "0.875rem", lineHeight: 1.7 }}>
          {data.sentiment_summary}
        </p>
      </div>

      {/* 生成日時 */}
      <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "12px", textAlign: "right" }}>
        生成: {new Date(data.generated_at).toLocaleString("ja-JP")}
      </p>
    </div>
  );
}

function MetricBar({
  label,
  value,
  color,
  suffix = "",
  displayValue,
}: {
  label: string;
  value: number;
  color: string;
  suffix?: string;
  displayValue?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{label}</span>
        <span style={{ color, fontWeight: 700, fontSize: "0.9rem" }}>
          {displayValue ?? `${value}${suffix}`}
        </span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "999px", height: "6px", overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.min(value, 100)}%`,
            height: "100%",
            background: color,
            borderRadius: "999px",
            transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: `0 0 8px ${color}80`,
          }}
        />
      </div>
    </div>
  );
}
