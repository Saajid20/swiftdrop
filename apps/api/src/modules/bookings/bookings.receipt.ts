import type { Parcel } from '@swiftdrop/db';
import PDFDocument from 'pdfkit';
import type { Readable } from 'node:stream';

export interface ReceiptLine {
  label: string;
  value: string;
}

export function formatReceiptAmount(feeCents: number, currency: string): string {
  const amount = new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(feeCents / 100);
  return `${currency} ${amount}`;
}

export function buildReceiptLines(parcel: Parcel): ReceiptLine[] {
  return [
    { label: 'Tracking number', value: parcel.trackingNumber },
    {
      label: 'Booking date',
      value: new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }).format(parcel.createdAt),
    },
    { label: 'Sender city', value: parcel.pickupCity },
    { label: 'Recipient city', value: parcel.dropoffCity },
    { label: 'Parcel size', value: parcel.size.toLowerCase() },
    { label: 'Weight', value: `${Number(parcel.weightKg).toFixed(2)} kg` },
    { label: 'Delivery fee', value: formatReceiptAmount(parcel.feeCents, parcel.currency) },
    {
      label: 'Status',
      value: parcel.status
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    },
  ];
}

export function createReceiptPdf(parcel: Parcel): Readable {
  const document = new PDFDocument({ size: 'A4', margin: 54, compress: false });
  const lines = buildReceiptLines(parcel);

  document.fillColor('#1d4ed8').fontSize(24).font('Helvetica-Bold').text('SwiftDrop');
  document.moveDown(0.25);
  document.fillColor('#0f172a').fontSize(16).text('Delivery receipt');
  document.moveDown(0.4);
  document
    .strokeColor('#dbeafe')
    .lineWidth(1)
    .moveTo(54, document.y)
    .lineTo(541, document.y)
    .stroke();
  document.moveDown(1.2);

  for (const line of lines) {
    const rowY = document.y;
    document.fillColor('#64748b').font('Helvetica').fontSize(10).text(line.label, 54, rowY, {
      width: 150,
    });
    document.fillColor('#0f172a').font('Helvetica-Bold').text(line.value, 210, rowY, {
      width: 331,
      align: 'right',
    });
    document.y = Math.max(document.y, rowY + 24);
  }

  document.moveDown(1.5);
  document
    .strokeColor('#e2e8f0')
    .lineWidth(1)
    .moveTo(54, document.y)
    .lineTo(541, document.y)
    .stroke();
  document.moveDown(0.8);
  document
    .fillColor('#64748b')
    .font('Helvetica')
    .fontSize(9)
    .text('Thank you for choosing SwiftDrop.', { align: 'center' });
  document.end();

  return document;
}
