import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bookingErrors,
  bookingPayload,
  estimateErrors,
  estimatePayload,
  INITIAL_VALUES,
  type FormValues,
} from './booking-form.logic';

const validValues: FormValues = {
  ...INITIAL_VALUES,
  senderName: '  Nimali Customer  ',
  senderPhone: '+94770000001',
  pickupAddress: '  12 Galle Road  ',
  pickupCity: '  Colombo  ',
  recipientName: 'Test Recipient',
  recipientPhone: '+94770000002',
  recipientEmail: ' recipient@example.com ',
  dropoffAddress: '5 Temple Street',
  dropoffCity: ' Kandy ',
  size: 'SMALL',
  weightKg: '1.50',
  description: '  Books  ',
};

test('validates whitespace, contact details and weight boundaries', () => {
  assert.deepEqual(bookingErrors(validValues), {});

  const errors = bookingErrors({
    ...validValues,
    senderName: ' ',
    senderPhone: '077-123',
    recipientEmail: 'invalid',
    weightKg: '100.01',
  });

  assert.equal(errors.senderName, 'Sender name must be at least 2 characters');
  assert.equal(errors.senderPhone, 'Enter a valid phone number with 9 to 15 digits');
  assert.equal(errors.recipientEmail, 'Enter a valid email address');
  assert.equal(errors.weightKg, 'Weight must be between 0.01 kg and 100 kg');
  assert.equal(estimateErrors({ ...validValues, weightKg: '0' }).weightKg, errors.weightKg);
});

test('normalizes estimate and booking payloads without adding a client fee', () => {
  assert.deepEqual(estimatePayload(validValues), {
    pickupCity: 'colombo',
    dropoffCity: 'kandy',
    size: 'SMALL',
    weightKg: 1.5,
  });

  const payload = bookingPayload(validValues);
  assert.deepEqual(payload, {
    senderName: 'Nimali Customer',
    senderPhone: '+94770000001',
    pickupAddress: '12 Galle Road',
    pickupCity: 'colombo',
    recipientName: 'Test Recipient',
    recipientPhone: '+94770000002',
    recipientEmail: 'recipient@example.com',
    dropoffAddress: '5 Temple Street',
    dropoffCity: 'kandy',
    size: 'SMALL',
    weightKg: 1.5,
    description: 'Books',
  });
  assert.equal('feeCents' in payload, false);
});
