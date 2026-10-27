'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { PARCEL_SIZES } from '@swiftdrop/contracts';
import { Alert, Button, Card, FormField, Input, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import {
  bookingErrors,
  bookingPayload,
  ESTIMATE_FIELDS,
  estimateErrors,
  estimatePayload,
  INITIAL_VALUES,
  type FormErrors,
  type FormValues,
} from './booking-form.logic';
import { requestBookingCreation, requestBookingEstimate } from './booking.requests';

type Estimate = components['schemas']['EstimateResponseDto'];
type CreatedParcel = components['schemas']['ParcelDto'];

function formatFee(estimate: Estimate) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: estimate.currency,
    minimumFractionDigits: 2,
  }).format(estimate.feeCents / 100);
}

function focusFirstError(errors: FormErrors) {
  const firstField = Object.keys(errors)[0];
  if (firstField) requestAnimationFrame(() => document.getElementById(firstField)?.focus());
}

export function BookingForm() {
  const router = useRouter();
  const estimateRevision = useRef(0);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimateError, setEstimateError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedParcel | null>(null);

  function setField<Key extends keyof FormValues>(field: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(undefined);
    if (ESTIMATE_FIELDS.has(field)) {
      estimateRevision.current += 1;
      setEstimate(null);
      setEstimateError(undefined);
    }
  }

  async function getEstimate() {
    const nextErrors = estimateErrors(values);
    setErrors(nextErrors);
    setSubmitError(undefined);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    const revision = estimateRevision.current;
    setEstimating(true);
    setEstimateError(undefined);
    try {
      const result = await requestBookingEstimate(estimatePayload(values), (body) =>
        api.POST('/api/v1/pricing/estimate', { body }),
      );
      if (estimateRevision.current !== revision) return;
      if (result.ok) {
        setEstimate(result.data);
      } else {
        setEstimateError(result.message);
      }
    } finally {
      setEstimating(false);
    }
  }

  async function confirmBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = bookingErrors(values);
    setErrors(nextErrors);
    setSubmitError(undefined);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }
    if (!estimate) {
      setSubmitError('Get an up-to-date price before confirming this booking.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestBookingCreation(bookingPayload(values), (body) =>
        api.POST('/api/v1/parcels', { body }),
      );
      if (result.ok) {
        setCreated(result.data);
        router.refresh();
      } else {
        setSubmitError(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Card className="max-w-2xl" aria-live="polite">
        <Alert tone="success">Your delivery has been booked.</Alert>
        <h2 className="mt-5 text-xl font-semibold">Tracking number</h2>
        <p className="mt-2 break-all font-mono text-2xl font-semibold tracking-wide">
          {created.trackingNumber}
        </p>
        <p className="mt-2 text-sm text-muted">
          Keep this number to follow the delivery from pickup to completion.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={`/customer/parcels/${created.id}`}
            className="rounded-md bg-brand px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-dark"
          >
            View delivery
          </Link>
          <Link
            href="/customer"
            className="rounded-md border border-line bg-surface px-4 py-2 text-center text-sm font-medium hover:bg-canvas"
          >
            My deliveries
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form
      onSubmit={confirmBooking}
      noValidate
      className="max-w-4xl space-y-6"
      aria-busy={estimating || submitting}
    >
      {(estimateError || submitError) && (
        <div aria-live="assertive">
          <Alert tone="error">{submitError ?? estimateError}</Alert>
        </div>
      )}

      {Object.values(errors).some(Boolean) && (
        <Alert tone="error">
          <div aria-labelledby="booking-errors-title">
            <p id="booking-errors-title" className="font-medium">
              Review the highlighted fields
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {Object.entries(errors).map(([field, message]) =>
                message ? (
                  <li key={field}>
                    <a href={`#${field}`} className="underline">
                      {message}
                    </a>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        </Alert>
      )}

      <Card className="space-y-8">
        <section aria-labelledby="sender-heading">
          <h2 id="sender-heading" className="text-lg font-semibold">
            Sender and pickup
          </h2>
          <p className="mt-1 text-sm text-muted">
            Who is sending the parcel and where to collect it.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField label="Sender name" htmlFor="senderName" error={errors.senderName}>
              <Input
                id="senderName"
                autoComplete="name"
                required
                maxLength={100}
                value={values.senderName}
                aria-invalid={Boolean(errors.senderName)}
                onChange={(event) => setField('senderName', event.target.value)}
              />
            </FormField>
            <FormField label="Sender phone" htmlFor="senderPhone" error={errors.senderPhone}>
              <Input
                id="senderPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="+94771234567"
                value={values.senderPhone}
                aria-invalid={Boolean(errors.senderPhone)}
                onChange={(event) => setField('senderPhone', event.target.value)}
              />
            </FormField>
            <FormField label="Pickup address" htmlFor="pickupAddress" error={errors.pickupAddress}>
              <Input
                id="pickupAddress"
                autoComplete="street-address"
                required
                maxLength={200}
                value={values.pickupAddress}
                aria-invalid={Boolean(errors.pickupAddress)}
                onChange={(event) => setField('pickupAddress', event.target.value)}
              />
            </FormField>
            <FormField label="Pickup city" htmlFor="pickupCity" error={errors.pickupCity}>
              <Input
                id="pickupCity"
                autoComplete="address-level2"
                required
                maxLength={80}
                value={values.pickupCity}
                aria-invalid={Boolean(errors.pickupCity)}
                onChange={(event) => setField('pickupCity', event.target.value)}
              />
            </FormField>
          </div>
        </section>

        <section aria-labelledby="recipient-heading" className="border-t border-line pt-8">
          <h2 id="recipient-heading" className="text-lg font-semibold">
            Recipient and drop-off
          </h2>
          <p className="mt-1 text-sm text-muted">
            Who will receive the parcel and where to deliver it.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField label="Recipient name" htmlFor="recipientName" error={errors.recipientName}>
              <Input
                id="recipientName"
                autoComplete="name"
                required
                maxLength={100}
                value={values.recipientName}
                aria-invalid={Boolean(errors.recipientName)}
                onChange={(event) => setField('recipientName', event.target.value)}
              />
            </FormField>
            <FormField
              label="Recipient phone"
              htmlFor="recipientPhone"
              error={errors.recipientPhone}
            >
              <Input
                id="recipientPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="+94771234567"
                value={values.recipientPhone}
                aria-invalid={Boolean(errors.recipientPhone)}
                onChange={(event) => setField('recipientPhone', event.target.value)}
              />
            </FormField>
            <FormField
              label="Recipient email (optional)"
              htmlFor="recipientEmail"
              error={errors.recipientEmail}
            >
              <Input
                id="recipientEmail"
                type="email"
                autoComplete="email"
                value={values.recipientEmail}
                aria-invalid={Boolean(errors.recipientEmail)}
                onChange={(event) => setField('recipientEmail', event.target.value)}
              />
            </FormField>
            <div className="hidden sm:block" aria-hidden="true" />
            <FormField
              label="Drop-off address"
              htmlFor="dropoffAddress"
              error={errors.dropoffAddress}
            >
              <Input
                id="dropoffAddress"
                autoComplete="street-address"
                required
                maxLength={200}
                value={values.dropoffAddress}
                aria-invalid={Boolean(errors.dropoffAddress)}
                onChange={(event) => setField('dropoffAddress', event.target.value)}
              />
            </FormField>
            <FormField label="Drop-off city" htmlFor="dropoffCity" error={errors.dropoffCity}>
              <Input
                id="dropoffCity"
                autoComplete="address-level2"
                required
                maxLength={80}
                value={values.dropoffCity}
                aria-invalid={Boolean(errors.dropoffCity)}
                onChange={(event) => setField('dropoffCity', event.target.value)}
              />
            </FormField>
          </div>
        </section>

        <section aria-labelledby="parcel-heading" className="border-t border-line pt-8">
          <h2 id="parcel-heading" className="text-lg font-semibold">
            Parcel details
          </h2>
          <p className="mt-1 text-sm text-muted">Size and weight determine the delivery price.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField label="Parcel size" htmlFor="size" error={errors.size}>
              <Select
                id="size"
                required
                value={values.size}
                aria-invalid={Boolean(errors.size)}
                onChange={(event) => setField('size', event.target.value as FormValues['size'])}
              >
                <option value="">Select a size</option>
                {PARCEL_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size.charAt(0) + size.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Weight (kg)"
              htmlFor="weightKg"
              error={errors.weightKg}
              help="Maximum 100 kg"
            >
              <Input
                id="weightKg"
                type="number"
                inputMode="decimal"
                min="0.01"
                max="100"
                step="0.01"
                required
                value={values.weightKg}
                aria-invalid={Boolean(errors.weightKg)}
                onChange={(event) => setField('weightKg', event.target.value)}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField
                label="Description (optional)"
                htmlFor="description"
                error={errors.description}
                help={`${values.description.length}/500 characters`}
              >
                <Textarea
                  id="description"
                  rows={3}
                  maxLength={500}
                  value={values.description}
                  aria-invalid={Boolean(errors.description)}
                  onChange={(event) => setField('description', event.target.value)}
                />
              </FormField>
            </div>
          </div>
        </section>
      </Card>

      <div className="rounded-lg border border-line bg-surface p-5" aria-live="polite">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Delivery price</h2>
            {estimate ? (
              <>
                <p className="mt-1 text-2xl font-semibold text-brand">{formatFee(estimate)}</p>
                <p className="mt-1 text-xs text-muted">Based on {estimate.ruleName}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">
                Enter both cities, size and weight to request a price.
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={estimating || submitting}
            aria-busy={estimating}
            onClick={getEstimate}
          >
            {estimating ? 'Getting price...' : estimate ? 'Refresh price' : 'Get price'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/customer"
          className="px-3 py-2 text-center text-sm font-medium text-muted hover:text-ink"
        >
          Cancel
        </Link>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={!estimate || submitting || estimating}
          aria-busy={submitting}
        >
          {submitting ? 'Confirming...' : 'Confirm booking'}
        </Button>
      </div>
    </form>
  );
}
