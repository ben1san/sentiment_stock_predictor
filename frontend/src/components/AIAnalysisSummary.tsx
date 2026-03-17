"use client";

import React from "react";
import type { SentimentResult } from "@/types/api";

interface AIAnalysisSummaryProps {
  articles: SentimentResult[];
  summary: string;
}

export default function AIAnalysisSummary({ articles, summary }: AIAnalysisSummaryProps) {
  // ポジティブな要因とネガティブな要因を抽出
  const positiveFactors = articles.filter(a => a.label === "positive").slice(0, 2);
  const negativeFactors = articles.filter(a => a.label === "negative").slice(0, 2);

  return (
    <div className="glass-card animate-fade-in-up" 
      style={{ 
        padding: "32px", 
        border: "1px solid rgba(255,255,255,0.03)",
        position: "relative",
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)"
      }}>
      
      {/* 繊細な装飾ライン */}
      <div style={{
        position: "absolute", top: 0, left: "32px", right: "32px", height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.2), transparent)"
      }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* タイトルセクション */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700,
            letterSpacing: "0.2em", textTransform: "uppercase",
            borderLeft: "2px solid #38bdf8", paddingLeft: "10px"
          }}>
            AI Analysis Summary
          </div>
        </div>

        {/* 3行程度の簡潔な分析サマリー */}
        <div style={{ 
          fontSize: "1.05rem", 
          lineHeight: "1.8", 
          color: "rgba(255,255,255,0.9)",
          fontWeight: 500,
          maxWidth: "900px"
        }}>
          {summary.split('。').slice(0, 3).join('。')}。
        </div>

        {/* 要因のグリッド（緑・赤の色分け） */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr", 
          gap: "40px",
          marginTop: "8px",
          paddingTop: "24px",
          borderTop: "1px solid rgba(255,255,255,0.05)"
        }}>
          
          {/* プラス要因 */}
          <div>
            <div style={{ 
              fontSize: "0.7rem", color: "#34d399", fontWeight: 800, 
              display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px",
              letterSpacing: "0.1em"
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 10px #34d399" }} />
              POSITIVE FACTORS
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: "12px", listStyle: "none", padding: 0 }}>
              {positiveFactors.map((f, i) => (
                <li key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ color: "#34d399", fontSize: "0.8rem", marginTop: "2px" }}>▲</span>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: "1.5" }}>
                    <strong style={{ color: "#34d399", fontWeight: 700, marginRight: "6px" }}>
                      {f.title.split('：')[0]}
                    </strong>
                    {f.explanation.length > 60 ? f.explanation.substring(0, 60) + "..." : f.explanation}
                  </div>
                </li>
              ))}
              {positiveFactors.length === 0 && (
                <li style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>特筆すべきプラス要因なし</li>
              )}
            </ul>
          </div>

          {/* マイナス要因 */}
          <div>
            <div style={{ 
              fontSize: "0.7rem", color: "#f43f5e", fontWeight: 800, 
              display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px",
              letterSpacing: "0.1em"
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f43f5e", boxShadow: "0 0 10px #f43f5e" }} />
              NEGATIVE FACTORS
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: "12px", listStyle: "none", padding: 0 }}>
              {negativeFactors.map((f, i) => (
                <li key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ color: "#f43f5e", fontSize: "0.8rem", marginTop: "2px" }}>▼</span>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: "1.5" }}>
                    <strong style={{ color: "#f43f5e", fontWeight: 700, marginRight: "6px" }}>
                      {f.title.split('：')[0]}
                    </strong>
                    {f.explanation.length > 60 ? f.explanation.substring(0, 60) + "..." : f.explanation}
                  </div>
                </li>
              ))}
              {negativeFactors.length === 0 && (
                <li style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>特筆すべきマイナス要因なし</li>
              )}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
