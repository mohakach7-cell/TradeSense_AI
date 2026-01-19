from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Import blueprints
from routes.market_data import market_data_bp

load_dotenv()

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(market_data_bp)
app.register_blueprint(casablanca_bp)
app.register_blueprint(payments_bp)

@app.route('/')
def health_check():
    return jsonify({"status": "healthy", "service": "TradeSense AI Backend"})

if __name__ == '__main__':
    port = int(os.getenv("PORT", 54321))
    app.run(host='0.0.0.0', port=port, debug=True)
