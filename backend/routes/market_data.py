from flask import Blueprint, request, jsonify
from utils.auth import require_auth
import os
import requests
import time

market_data_bp = Blueprint('market_data', __name__)

ALLOWED_SYMBOLS = {
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META",
    "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE",
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "EURGBP", "USDMAD",
}

SYMBOL_MAPPING = {
    "AAPL": "AAPL",
    "MSFT": "MSFT",
    "GOOGL": "GOOGL",
    "AMZN": "AMZN",
    "NVDA": "NVDA",
    "TSLA": "TSLA",
    "META": "META",
    "BTC": "BINANCE:BTCUSDT",
    "ETH": "BINANCE:ETHUSDT",
    "BNB": "BINANCE:BNBUSDT",
    "SOL": "BINANCE:SOLUSDT",
    "XRP": "BINANCE:XRPUSDT",
    "ADA": "BINANCE:ADAUSDT",
    "DOGE": "BINANCE:DOGEUSDT",
    "EURUSD": "OANDA:EUR_USD",
    "GBPUSD": "OANDA:GBP_USD",
    "USDJPY": "OANDA:USD_JPY",
    "USDCHF": "OANDA:USD_CHF",
    "AUDUSD": "OANDA:AUD_USD",
    "USDCAD": "OANDA:USD_CAD",
    "EURGBP": "OANDA:EUR_GBP",
}

@market_data_bp.route('/market-data', methods=['POST'])
@require_auth
def get_market_data():
    data = request.get_json()
    symbols = data.get('symbols', [])

    if not symbols or not isinstance(symbols, list):
        return jsonify({"error": "Symbols array is required"}), 400

    if len(symbols) > 50:
        return jsonify({"error": "Maximum 50 symbols allowed per request"}), 400

    valid_symbols = [s.upper() for s in symbols if isinstance(s, str) and s.upper() in ALLOWED_SYMBOLS]

    if not valid_symbols:
        return jsonify({"error": "No valid symbols provided"}), 400

    api_key = os.getenv("FINNHUB_API_KEY")
    if not api_key:
        return jsonify({"error": "FINNHUB_API_KEY not configured"}), 500

    quotes = []
    errors = []
    
    # Process in batches of 5
    batch_size = 5
    for i in range(0, len(valid_symbols), batch_size):
        batch = valid_symbols[i:i + batch_size]
        
        for symbol in batch:
            try:
                finnhub_symbol = SYMBOL_MAPPING.get(symbol, symbol)
                url = f"https://finnhub.io/api/v1/quote?symbol={finnhub_symbol}&token={api_key}"
                
                response = requests.get(url)
                if not response.ok:
                    errors.append(symbol)
                    continue
                
                quote_data = response.json()
                
                # Finnhub returns: c, d, dp, h, l, o, pc, t
                if quote_data and quote_data.get('c') is not None and quote_data.get('c') > 0:
                    quotes.append({
                        "symbol": symbol,
                        "price": quote_data.get('c'),
                        "change": quote_data.get('d', 0),
                        "changePercent": quote_data.get('dp', 0),
                        "high": quote_data.get('h', quote_data.get('c')),
                        "low": quote_data.get('l', quote_data.get('c')),
                        "open": quote_data.get('o', quote_data.get('c')),
                        "previousClose": quote_data.get('pc', quote_data.get('c')),
                        "timestamp": quote_data.get('t', time.time())
                    })
                else:
                    errors.append(symbol)
            except Exception as e:
                errors.append(symbol)
        
        # Rate limiting delay
        if i + batch_size < len(valid_symbols):
            time.sleep(0.2)

    return jsonify({"quotes": quotes, "errors": errors})
