import { Body, Controller, Get, Param, Post, Query, StreamableFile } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles, type AuthUser } from '../../common/auth';
import { ParcelDto } from '../parcels';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, ListMyParcelsQuery, ParcelPageDto } from './dto/booking.dto';

/** Owner: M3 */
@ApiTags('bookings')
@Controller('parcels')
@Roles('CUSTOMER')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Book a delivery (customer)' })
  @ApiCreatedResponse({ type: ParcelDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user, dto);
  }

  @Get('mine')
  @ApiOkResponse({ type: ParcelPageDto })
  listMine(@CurrentUser() user: AuthUser, @Query() q: ListMyParcelsQuery) {
    return this.bookings.listMine(user, q);
  }

  @Get(':id')
  @ApiOkResponse({ type: ParcelDto })
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bookings.getMine(user, id);
  }

  @Get(':id/receipt')
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'Parcel receipt PDF',
    schema: { type: 'string', format: 'binary' },
  })
  async receipt(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const { filename, stream } = await this.bookings.receiptPdf(user, id);
    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
