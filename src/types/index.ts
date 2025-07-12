/**
 * Type definitions for the Financial Dashboard application
 * All types are actively used and production-ready
 */

// ===== FINNHUB API RESPONSE TYPES =====

/**
 * Raw API response structure from Finnhub stock quote endpoint
 */
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

/**
 * Search result structure from Finnhub symbol search endpoint
 */
export interface FinnhubSymbolResponse {
  symbol: string;
  description: string;
  type: string;
}

// ===== CORE DATA TYPES =====

/**
 * Real-time price data point for chart visualization
 */
export interface PricePoint {
  timestamp: Date;
  price: number;
  change: number;
  changePercent: number;
}

/**
 * Complete stock data model with real-time updates and state management
 */
export interface Stock {
  symbol: string;
  companyName: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  dayHigh?: number;
  dayLow?: number;
  dayOpen?: number;
  previousClose?: number;
  lastUpdated: Date;
  isLoading: boolean;
  error?: string;
  priceHistory: PricePoint[];
}

export interface StockUpdate {
  symbol: string;
  data: FinnhubQuoteResponse;
  fromCache?: boolean;
}

export interface ServiceWorkerStockUpdateEvent extends MessageEvent {
  data: {
    type: "STOCK_UPDATE";
    updates: StockUpdate[];
  };
}

// ===== COMPONENT PROP TYPES =====

/**
 * Props for the LineChart component supporting both mini and detailed views
 */
export interface LineChartProps {
  data: PricePoint[];
  width?: number;
  height?: number;
  mini?: boolean;
  symbol: string;
  isLoading: boolean;
}

/*
 * Props for the detailed stock modal
 */
export interface DetailedStockModalProps {
  stock: Stock;
  onClose: () => void;
  isLoading: boolean;
}

/**
 * Props for individual stock cards in the dashboard grid
 */
export interface CardProps {
  stock: Stock;
  onRemove: (symbol: string) => void;
  onSelect: (stock: Stock) => void;
  onRetry: (symbol: string) => void;
  isSelected?: boolean;
  isGlobalLoading: boolean;
  chartWidth: number;
}

/**
 * Props for the search dropdown component
 */
export interface SearchDropdownProps {
  searchResults: FinnhubSymbolResponse[];
  isVisible: boolean;
  onSelectStock: (symbol: string) => void;
  onClose: () => void;
  isSearching: boolean;
}

export interface SearchDropdownWithKeyboardProps extends SearchDropdownProps {
  selectedIndex: number;
  onKeyboardSelect: (index: number) => void;
}

// ===== HOOK RETURN TYPES =====

/**
 * Return type for the useStockData hook - complete stock management interface
 */
export interface UseStockDataReturn {
  // Core stock data
  watchlist: Stock[];
  selectedStock: Stock | null;

  // Stock management actions
  addStock: (symbol: string) => Promise<void>;
  removeStock: (symbol: string) => void;
  selectStock: (stock: Stock | null) => void;
  clearSelection: () => void;
  retryStock: (symbol: string) => Promise<void>;
  refreshAllStocks: (isManual?: boolean) => Promise<void>;

  // Search functionality
  searchQuery: string;
  searchResults: FinnhubSymbolResponse[];
  isSearching: boolean;
  searchStocks: (query: string) => void;
  clearSearch: () => void;

  // Global state
  isGlobalLoading: boolean;
  globalError?: string;
  maxWatchlistSize: number;
  lastManualRefresh: Date | null;
  MANUAL_REFRESH_COOLDOWN: number;
}
