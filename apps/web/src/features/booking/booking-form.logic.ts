import type { components } from '@/lib/api/schema';

export type BookingPayload = components['schemas']['CreateBookingDto'];
export type FormValues = Omit<
  BookingPayload,
  'size' | 'weightKg' | 'recipientEmail' | 'description'
> & {
  size: BookingPayload['size'] | '';
  weightKg: string;
  recipientEmail: string;
  description: string;
};
export type FormErrors = Partial<Record<keyof FormValues, string>>;

const PHONE = /^\+?[0-9]{9,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ESTIMATE_FIELDS = new Set<keyof FormValues>([
  'pickupCity',
  'dropoffCity',
  'size',
  'weightKg',
]);

export const INITIAL_VALUES: FormValues = {
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

function definedErrors(errors: FormErrors): FormErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
}

export function estimateErrors(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  errors.pickupCity = textError(values.pickupCity, 'Pickup city', 2, 80);
  errors.dropoffCity = textError(values.dropoffCity, 'Drop-off city', 2, 80);
  if (!values.size) errors.size = 'Select a parcel size';
  const weight = Number(values.weightKg);
  if (!values.weightKg.trim() || !Number.isFinite(weight) || weight < 0.01 || weight > 100) {
    errors.weightKg = 'Weight must be between 0.01 kg and 100 kg';
  }
  return definedErrors(errors);
}

export function bookingErrors(values: FormValues): FormErrors {
  const estimate = estimateErrors(values);
  const errors: FormErrors = {};
  errors.senderName = textError(values.senderName, 'Sender name', 2, 100);
  if (!PHONE.test(values.senderPhone.trim())) {
    errors.senderPhone = 'Enter a valid phone number with 9 to 15 digits';
  }
  errors.pickupAddress = textError(values.pickupAddress, 'Pickup address', 5, 200);
  errors.pickupCity = estimate.pickupCity;
  errors.recipientName = textError(values.recipientName, 'Recipient name', 2, 100);
  if (!PHONE.test(values.recipientPhone.trim())) {
    errors.recipientPhone = 'Enter a valid phone number with 9 to 15 digits';
  }
  if (values.recipientEmail.trim() && !EMAIL.test(values.recipientEmail.trim())) {
    errors.recipientEmail = 'Enter a valid email address';
  }
  errors.dropoffAddress = textError(values.dropoffAddress, 'Drop-off address', 5, 200);
  errors.dropoffCity = estimate.dropoffCity;
  errors.size = estimate.size;
  errors.weightKg = estimate.weightKg;
  if (values.description.trim().length > 500) {
    errors.description = 'Description must be at most 500 characters';
  }
  return definedErrors(errors);
}

export function estimatePayload(values: FormValues): components['schemas']['EstimateRequestDto'] {
  return {
    pickupCity: values.pickupCity.trim().toLowerCase(),
    dropoffCity: values.dropoffCity.trim().toLowerCase(),
    size: values.size as BookingPayload['size'],
    weightKg: Number(values.weightKg),
  };
}

export function bookingPayload(values: FormValues): BookingPayload {
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
