import { Prisma, type Parcel } from '@swiftdrop/db';
import { buildReceiptLines, formatReceiptAmount } from './bookings.receipt';

function parcelFixture(): Parcel {
  const createdAt = new Date('2026-10-20T08:00:00.000Z');
  return {
    id: 'parcel-1',
    trackingNumber: 'SD100000001',
    status: 'CREATED',
    source: 'CUSTOMER',
    customerId: 'customer-1',
    merchantId: null,
    merchantReference: null,
    senderName: 'Sender',
    senderPhone: '+94770000001',
    pickupAddress: '12 Galle Road',
    pickupCity: 'colombo',
    pickupZoneId: 'zone-1',
    recipientName: 'Recipient',
    recipientPhone: '+94770000002',
    recipientEmail: null,
    dropoffAddress: '5 Temple Street',
    dropoffCity: 'kandy',
    dropoffZoneId: 'zone-2',
    size: 'SMALL',
    weightKg: new Prisma.Decimal('1.50'),
    description: null,
    feeCents: 52500,
    currency: 'LKR',
    deliveryAttempts: 0,
    internalNotes: null,
    createdAt,
    updatedAt: createdAt,
    deliveredAt: null,
  };
}

describe('booking receipt', () => {
  it('formats LKR minor units with two decimal places', () => {
    expect(formatReceiptAmount(52500, 'LKR')).toBe('LKR 525.00');
    expect(formatReceiptAmount(123456, 'LKR')).toBe('LKR 1,234.56');
  });

  it('builds the required receipt content', () => {
    expect(buildReceiptLines(parcelFixture())).toEqual([
      { label: 'Tracking number', value: 'SD100000001' },
      { label: 'Booking date', value: '20 Oct 2026' },
      { label: 'Sender city', value: 'colombo' },
      { label: 'Recipient city', value: 'kandy' },
      { label: 'Parcel size', value: 'small' },
      { label: 'Weight', value: '1.50 kg' },
      { label: 'Delivery fee', value: 'LKR 525.00' },
      { label: 'Status', value: 'Created' },
    ]);
  });
});
