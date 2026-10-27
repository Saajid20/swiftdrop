import { Prisma, type Parcel } from '@swiftdrop/db';
import { toParcelDto } from './bookings.mapper';

describe('toParcelDto', () => {
  it('maps only fields in the parcel response contract', () => {
    const createdAt = new Date('2026-10-20T08:00:00.000Z');
    const parcel: Parcel = {
      id: 'parcel-1',
      trackingNumber: 'SD900000001',
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
      recipientEmail: 'recipient@example.com',
      dropoffAddress: '5 Temple Street',
      dropoffCity: 'kandy',
      dropoffZoneId: 'zone-2',
      size: 'SMALL',
      weightKg: new Prisma.Decimal('1.50'),
      description: 'Books',
      feeCents: 52500,
      currency: 'LKR',
      deliveryAttempts: 0,
      internalNotes: 'Private note',
      createdAt,
      updatedAt: createdAt,
      deliveredAt: null,
    };

    expect(toParcelDto(parcel)).toEqual({
      id: 'parcel-1',
      trackingNumber: 'SD900000001',
      status: 'CREATED',
      senderName: 'Sender',
      pickupAddress: '12 Galle Road',
      pickupCity: 'colombo',
      recipientName: 'Recipient',
      dropoffAddress: '5 Temple Street',
      dropoffCity: 'kandy',
      size: 'SMALL',
      weightKg: 1.5,
      feeCents: 52500,
      currency: 'LKR',
      createdAt,
      deliveredAt: null,
    });
  });
});
