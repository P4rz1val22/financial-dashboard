[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-blue?style=for-the-badge)](https://your-vercel-url.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-91.2%25-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

[![JavaScript](https://img.shields.io/badge/JavaScript-7.5%25-blue?style=for-the-badge&logo=javascript)](https://www.typescriptlang.org/)

## 🏗️ **Project Architecture**

### **File Structure**

```
src/
├── components/           # Reusable UI components
│   ├── line-chart.tsx   # D3.js chart component with tooltips
│   ├── stock-card.tsx   # Individual stock display card
│   ├── search-dropdown.tsx # Keyboard-navigable search
│   └── detail-stock-modal.tsx # Stock details modal
├── hooks/               # Custom React hooks
│   └── use-stock-data.ts # Main state management hook
├── services/            # External API integration
│   └── stockService.ts  # Finnhub API wrapper
├── types/               # TypeScript type definitions
│   └── index.ts         # Shared interfaces & types
├── utils/               # Helper functions & utilities
│   ├── rate-limiting.ts # API rate limiting logic
│   ├── session-storage.ts # Browser storage management
│   └── company-names.ts # Stock symbol mappings
└── App.tsx              # Main application component
```

### **State Management**

- **Custom hook pattern** (`useStockData`) for centralized state
- **Session storage persistence** for watchlist & preferences
- **Optimistic updates** with error rollback for better UX
- **Debounced saves** to prevent excessive storage writes

### **Performance Optimizations**

- **Memoized calculations** for expensive chart operations
- **Virtualized rendering** for large datasets (when applicable)
- **Bundle splitting** with dynamic imports
- **Image optimization** and lazy loading

## 📊 **API Integration**

### **Finnhub Stock API**

- **Quote endpoint**: Real-time price data
- **Search endpoint**: Stock symbol lookup
- **Rate limiting**: 60 calls/minute (free tier)
- **Error handling**: Graceful fallbacks for API failures

### **Data Flow**

```
User Input → Debounced Search → API Call → State Update → UI Re-render
     ↓
Auto-refresh (5min) → Batch API Calls → Optimistic Updates → Chart Animation
```

## 🎨 **Design System**

### **Color Palette**

- **Primary**: Blue (#3b82f6) - Interactive elements
- **Success**: Green (#10b981) - Positive stock changes
- **Danger**: Red (#ef4444) - Negative stock changes
- **Neutral**: Gray scales - Text and backgrounds

### **Typography**

- **System fonts** for optimal performance across platforms
- **Responsive scaling** from mobile (14px) to desktop (16px)
- **Font weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### **Spacing & Layout**

- **8px grid system** for consistent spacing
- **Flexbox & CSS Grid** for responsive layouts
- **Mobile-first** approach with progressive enhancement

## 🎮 **User Experience**

### **Stock Management**

```
🔍 Search → 📊 Add to Watchlist → 📈 Real-time Updates → 🎯 Interactive Charts
```

### **Keyboard Shortcuts**

- `Tab` - Navigate between elements
- `↑/↓` - Navigate search results & stock cards
- `Enter/Space` - Select stock or open details
- `Delete/Backspace` - Remove stock from watchlist
- `R` - Retry failed stock (when applicable)

### **Data Management**

- **Daily data only** - Charts show today's trading activity (max 288 points)
- **FIFO queue behavior** - Oldest data points automatically pruned
- **5-minute intervals** - Perfect balance of freshness vs API efficiency
- **Graceful offline handling** - App works with cached data when network fails

## 🛠️ **Tech Stack Details**

| Category        | Technology                     | Purpose                             |
| --------------- | ------------------------------ | ----------------------------------- |
| **Frontend**    | React 18 + TypeScript          | Type-safe component architecture    |
| **Styling**     | Tailwind CSS 4.x               | Utility-first responsive design     |
| **Charts**      | D3.js v7                       | Interactive data visualizations     |
| **Build Tool**  | Vite 6.x                       | Lightning-fast development & builds |
| **Data Source** | Finnhub API                    | Real-time stock market data         |
| **UI/UX**       | Lucide Icons + React Hot Toast | Modern iconography & notifications  |

## 🤝 **Contributing**

This is a portfolio project, but feedback and suggestions are welcome!

### **Getting Started**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper TypeScript types
4. Test across different devices and browsers
5. Commit with descriptive messages (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request with detailed description

### **Code Standards**

- **TypeScript strict mode** - No `any` types
- **Functional components** with hooks
- **Mobile responsive** - Test on multiple screen sizes

## 📝 **License**

MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by Luis** | **Part of 8-Week Coding Journey**
