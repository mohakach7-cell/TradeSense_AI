-- Scale down legacy balance units (from MAD units back to USD units)
-- This is because the frontend now multiplies by MAD_RATE (10) for display.
UPDATE challenges
SET 
  initial_balance = initial_balance / 10,
  current_balance = current_balance / 10,
  total_pnl = total_pnl / 10,
  daily_pnl = daily_pnl / 10
WHERE initial_balance >= 50000;
