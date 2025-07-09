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

export interface SearchBarProps {
  onSearch: (symbol: string) => void;
  isLoading: boolean;
}

export interface CardProps {
  stock: Stock;
  onRemove: (symbol: string) => void;
  onSelect: (stock: Stock) => void;
  onRetry: (symbol: string) => void;
  isSelected?: boolean;
}

export interface UseStockDataReturn {
  watchlist: Stock[];
  addStock: (symbol: string) => Promise<void>;
  removeStock: (symbol: string) => void;
  selectedStock: Stock | null;
  selectStock: (stock: Stock) => void;
  clearSelection: () => void;
  retryStock: (symbol: string) => Promise<void>;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchStocks: (query: string) => void;
  clearSearch: () => void;
  isGlobalLoading: boolean;
  refreshAllStocks: (isManual?: boolean) => Promise<void>;
  globalError?: string;
  maxWatchlistSize: number;
  lastManualRefresh: Date | null;
  MANUAL_REFRESH_COOLDOWN: number;
}

export interface SearchResult {
  symbol: string;
  description: string;
  type: string;
}
