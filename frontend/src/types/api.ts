/** API レスポンスの型定義 */

export interface StockPricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SentimentResult {
  title: string;
  score: number;
  label: "positive" | "neutral" | "negative";
  explanation: string;
  source: string;
}

export interface PredictionResponse {
  ticker: string;
  company_name: string | null;
  current_price: number;
  predicted_direction: "up" | "down" | "neutral";
  predicted_change_pct: number;
  confidence: number;
  sentiment_score: number;
  sentiment_label: "positive" | "neutral" | "negative";
  sentiment_summary: string;
  news_articles: SentimentResult[];
  price_history: StockPricePoint[];
  generated_at: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}
