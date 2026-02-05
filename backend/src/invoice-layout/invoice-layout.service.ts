import { Injectable, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface InvoiceLayoutDto {
  // Fatura başlık ve etiketler
  invoice_title: string;
  invoice_number_label: string;
  date_of_issue_label: string;
  date_due_label: string;
  bill_to_label: string;
  // Tablo sütunları
  description_label: string;
  qty_label: string;
  unit_price_label: string;
  amount_label: string;
  subtotal_label: string;
  total_label: string;
  amount_due_label: string;
  // Firma (biller) bilgileri
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  // Buton / link metinleri
  pay_online_text: string;
  download_invoice_text: string;
  download_receipt_text: string;
  view_invoice_details_text: string;
  // Ödeme onay sayfası
  invoice_paid_text: string;
  amount_due_prefix: string;
  // Footer (yasal bilgi)
  footer_legal: string;
  footer_tax_id: string;
}

/** Kanada bazlı fatura varsayılanları (CAD, GST/HST, adres formatı) */
const DEFAULT_LAYOUT: InvoiceLayoutDto = {
  invoice_title: 'Invoice / Facture',
  invoice_number_label: 'Invoice number / Nº de facture',
  date_of_issue_label: 'Date of issue / Date d\'émission',
  date_due_label: 'Date due / Date d\'échéance',
  bill_to_label: 'Bill to / Facturé à',
  description_label: 'Description',
  qty_label: 'Qty / Qté',
  unit_price_label: 'Unit price / Prix unitaire',
  amount_label: 'Amount / Montant',
  subtotal_label: 'Subtotal / Sous-total',
  total_label: 'Total',
  amount_due_label: 'Amount due (CAD) / Montant dû (CAD)',
  company_name: 'MenuSlide',
  company_address: 'Toronto, ON, Canada',
  company_phone: '+1 (416) 000-0000',
  company_email: 'info@menuslide.com',
  pay_online_text: 'Pay online / Payer en ligne',
  download_invoice_text: 'Download invoice / Télécharger la facture',
  download_receipt_text: 'Download receipt / Télécharger le reçu',
  view_invoice_details_text: 'View invoice details / Voir les détails de la facture',
  invoice_paid_text: 'Invoice paid / Facture payée',
  amount_due_prefix: 'due (CAD) / dû (CAD)',
  footer_legal: 'MenuSlide Inc.',
  footer_tax_id: 'GST/HST No. 123456789 RT0001',
};

function getDataPath(): string {
  const backendRoot = path.resolve(__dirname, '..', '..', '..');
  const dataDir = path.join(backendRoot, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'invoice-layout.json');
}

@Injectable()
export class InvoiceLayoutService {
  findAll(): InvoiceLayoutDto {
    try {
      const filePath = getDataPath();
      if (!fs.existsSync(filePath)) {
        return { ...DEFAULT_LAYOUT };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        ...DEFAULT_LAYOUT,
        ...parsed,
      };
    } catch {
      return { ...DEFAULT_LAYOUT };
    }
  }

  save(dto: Partial<InvoiceLayoutDto>, userRole: string): InvoiceLayoutDto {
    if (userRole !== 'super_admin') {
      throw new ForbiddenException('Only super admin can update invoice layout');
    }
    const current = this.findAll();
    const merged: InvoiceLayoutDto = {
      ...current,
      ...dto,
    };
    const filePath = getDataPath();
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  }
}
