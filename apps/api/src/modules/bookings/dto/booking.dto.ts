import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PARCEL_STATUSES, type ParcelStatus } from '@swiftdrop/contracts';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQuery } from '../../../common/pagination/pagination';
import { ParcelDetailsDto, ParcelDto } from '../../parcels';

/** Customer booking = the shared parcel details. Fee is computed server-side, never sent by the client. */
export class CreateBookingDto extends ParcelDetailsDto {}

export class ListMyParcelsQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: PARCEL_STATUSES })
  @IsOptional()
  @IsIn(PARCEL_STATUSES)
  status?: ParcelStatus;
}

export class ParcelPageMetaDto {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) pageSize: number;
  @ApiProperty({ example: 3 }) total: number;
}

export class ParcelPageDto {
  @ApiProperty({ type: [ParcelDto] }) data: ParcelDto[];
  @ApiProperty({ type: ParcelPageMetaDto }) meta: ParcelPageMetaDto;
}
