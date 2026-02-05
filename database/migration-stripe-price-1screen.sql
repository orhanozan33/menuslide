-- Stripe Price IDs for 1 Screen plan
-- Aylık: price_1SvvDILHuzvG29x51LeH1kh2
-- Yıllık: price_1SvvTRLHuzvG29x5KIS9L9TX

UPDATE plans
SET stripe_price_id_monthly = 'price_1SvvDILHuzvG29x51LeH1kh2',
    stripe_price_id_yearly = 'price_1SvvTRLHuzvG29x5KIS9L9TX',
    updated_at = NOW()
WHERE max_screens = 1;
