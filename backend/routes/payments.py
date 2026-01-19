import stripe
from flask import Blueprint, request, jsonify
from backend.utils.auth import require_auth, get_supabase_client
from supabase import create_client
from datetime import datetime
import os

payments_bp = Blueprint('payments', __name__)

CHALLENGE_PLANS = {
    'starter': {
        'price_id': "price_1Sjo30RDLrjqQ78sGUcYola7",
        'initial_balance': 5000,
        'profit_target_percent': 10,
        'max_daily_loss_percent': 5,
        'max_total_loss_percent': 10,
    },
    'pro': {
        'price_id': "price_1Sjo3WRDLrjqQ78sNVuYkkDJ",
        'initial_balance': 25000,
        'profit_target_percent': 10,
        'max_daily_loss_percent': 5,
        'max_total_loss_percent': 10,
    },
    'elite': {
        'price_id': "price_1Sjo3jRDLrjqQ78sJJPcwXvl",
        'initial_balance': 100000,
        'profit_target_percent': 8,
        'max_daily_loss_percent': 4,
        'max_total_loss_percent': 8,
    },
}

@payments_bp.route('/create-checkout', methods=['POST'])
@require_auth
def create_checkout():
    try:
        data = request.get_json()
        plan_name = data.get('plan')
        
        if not plan_name or plan_name not in CHALLENGE_PLANS:
            return jsonify({"error": "Invalid plan selected"}), 400
            
        plan_config = CHALLENGE_PLANS[plan_name]
        
        auth_header = request.headers.get('Authorization')
        token = auth_header.replace('Bearer ', '')
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        
        if not user or not user.email:
             return jsonify({"error": "User email required"}), 400

        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe_key:
            return jsonify({"error": "Stripe configuration missing"}), 500
            
        stripe.api_key = stripe_key
        
        # Check/Create Customer
        customers = stripe.Customer.list(email=user.email, limit=1)
        if customers.data:
            customer_id = customers.data[0].id
        else:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"supabase_uid": user.id}
            )
            customer_id = customer.id
            
        # Create Session
        origin = request.headers.get('Origin')
        session = stripe.checkout.Session.create(
            customer=customer_id,
            line_items=[
                {
                    "price": plan_config['price_id'],
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/payment-cancelled",
            metadata={
                "user_id": user.id,
                "plan": plan_name,
                "challenge_type": "standard"
            }
        )
        
        return jsonify({"url": session.url})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@payments_bp.route('/verify-payment', methods=['POST'])
@require_auth
def verify_payment():
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        plan = data.get('plan')
        
        if not session_id:
             return jsonify({"error": "Invalid session ID"}), 400
             
        auth_header = request.headers.get('Authorization')
        token = auth_header.replace('Bearer ', '')
        
        # We need service role client to write to DB if needed
        # Or just use the standard client with user's token if we rely on RLS
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        
        if not url or not key:
             return jsonify({"error": "Configuration error"}), 500
             
        supabase = create_client(url, key)
        
        # Verify user again
        anon_supabase = get_supabase_client()
        user_res = anon_supabase.auth.get_user(token)
        user = user_res.user
        
        if not user:
             return jsonify({"error": "User not authenticated"}), 401
             
        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe_key:
             return jsonify({"error": "Stripe config missing"}), 500
        stripe.api_key = stripe_key
        
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status != 'paid':
             return jsonify({"error": "Payment not completed"}), 400
             
        # Resolve plan
        if not plan:
            plan = session.metadata.get('plan')
            
        plan_config = CHALLENGE_PLANS.get(plan)
        if not plan_config:
             return jsonify({"error": "Invalid plan"}), 400
             
        # Insert Challenge
        challenge_data = {
            "user_id": user.id,
            "plan": plan,
            "status": "active",
            "initial_balance": plan_config['initial_balance'],
            "current_balance": plan_config['initial_balance'],
            "profit_target_percent": plan_config['profit_target_percent'],
            "max_daily_loss_percent": plan_config.get('max_daily_loss_percent', 5),
            "max_total_loss_percent": plan_config.get('max_total_loss_percent', 10),
            "start_date": datetime.now().isoformat(),
        }
        
        # Insert challenge
        res = supabase.table('challenges').insert(challenge_data).execute()
        if not res.data:
             # It might return null data but still succeed if using some libraries versions, 
             # but usually data is returned. If error, it throws or returns error object.
             # Let's assume if no error thrown, it's fine, but check response structure if needed.
             pass 
        
        # If we need ID, we should ensure we get it. 
        # Note: supabase-py v2 returns an object with .data
        if res.data and len(res.data) > 0:
            challenge_id = res.data[0]['id']
            
            # Insert Payment
            payment_data = {
                "user_id": user.id,
                "challenge_id": challenge_id,
                "amount": session.amount_total / 100,
                "currency": session.currency,
                "payment_status": "completed",
                "stripe_payment_id": session.payment_intent,
                "payment_method": "stripe"
            }
            
            supabase.table('payments').insert(payment_data).execute()
            
            return jsonify({
                "success": True, 
                "challenge_id": challenge_id, 
                "plan": plan, 
                "initial_balance": plan_config['initial_balance']
            })
        else:
             return jsonify({"error": "Failed to create challenge record"}), 500
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
