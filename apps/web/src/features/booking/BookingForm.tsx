'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { PARCEL_SIZES } from '@swiftdrop/contracts';
import { Alert, Button, Card, FormField, Input, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api/client';
import { errorCode, errorMessage } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

type BookingPayload = components['schemas']['CreateBookingDto'];
type Estimate = components['schemas']['EstimateResponseDto'];
type CreatedParcel = components['schemas']['ParcelDto'];
type FormValues = Omit<BookingPayload, 'size' | 'weightKg' | 'recipientEmail' | 'description'> & {
  size: BookingPayload['size'] | '';
  weightKg: string;
  recipientEmail: string;
  description: string;
};
type FormErrors = Partial<Record<keyof FormValues, string>>;

const PHONE = /^\+?[0-9]{9,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ESTIMATE_FIELDS = new Set<keyof FormValues>([
  'pickupCity',
  'dropoffCity',
  'size',
  'weightKg',
]);

const INITIAL_VALUES: FormValues = {
  senderName: '',
  senderPhone: '',
  pickupAddress: '',
  pickupCity: '',
  recipientName: '',
  recipientPhone: '',
  recipientEmail: '',
  dropoffAddress: '',
  dropoffCity: '',
  size: '',
  weightKg: '',
  description: '',
};

function textError(value: string, label: string, min: number, max: number) {
  const length = value.trim().length;
  if (length < min) return `${label} must be at least ${min} characters`;
  if (length > max) return `${label} must be at most ${max} characters`;
  return undefined;
}

function estimateErrors(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  errors.pickupCity = textError(values.pickupCity, 'Pickup city', 2, 80);
  errors.dropoffCity = textError(values.dropoffCity, 'Drop-off city', 2, 80);
  if (!values.size) errors.size = 'Select a parcel size';
  const weight = Number(values.weightKg);
  if (!values.weightKg.trim() || !Number.isFinite(weight) || weight < 0.01 || weight > 100) {
    errors.weightKg = 'Weight must be between 0.01 kg and 100 kg';
  }
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
}

function bookingErrors(values: FormValues): FormErrors {
  const errors = estimateErrors(values);
  errors.senderName = textError(values.senderName, 'Sender name', 2, 100);
  errors.pickupAddress = textError(values.pickupAddress, 'Pickup address', 5, 200);
  errors.recipientName = textError(values.recipientName, 'Recipient name', 2, 100);
  errors.dropoffAddress = textError(values.dropoffAddress, 'Drop-off address', 5, 200);
  if (!PHONE.test(values.senderPhone.trim())) {
    errors.senderPhone = 'Enter a valid phone number with 9 to 15 digits';
  }
  if (!PHONE.test(values.recipientPhone.trim())) {
    errors.recipientPhone = 'Enter a valid phone number with 9 to 15 digits';
  }
  if (values.recipientEmail.trim() && !EMAIL.test(values.recipientEmail.trim())) {
    errors.recipientEmail = 'Enter a valid email address';
  }
  if (values.description.length > 500) {
    errors.description = 'Description must be at most 500 characters';
  }
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
}

function estimatePayload(values: FormValues): components['schemas']['EstimateRequestDto'] {
  return {
    pickupCity: values.pickupCity.trim().toLowerCase(),
    dropoffCity: values.dropoffCity.trim().toLowerCase(),
    size: values.size as BookingPayload['size'],
    weightKg: Number(values.weightKg),
  };
}

function bookingPayload(values: FormValues): BookingPayload {
  return {
    senderName: values.senderName.trim(),
    senderPhone: values.senderPhone.trim(),
    pickupAddress: values.pickupAddress.trim(),
    pickupCity: values.pickupCity.trim().toLowerCase(),
    recipientName: values.recipientName.trim(),
    recipientPhone: values.recipientPhone.trim(),
    ...(values.recipientEmail.trim() ? { recipientEmail: values.recipientEmail.trim() } : {}),
    dropoffAddress: values.dropoffAddress.trim(),
    dropoffCity: values.dropoffCity.trim().toLowerCase(),
    size: values.size as BookingPayload['size'],
    weightKg: Number(values.weightKg),
    ...(values.description.trim() ? { description: values.description.trim() } : {}),
  };
}

function formatFee(estimate: Estimate) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: estimate.currency,
    minimumFractionDigits: 2,
  }).format(estimate.feeCents / 100);
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
    if (Object.keys(nextErrors).length > 0) return;

    const revision = estimateRevision.current;
    setEstimating(true);
    setEstimateError(undefined);
    try {
      const { data, error } = await api.POST('/api/v1/pricing/estimate', {
        body: estimatePayload(values),
      });
      if (estimateRevision.current !== revision) return;
      if (data) {
        setEstimate(data);
      } else {
        setEstimateError(
          errorCode(error) === 'ZONE_NOT_SERVICED'
            ? 'SwiftDrop does not currently serve one of those cities.'
            : errorMessage(error, 'Unable to calculate a price right now'),
        );
      }
    } catch {
      if (estimateRevision.current === revision) {
        setEstimateError('Unable to calculate a price right now');
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
    if (Object.keys(nextErrors).length > 0) return;
    if (!estimate) {
      setSubmitError('Get an up-to-date price before confirming this booking.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await api.POST('/api/v1/parcels', {
        body: bookingPayload(values),
      });
      if (data) {
        setCreated(data);
        router.refresh();
      } else {
        setSubmitError(errorMessage(error, 'Unable to confirm this booking'));
      }
    } catch {
      setSubmitError('Unable to confirm this booking');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Card className="max-w-2xl">
        <Alert tone="success">Your delivery has been booked.</Alert>
        <h2 className="mt-5 text-xl font-semibold">Tracking number</h2>
        <p className="mt-2 font-mono text-2xl font-semibold tracking-wide">
          {created.trackingNumber}
        </p>
        <p className="mt-2 text-sm text-muted">
          Keep this number to follow the delivery from pickup to completion.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/customer/parcels/${created.id}`}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            View delivery
          </Link>
          <Link
            href="/customer"
            className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-canvas"
          >
            My deliveries
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={confirmBooking} noValidate className="max-w-4xl space-y-6">
      {(estimateError || submitError) && <Alert tone="error">{submitError ?? estimateError}</Alert>}

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

      <div className="rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
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
          <Button type="button" variant="secondary" disabled={estimating} onClick={getEstimate}>
            {estimating ? 'Getting price...' : estimate ? 'Refresh price' : 'Get price'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/customer" className="px-3 py-2 text-sm font-medium text-muted hover:text-ink">
          Cancel
        </Link>
        <Button type="submit" disabled={!estimate || submitting || estimating}>
          {submitting ? 'Confirming...' : 'Confirm booking'}
        </Button>
      </div>
    </form>
  );
}
