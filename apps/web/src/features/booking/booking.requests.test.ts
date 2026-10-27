import assert from 'node:assert/strict';
import test from 'node:test';
import type { components } from '@/lib/api/schema';
import { requestBookingCreation, requestBookingEstimate } from './booking.requests';

const estimateRequest: components['schemas']['EstimateRequestDto'] = {
  pickupCity: 'colombo',
  dropoffCity: 'kandy',
  size: 'SMALL',
  weightKg: 1.5,
};

const bookingRequest: components['schemas']['CreateBookingDto'] = {
  senderName: 'Nimali Customer',
  senderPhone: '+94770000001',
  pickupAddress: '12 Galle Road',
  pickupCity: 'colombo',
  recipientName: 'Test Recipient',
  recipientPhone: '+94770000002',
  dropoffAddress: '5 Temple Street',
  dropoffCity: 'kandy',
  size: 'SMALL',
  weightKg: 1.5,
};

test('maps mocked M7 estimate success and zone failure', async () => {
  const success = await requestBookingEstimate(estimateRequest, async () => ({
    data: {
      feeCents: 52500,
      currency: 'LKR',
      pickupZoneId: 'zone-cmb',
      dropoffZoneId: 'zone-kdy',
      ruleId: 'rule-1',
      ruleName: 'Island-wide default',
    },
  }));
  const failure = await requestBookingEstimate(estimateRequest, async () => ({
    error: { error: { code: 'ZONE_NOT_SERVICED', message: 'Zone is not serviced' } },
  }));

  assert.equal(success.ok && success.data.feeCents, 52500);
  assert.deepEqual(failure, {
    ok: false,
    message: 'SwiftDrop does not currently serve one of those cities.',
  });
});

test('maps mocked M4 booking success and API failure', async () => {
  const success = await requestBookingCreation(bookingRequest, async () => ({
    data: {
      id: 'parcel-1',
      trackingNumber: 'SD123456789',
      status: 'CREATED',
      senderName: 'Nimali Customer',
      pickupAddress: '12 Galle Road',
      pickupCity: 'colombo',
      recipientName: 'Test Recipient',
      dropoffAddress: '5 Temple Street',
      dropoffCity: 'kandy',
      size: 'SMALL',
      weightKg: 1.5,
      feeCents: 52500,
      currency: 'LKR',
      createdAt: '2026-10-27T08:00:00.000Z',
      deliveredAt: null,
    },
  }));
  const failure = await requestBookingCreation(bookingRequest, async () => ({
    error: { error: { code: 'NOT_IMPLEMENTED', message: 'Parcel creation is unavailable' } },
  }));

  assert.equal(success.ok && success.data.trackingNumber, 'SD123456789');
  assert.deepEqual(failure, { ok: false, message: 'Parcel creation is unavailable' });
});
