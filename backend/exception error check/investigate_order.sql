-- Query 1: Get order details
SELECT 
  o.id,
  o.status,
  o.stripe_payment_intent,
  o.stripe_session_id,
  o.expires_at,
  o.created_at,
  o.quantity,
  o.total_amount,
  o.discount_amount,
  o.is_bypassed,
  o.payment_method,
  o.attendee_names,
  u.name AS user_name,
  u.email AS user_email,
  tt.name AS tier_name,
  tt.available_qty AS tier_available_qty
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN ticket_tiers tt ON o.tier_id = tt.id
WHERE o.id = 'b3f5755a-7a51-4e97-a2a8-4a0377a24a4e';
