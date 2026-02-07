'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { addCanadaHST } from '@/lib/canada-tax';

const localeMap: Record<string, string> = { en: 'en-US', tr: 'tr-TR', fr: 'fr-FR' };

export interface InvoiceModalData {
  invoice_number?: string;
  payment_date?: string | null;
  plan_name?: string | null;
  amount?: number;
  currency?: string;
  status?: string;
  business_name?: string | null;
  customer_email?: string | null;
  company?: {
    company_name?: string;
    company_address?: string;
    company_phone?: string;
    company_email?: string;
  };
}

interface InvoiceModalProps {
  data: InvoiceModalData | null;
  loading: boolean;
  onClose: () => void;
}

function formatDateShort(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return '—';
  const localeKey = localeMap[locale] || 'en-US';
  return new Date(dateStr).toLocaleDateString(localeKey);
}

export function InvoiceModal({ data, loading, onClose }: InvoiceModalProps) {
  const { t, locale } = useTranslation();

  if (!loading && !data) return null;

  const { subtotal, tax, total } = data
    ? addCanadaHST(Number(data.amount ?? 0))
    : { subtotal: 0, tax: 0, total: 0 };
  const cur = data ? (String(data.currency || 'cad')).toUpperCase() : 'CAD';

  const handlePrint = () => {
    if (!data) return;
    const { subtotal: s, tax: tx, total: tot } = addCanadaHST(Number(data.amount ?? 0));
    const curVal = (String(data.currency || 'cad')).toUpperCase();
    const curSym = curVal === 'CAD' || curVal === 'CA$' ? 'CA$' : curVal + ' ';
    const company = data.company as Record<string, string> | undefined;
    const dateStr = formatDateShort(data.payment_date as string, locale);
    const logoUrl = typeof window !== 'undefined' ? window.location.origin + '/menuslide-logo.png' : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('invoice_title')}</title><style>
body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:32px;color:#111;background:#fff}
.top-line{height:2px;background:#374151;margin-bottom:24px}
.invoice-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
.invoice-title{font-size:28px;font-weight:700;margin:0}
.invoice-logo{height:48px;object-fit:contain}
.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.details-block .label{font-weight:700;margin-bottom:4px}
.details-block .value{color:#374151}
.company-block{margin-bottom:20px}
.company-block strong{font-size:1rem}
.bill-to{text-align:right}
.amount-due{font-size:1.25rem;font-weight:700;margin:20px 0}
.table-wrap{border-top:1px solid #e5e7eb;padding-top:16px;margin-top:16px}
table{width:100%;border-collapse:collapse}
th,td{padding:12px 8px;border-bottom:1px solid #e5e7eb}
th{text-align:left;font-weight:600}
th:nth-child(2),th:nth-child(3),th:nth-child(4),td:nth-child(2),td:nth-child(3),td:nth-child(4){text-align:right}
.summary{text-align:right;margin-top:16px;padding-top:16px}
.summary-row{display:flex;justify-content:flex-end;gap:40px;padding:4px 0}
.summary-row.total{font-weight:700;font-size:1.1rem;margin-top:8px}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:0.875rem;color:#6b7280}
@media print{body{margin:0;padding:16px}}
</style></head><body>
<div class="top-line"></div>
<div class="invoice-header">
  <h1 class="invoice-title">${t('invoice_title')}</h1>
  ${logoUrl ? `<img src="${logoUrl}" alt="MenuSlide" class="invoice-logo" />` : ''}
</div>
<div class="details-grid">
  <div>
    <div class="details-block"><span class="label">${t('invoice_number')}</span><div class="value">${String(data.invoice_number ?? '-')}</div></div>
    <div class="details-block"><span class="label">${t('invoice_date_issue')}</span><div class="value">${dateStr}</div></div>
    <div class="details-block"><span class="label">${t('invoice_date_due')}</span><div class="value">${dateStr}</div></div>
  </div>
</div>
<div class="details-grid">
  <div class="company-block">${company ? `<strong>${company.company_name || 'Menu Slide'}</strong>${company.company_address ? `<br>${company.company_address}` : ''}${company.company_phone ? `<br>${company.company_phone}` : ''}` : '<strong>Menu Slide</strong><br>398 7e Avenue, 6<br>Lachine Quebec H8S 2Z4, Canada<br>+1 438-596-8566'}</div>
  <div class="bill-to"><strong>${t('invoice_bill_to')}</strong><br>${String(data.business_name ?? '—')}${data.customer_email ? `<br>${data.customer_email}` : ''}</div>
</div>
<div class="amount-due">${curSym}${tot.toFixed(2)} ${t('invoice_amount_due').toLowerCase()} ${dateStr}</div>
<div class="table-wrap">
  <table><thead><tr><th>${t('invoice_description')}</th><th>${t('invoice_qty')}</th><th>${t('invoice_unit_price')}</th><th>${t('invoice_amount')}</th></tr></thead><tbody>
  <tr><td>${String(data.plan_name ?? '—')}</td><td>1</td><td>${(Number(data.amount ?? 0)).toFixed(2)} ${curVal}</td><td>${(Number(data.amount ?? 0)).toFixed(2)} ${curVal}</td></tr>
  </tbody></table>
  <div class="summary">
    <div class="summary-row">${t('invoice_subtotal')}: ${curSym}${s.toFixed(2)}</div>
    <div class="summary-row">${t('invoice_tax')}: ${curSym}${tx.toFixed(2)}</div>
    <div class="summary-row">${t('invoice_total')}: ${curSym}${tot.toFixed(2)}</div>
    <div class="summary-row total">${t('invoice_amount_due')}: ${curSym}${tot.toFixed(2)}</div>
  </div>
</div>
<div class="footer">${String(data.invoice_number ?? '-')} · ${curSym}${tot.toFixed(2)} ${t('invoice_amount_due').toLowerCase()} ${dateStr}</div>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => {
        w.print();
        w.close();
      }, 250);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={() => !loading && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="py-8 text-center text-slate-600">{t('settings_loading')}</div>
        ) : data ? (
          <>
            {/* Header: Fatura | Fatura no + Tarih */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
              <h3 className="text-xl font-bold text-slate-900">{t('invoice_title')}</h3>
              <div className="text-right text-sm">
                <div>
                  <span className="text-slate-500">{t('invoice_number')}: </span>
                  <span className="font-mono font-semibold text-slate-800">{String(data.invoice_number ?? '-')}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t('invoice_date')}: </span>
                  <span className="font-semibold text-slate-800">{formatDateShort(data.payment_date as string, locale)}</span>
                </div>
              </div>
            </div>

            {/* Gönderen / Alıcı */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              {data.company ? (
                <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-start gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('invoice_from')}</div>
                    <div className="font-medium text-slate-800">{data.company.company_name || 'MenuSlide'}</div>
                    {data.company.company_address ? <div className="text-slate-600 text-xs mt-0.5">{data.company.company_address}</div> : null}
                  </div>
                  <img src="/menuslide-logo.png" alt="MenuSlide" className="h-14 w-auto object-contain flex-shrink-0" />
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-start gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('invoice_from')}</div>
                    <div className="font-medium text-slate-800">MenuSlide</div>
                  </div>
                  <img src="/menuslide-logo.png" alt="MenuSlide" className="h-14 w-auto object-contain flex-shrink-0" />
                </div>
              )}
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('invoice_bill_to')}</div>
                <div className="font-medium text-slate-800">{String(data.business_name ?? '—')}</div>
                {data.customer_email ? <div className="text-slate-600 text-xs mt-0.5">{String(data.customer_email)}</div> : null}
              </div>
            </div>

            {/* Plan / Tutar tablosu */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">{t('invoice_plan')}</th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-700">{t('invoice_amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-800">{String(data.plan_name ?? '—')}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800">{Number(data.amount ?? 0).toFixed(2)} {cur}</td>
                  </tr>
                  <tr className="border-t border-slate-100 bg-slate-50">
                    <td className="px-4 py-2 text-slate-600">{t('invoice_subtotal')}</td>
                    <td className="px-4 py-2 text-right text-slate-700">{subtotal.toFixed(2)} {cur}</td>
                  </tr>
                  <tr className="border-t border-slate-100 bg-slate-50">
                    <td className="px-4 py-2 text-slate-600">{t('invoice_tax')}</td>
                    <td className="px-4 py-2 text-right text-slate-700">{tax.toFixed(2)} {cur}</td>
                  </tr>
                  <tr className="border-t-2 border-slate-200 bg-slate-100">
                    <td className="px-4 py-2 font-semibold text-slate-800">{t('invoice_total')}</td>
                    <td className="px-4 py-2 text-right font-bold text-slate-900">{total.toFixed(2)} {cur}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-xs text-slate-500 mb-4">
              {t('invoice_status')}: <span className="capitalize font-medium text-slate-700">{String(data.status ?? '—')}</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                {t('invoice_download') || 'Yazdır / PDF indir'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 text-sm"
              >
                {t('btn_close') || t('common_close')}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
