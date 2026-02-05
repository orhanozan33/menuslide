-- Fatura sistemi: payments tablosuna fatura numarası
-- Format: INV-YYYY-NNNNN (ör. INV-2025-00001)

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

-- Mevcut ödemelere yıl bazlı sıralı fatura numarası ver
WITH ordered AS (
  SELECT id, payment_date,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM payment_date::timestamp) ORDER BY payment_date, id) AS rn
  FROM payments WHERE invoice_number IS NULL
)
UPDATE payments p SET invoice_number = 'INV-' || TO_CHAR(p.payment_date::timestamp, 'YYYY') || '-' || LPAD(o.rn::text, 5, '0')
FROM ordered o WHERE p.id = o.id;

-- Yeni ödemeler için NOT NULL yapma (webhook INSERT'ta set edeceğiz); boş kalan varsa yukarıdaki blok sonrası dolu olur
-- Opsiyonel: ALTER TABLE payments ALTER COLUMN invoice_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_invoice_number ON payments (invoice_number) WHERE invoice_number IS NOT NULL;
