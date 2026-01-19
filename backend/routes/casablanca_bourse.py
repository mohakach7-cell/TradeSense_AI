from flask import Blueprint, request, jsonify
from datetime import datetime
import random

casablanca_bp = Blueprint('casablanca_bourse', __name__)

SYMBOL_MAP = {
    'IAM': 'Maroc Telecom',
    'ATW': 'Attijariwafa Bank',
    'BCP': 'Banque Populaire',
    'LHM': 'LafargeHolcim Maroc',
    'CIH': 'CIH Bank',
    'TQM': 'Taqa Morocco',
    'BOA': 'Bank of Africa',
    'ADI': 'Addoha',
    'MNG': 'Managem',
    'CSR': 'Cosumar',
    'WAA': 'Wafa Assurance',
    'SBM': 'SODEP Marsa Maroc',
    'CDM': 'Crédit du Maroc',
    'SMI': 'SMI',
    'SAH': 'Saham Assurance',
    'HPS': 'HPS',
    'MDP': 'Maroc Leasing',
    'ALM': 'Aluminium du Maroc',
    'AGM': 'Afriquia Gaz',
    'DIS': 'Disway',
}

BASE_PRICES = {
    'IAM': 111.70,
    'ATW': 605.00,
    'BCP': 295.00,
    'LHM': 1720.00,
    'CIH': 420.00,
    'TQM': 1180.00,
    'BOA': 195.00,
    'ADI': 32.00,
    'MNG': 3100.00,
    'CSR': 188.00,
    'WAA': 4400.00,
    'SBM': 355.00,
    'CDM': 730.00,
    'SMI': 2050.00,
    'SAH': 1350.00,
    'HPS': 6500.00,
    'MDP': 390.00,
    'ALM': 1850.00,
    'AGM': 4650.00,
    'DIS': 640.00,
}

def generate_realtime_estimate(symbol):
    base_price = BASE_PRICES.get(symbol, 100)
    now = datetime.now()
    minute_of_day = now.hour * 60 + now.minute
    # Deterministic seed based on symbol and time
    seed = (ord(symbol[0]) * 1000 + minute_of_day) % 1000
    variation = ((seed / 1000) - 0.5) * 0.04  # -2% to +2%
    
    price = round(base_price * (1 + variation), 2)
    change = round(price - base_price, 2)
    change_percent = round((change / base_price) * 100, 2)
    
    return {
        "symbol": symbol,
        "name": SYMBOL_MAP.get(symbol, symbol),
        "price": price,
        "change": change,
        "changePercent": change_percent,
        "lastUpdate": now.isoformat()
    }

@casablanca_bp.route('/casablanca-bourse', methods=['POST'])
def get_casablanca_data():
    data = request.get_json() or {}
    symbols = data.get('symbols', ['IAM', 'ATW', 'BCP', 'LHM', 'CIH', 'TQM'])

    if not isinstance(symbols, list) or not symbols:
        return jsonify({"success": False, "error": "Symbols array is required"}), 400

    allowed_symbols = SYMBOL_MAP.keys()
    valid_symbols = [s.upper() for s in symbols if s.upper() in allowed_symbols]

    if not valid_symbols:
        return jsonify({"success": False, "error": "No valid Moroccan stock symbols provided"}), 400

    quotes = []
    
    for symbol in valid_symbols:
        quotes.append(generate_realtime_estimate(symbol))

    return jsonify({
        "success": True,
        "quotes": quotes,
        "source": "casablanca-bourse-simulated",
        "timestamp": datetime.now().isoformat()
    })
