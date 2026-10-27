import type { Parcel } from '@swiftdrop/db';
import type { ParcelDto } from '../parcels';

export function toParcelDto(parcel: Parcel): ParcelDto {
  return {
    id: parcel.id,
    trackingNumber: parcel.trackingNumber,
    status: parcel.status,
    senderName: parcel.senderName,
    pickupAddress: parcel.pickupAddress,
    pickupCity: parcel.pickupCity,
    recipientName: parcel.recipientName,
    dropoffAddress: parcel.dropoffAddress,
    dropoffCity: parcel.dropoffCity,
    size: parcel.size,
    weightKg: Number(parcel.weightKg),
    feeCents: parcel.feeCents,
    currency: parcel.currency,
    createdAt: parcel.createdAt,
    deliveredAt: parcel.deliveredAt,
  };
}
