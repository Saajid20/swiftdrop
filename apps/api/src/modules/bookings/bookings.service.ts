import { Injectable } from '@nestjs/common';
import type { Paginated } from '@swiftdrop/contracts';
import type { Prisma } from '@swiftdrop/db';
import type { Readable } from 'node:stream';
import type { AuthUser } from '../../common/auth';
import { notFound } from '../../common/errors/app-error';
import { paginated } from '../../common/pagination/pagination';
import { PrismaService } from '../../infra/prisma';
import { ParcelsService, type ParcelDto } from '../parcels';
import { toParcelDto } from './bookings.mapper';
import { createReceiptPdf } from './bookings.receipt';
import type {
  CreateBookingDto,
  CustomerParcelDetailDto,
  ListMyParcelsQuery,
} from './dto/booking.dto';

/**
 * Customer-facing booking flow. Delegates creation to ParcelsService (M4) and fees to
 * PricingService (M7). Every query MUST be scoped to `customerId = user.id`. Owner: M3.
 */
@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parcels: ParcelsService,
  ) {}

  async create(user: AuthUser, dto: CreateBookingDto): Promise<ParcelDto> {
    const parcel = await this.parcels.create(
      { ...dto, source: 'CUSTOMER', customerId: user.id },
      user.role,
    );
    return toParcelDto(parcel);
  }

  async listMine(user: AuthUser, q: ListMyParcelsQuery): Promise<Paginated<ParcelDto>> {
    const where: Prisma.ParcelWhereInput = {
      customerId: user.id,
      ...(q.status ? { status: q.status } : {}),
    };
    const [parcels, total] = await this.prisma.$transaction([
      this.prisma.parcel.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.parcel.count({ where }),
    ]);

    return paginated(parcels.map(toParcelDto), total, q);
  }

  /** 404 (not 403) when the parcel belongs to someone else — don't leak existence. */
  async getMine(user: AuthUser, id: string): Promise<CustomerParcelDetailDto> {
    const parcel = await this.prisma.parcel.findFirst({
      where: { id, customerId: user.id },
      include: {
        statusHistory: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!parcel) throw notFound('Parcel');

    return {
      ...toParcelDto(parcel),
      history: parcel.statusHistory.map((entry) => ({
        status: entry.toStatus,
        at: entry.createdAt,
        reason: entry.reason,
      })),
    };
  }

  /** PDF receipt via pdfkit. */
  async receiptPdf(user: AuthUser, id: string): Promise<{ filename: string; stream: Readable }> {
    const parcel = await this.prisma.parcel.findFirst({
      where: { id, customerId: user.id },
    });
    if (!parcel) throw notFound('Parcel');

    return {
      filename: `swiftdrop-receipt-${parcel.trackingNumber}.pdf`,
      stream: createReceiptPdf(parcel),
    };
  }
}
