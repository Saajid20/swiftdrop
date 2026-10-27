import { errorCode, errorMessage } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

type EstimateRequest = components['schemas']['EstimateRequestDto'];
type Estimate = components['schemas']['EstimateResponseDto'];
type BookingPayload = components['schemas']['CreateBookingDto'];
type CreatedParcel = components['schemas']['ParcelDto'];
type ApiResult<Data> = { data?: Data; error?: unknown };
type Result<Data> = { ok: true; data: Data } | { ok: false; message: string };

export async function requestBookingEstimate(
  body: EstimateRequest,
  send: (body: EstimateRequest) => Promise<ApiResult<Estimate>>,
): Promise<Result<Estimate>> {
  try {
    const { data, error } = await send(body);
    if (data) return { ok: true, data };
    return {
      ok: false,
      message:
        errorCode(error) === 'ZONE_NOT_SERVICED'
          ? 'SwiftDrop does not currently serve one of those cities.'
          : errorMessage(error, 'Unable to calculate a price right now'),
    };
  } catch {
    return { ok: false, message: 'Unable to calculate a price right now' };
  }
}

export async function requestBookingCreation(
  body: BookingPayload,
  send: (body: BookingPayload) => Promise<ApiResult<CreatedParcel>>,
): Promise<Result<CreatedParcel>> {
  try {
    const { data, error } = await send(body);
    return data
      ? { ok: true, data }
      : { ok: false, message: errorMessage(error, 'Unable to confirm this booking') };
  } catch {
    return { ok: false, message: 'Unable to confirm this booking' };
  }
}
