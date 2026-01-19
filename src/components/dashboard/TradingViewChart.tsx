import { useEffect, useRef, memo } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

interface TradingViewChartProps {
  symbol?: string;
}

const TradingViewChart = memo(({ symbol = "AAPL" }: TradingViewChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const { i18n } = useTranslation();
  const lastInit = useRef<{ symbol: string; theme: string; lang: string } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const currentTheme = resolvedTheme === "dark" ? "dark" : "light";
    const currentLang = i18n.language === "ar" ? "ar" : i18n.language === "fr" ? "fr" : "en";

    const prev = lastInit.current;
    if (prev && prev.symbol === symbol && prev.theme === currentTheme && prev.lang === currentLang && container.querySelector(".tradingview-widget-container")) {
      return;
    }

    const existing = container.querySelector(".tradingview-widget-container");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    widgetContainer.appendChild(widgetDiv);

    container.appendChild(widgetContainer);

    // Map internal symbols to TradingView symbols
    const symbolMap: Record<string, string> = {
      // US Stocks
      AAPL: "NASDAQ:AAPL",
      MSFT: "NASDAQ:MSFT",
      GOOGL: "NASDAQ:GOOGL",
      AMZN: "NASDAQ:AMZN",
      NVDA: "NASDAQ:NVDA",
      TSLA: "NASDAQ:TSLA",
      META: "NASDAQ:META",
      // Crypto
      BTC: "BINANCE:BTCUSDT",
      ETH: "BINANCE:ETHUSDT",
      BNB: "BINANCE:BNBUSDT",
      SOL: "BINANCE:SOLUSDT",
      XRP: "BINANCE:XRPUSDT",
      ADA: "BINANCE:ADAUSDT",
      DOGE: "BINANCE:DOGEUSDT",
      // Forex
      EURUSD: "FX:EURUSD",
      GBPUSD: "FX:GBPUSD",
      USDJPY: "FX:USDJPY",
      USDCHF: "FX:USDCHF",
      AUDUSD: "FX:AUDUSD",
      USDCAD: "FX:USDCAD",
      EURGBP: "FX:EURGBP",
      // Commodities
      XAUUSD: "TVC:GOLD",
      XAGUSD: "TVC:SILVER",
      WTIUSD: "TVC:USOIL",
      BRENTUSD: "TVC:UKOIL",
      NATGAS: "TVC:NATURALGAS",
      COPPER: "COMEX:HG1!",
      // Indices
      SPX500: "FOREXCOM:SPXUSD",
      NAS100: "FOREXCOM:NSXUSD",
      DJI30: "FOREXCOM:DJI",
      DAX40: "XETR:DAX",
      FTSE100: "SPREADEX:FTSE",
      CAC40: "EURONEXT:PX1",
      // Morocco
      IAM: "CASABLANCA:IAM",
      ATW: "CASABLANCA:ATW",
      BCP: "CASABLANCA:BCP",
      LHM: "CASABLANCA:LHM",
      CIH: "CASABLANCA:CIH",
      TQM: "CASABLANCA:TQM",
    };

    const tvSymbol = symbolMap[symbol] || `NASDAQ:${symbol}`;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "15",
      timezone: "Africa/Casablanca",
      theme: currentTheme,
      style: "1",
      locale: currentLang,
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_volume: false,
      backgroundColor: currentTheme === "dark" ? "rgba(10, 10, 10, 1)" : "rgba(255, 255, 255, 1)",
      gridColor: currentTheme === "dark" ? "rgba(42, 42, 42, 0.5)" : "rgba(200, 200, 200, 0.5)",
      studies: ["STD;MACD", "STD;RSI"],
    });

    widgetContainer.appendChild(script);
    lastInit.current = { symbol, theme: currentTheme, lang: currentLang };

    return () => {
      const node = container.querySelector(".tradingview-widget-container");
      if (node && node.parentNode) node.parentNode.removeChild(node);
    };
  }, [symbol, resolvedTheme, i18n.language]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
    />
  );
});

TradingViewChart.displayName = "TradingViewChart";

export default TradingViewChart;
