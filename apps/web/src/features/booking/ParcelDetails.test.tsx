import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { components } from '@/lib/api/schema';
import { ParcelDetails } from './DeliveriesDashboard';

type CustomerParcel = components['schemas']['CustomerParcelDetailDto'];

const parcel: CustomerParcel = {
  id: 'parcel-1',
  trackingNumber: 'SD100000002',
  status: 'IN_TRANSIT',
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
  history: [
    { status: 'CREATED', at: '2026-10-27T08:00:00.000Z', reason: null },
    { status: 'PICKED_UP', at: '2026-10-27T09:00:00.000Z', reason: null },
    { status: 'IN_TRANSIT', at: '2026-10-27T10:00:00.000Z', reason: null },
  ],
};

test('renders persisted parcel details, timeline and receipt link', () => {
  const markup = renderToStaticMarkup(<ParcelDetails parcel={parcel} />);

  assert.match(markup, /SD100000002/);
  assert.match(markup, /colombo to kandy/);
  assert.match(markup, /Created/);
  assert.match(markup, /Picked up/);
  assert.match(markup, /In transit/);
  assert.match(markup, /LKR/);
  assert.match(markup, /href="\/api\/v1\/parcels\/parcel-1\/receipt"/);
});

test('does not invent timeline entries when no history is available', () => {
  const markup = renderToStaticMarkup(<ParcelDetails parcel={{ ...parcel, history: [] }} />);

  assert.match(markup, /No status updates are available yet/);
  assert.doesNotMatch(markup, /Picked up/);
});
