export interface CardProps {
  stock: Stock;
  onRemove: (symbol: string) => void;
  onSelect: (stock: Stock) => void;
  onRetry: (symbol: string) => void; // Add this
  isSelected?: boolean;
}
// Raw API response from Finnhub
export interface FinnhubQuoteResponse {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface Stock {
  symbol: string;
  companyName: string;
  currentPrice?: number; // undefined while loading/failed
  change?: number;
  changePercent?: number;
  dayHigh?: number;
  dayLow?: number;
  dayOpen?: number;
  previousClose?: number;
  volume?: number;
  marketCap?: number;
  lastUpdated: Date;
  isLoading: boolean;
  error?: string;
  retryCount?: number;
}
// For time series/chart data
export interface StockCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Application state
export interface DashboardState {
  watchlist: Stock[];
  selectedStock: Stock | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

// Component props
export interface StockCardProps {
  stock: Stock;
  isSelected: boolean;
  onClick: (stock: Stock) => void;
}

export interface SearchBarProps {
  onSearch: (symbol: string) => void;
  isLoading: boolean;
}

export interface UseStockDataReturn {
  watchlist: Stock[];
  addStock: (symbol: string) => Promise<void>;
  removeStock: (symbol: string) => void;
  selectedStock: Stock | null;
  selectStock: (stock: Stock) => void;
  clearSelection: () => void;
  retryStock: (symbol: string) => Promise<void>;
  isGlobalLoading: boolean;
  globalError?: string;
  MAX_WATCHLIST_SIZE: number;
}
