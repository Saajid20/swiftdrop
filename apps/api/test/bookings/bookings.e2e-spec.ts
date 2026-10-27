import request from 'supertest';
import { ParcelsService } from '../../src/modules/parcels';
import { createTestApp, type TestContext } from '../utils/app';

const VALID_BOOKING = {
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
} as const;

const RESPONSE_FIELDS = [
  'id',
  'trackingNumber',
  'status',
  'senderName',
  'pickupAddress',
  'pickupCity',
  'recipientName',
  'dropoffAddress',
  'dropoffCity',
  'size',
  'weightKg',
  'feeCents',
  'currency',
  'createdAt',
  'deliveredAt',
].sort();

describe('customer bookings', () => {
  let t: TestContext;
  let seededParcelId: string;
  let historyParcelId: string;
  let customerId: string;
  let createParcel: jest.SpiedFunction<ParcelsService['create']>;

  beforeAll(async () => {
    t = await createTestApp();
    const customer = await t.prisma.user.findUniqueOrThrow({
      where: { email: 'customer@swiftdrop.test' },
    });
    customerId = customer.id;
    const customer2 = await t.prisma.user.findUniqueOrThrow({
      where: { email: 'customer2@swiftdrop.test' },
    });
    const seededParcel = await t.prisma.parcel.findUniqueOrThrow({
      where: { trackingNumber: 'SD100000001' },
    });
    seededParcelId = seededParcel.id;
    const historyParcel = await t.prisma.parcel.findUniqueOrThrow({
      where: { trackingNumber: 'SD100000002' },
    });
    historyParcelId = historyParcel.id;
    createParcel = jest.spyOn(t.app.get(ParcelsService), 'create').mockResolvedValue(seededParcel);
    const common = {
      senderName: 'M03 Sender',
      senderPhone: '+94770000001',
      pickupAddress: '12 Galle Road',
      pickupCity: 'colombo',
      recipientName: 'M03 Recipient',
      recipientPhone: '+94770000002',
      recipientEmail: 'private@example.com',
      dropoffAddress: '5 Temple Street',
      dropoffCity: 'kandy',
      size: 'SMALL' as const,
      weightKg: 1.5,
      description: 'Private description',
      feeCents: 52500,
      internalNotes: 'Private operations note',
      createdAt: new Date('2030-01-01T00:00:00.000Z'),
    };

    await t.prisma.parcel.createMany({
      data: [
        {
          ...common,
          id: 'm03-page-a',
          trackingNumber: 'SD900000001',
          customerId: customer.id,
        },
        {
          ...common,
          id: 'm03-page-b',
          trackingNumber: 'SD900000002',
          customerId: customer.id,
        },
        {
          ...common,
          id: 'm03-customer-2',
          trackingNumber: 'SD900000003',
          customerId: customer2.id,
        },
      ],
    });
  });

  afterAll(async () => {
    createParcel.mockRestore();
    await t.prisma.parcel.deleteMany({
      where: { id: { in: ['m03-page-a', 'm03-page-b', 'm03-customer-2'] } },
    });
    await t.close();
  });

  beforeEach(() => createParcel.mockClear());

  it('maps a customer booking to ParcelsService without accepting ownership or fee fields', async () => {
    const response = await request(t.http)
      .post('/api/v1/parcels')
      .set('Cookie', await t.cookieFor('CUSTOMER', 'customer@swiftdrop.test'))
      .send(VALID_BOOKING)
      .expect(201);

    expect(createParcel).toHaveBeenCalledWith(
      { ...VALID_BOOKING, source: 'CUSTOMER', customerId },
      'CUSTOMER',
    );
    expect(response.body).toMatchObject({ trackingNumber: 'SD100000001', status: 'CREATED' });
  });

  it('rejects a client-sent fee before parcel creation', async () => {
    const response = await request(t.http)
      .post('/api/v1/parcels')
      .set('Cookie', await t.cookieFor('CUSTOMER', 'customer@swiftdrop.test'))
      .send({ ...VALID_BOOKING, feeCents: 1 })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(createParcel).not.toHaveBeenCalled();
  });

  it.each(['COURIER', 'MERCHANT'] as const)(
    'denies the %s role from booking parcels',
    async (role) => {
      const response = await request(t.http)
        .post('/api/v1/parcels')
        .set('Cookie', await t.cookieFor(role))
        .send(VALID_BOOKING)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(createParcel).not.toHaveBeenCalled();
    },
  );

  it('lists only the authenticated customer parcels and excludes private fields', async () => {
    const response = await request(t.http)
      .get('/api/v1/parcels/mine?pageSize=100')
      .set('Cookie', await t.cookieFor('CUSTOMER', 'customer@swiftdrop.test'))
      .expect(200);

    expect(response.body.data).toHaveLength(5);
    expect(response.body.data.map((parcel: { id: string }) => parcel.id)).not.toContain(
      'm03-customer-2',
    );
    for (const parcel of response.body.data) {
      expect(Object.keys(parcel).sort()).toEqual(RESPONSE_FIELDS);
    }
  });

  it('filters parcels by status', async () => {
    const response = await request(t.http)
      .get('/api/v1/parcels/mine?status=IN_TRANSIT')
      .set('Cookie', await t.cookieFor('CUSTOMER', 'customer@swiftdrop.test'))
      .expect(200);

    expect(response.body.meta.total).toBe(1);
    expect(response.body.data).toEqual([
      expect.objectContaining({ trackingNumber: 'SD100000002', status: 'IN_TRANSIT' }),
    ]);
  });

  it('paginates with deterministic newest-first ordering', async () => {
    const cookie = await t.cookieFor('CUSTOMER', 'customer@swiftdrop.test');
    const first = await request(t.http)
      .get('/api/v1/parcels/mine?page=1&pageSize=1')
      .set('Cookie', cookie)
      .expect(200);
    const second = await request(t.http)
      .get('/api/v1/parcels/mine?page=2&pageSize=1')
      .set('Cookie', cookie)
      .expect(200);

    expect(first.body).toMatchObject({
      data: [expect.objectContaining({ id: 'm03-page-b' })],
      meta: { page: 1, pageSize: 1, total: 5 },
    });
    expect(second.body).toMatchObject({
      data: [expect.objectContaining({ id: 'm03-page-a' })],
      meta: { page: 2, pageSize: 1, total: 5 },
    });
  });

  it.each(['COURIER', 'MERCHANT'] as const)('rejects the %s role', async (role) => {
    const response = await request(t.http)
      .get('/api/v1/parcels/mine')
      .set('Cookie', await t.cookieFor(role))
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns an owned parcel with ordered privacy-safe status history', async () => {
    const response = await request(t.http)
      .get(`/api/v1/parcels/${historyParcelId}`)
      .set('Cookie', await t.cookieFor('CUSTOMER', 'customer@swiftdrop.test'))
      .expect(200);

    expect(response.body).toMatchObject({
      id: historyParcelId,
      trackingNumber: 'SD100000002',
      status: 'IN_TRANSIT',
    });
    expect(response.body.history.map((entry: { status: string }) => entry.status)).toEqual([
      'CREATED',
      'PICKED_UP',
      'IN_TRANSIT',
    ]);
    for (const entry of response.body.history) {
      expect(Object.keys(entry).sort()).toEqual(['at', 'reason', 'status']);
    }
    expect(response.body).not.toHaveProperty('senderPhone');
    expect(response.body).not.toHaveProperty('recipientPhone');
    expect(response.body).not.toHaveProperty('recipientEmail');
    expect(response.body).not.toHaveProperty('description');
    expect(response.body).not.toHaveProperty('internalNotes');
  });

  it("returns 404 for another customer's parcel details", async () => {
    const response = await request(t.http)
      .get(`/api/v1/parcels/${seededParcelId}`)
      .set('Cookie', await t.cookieFor('CUSTOMER', 'customer2@swiftdrop.test'))
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it.each(['COURIER', 'MERCHANT'] as const)(
    'denies the %s role access to customer parcel details',
    async (role) => {
      const response = await request(t.http)
        .get(`/api/v1/parcels/${seededParcelId}`)
        .set('Cookie', await t.cookieFor(role))
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    },
  );

  it('returns an authorized parcel receipt as a PDF attachment', async () => {
    const response = await request(t.http)
      .get(`/api/v1/parcels/${seededParcelId}/receipt`)
      .set('Cookie', await t.cookieFor('CUSTOMER', 'customer@swiftdrop.test'))
      .expect(200)
      .expect('Content-Type', /application\/pdf/)
      .expect('Content-Disposition', 'attachment; filename="swiftdrop-receipt-SD100000001.pdf"');

    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it("returns 404 for another customer's parcel receipt", async () => {
    const response = await request(t.http)
      .get(`/api/v1/parcels/${seededParcelId}/receipt`)
      .set('Cookie', await t.cookieFor('CUSTOMER', 'customer2@swiftdrop.test'))
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it.each(['COURIER', 'MERCHANT'] as const)(
    'denies the %s role access to customer receipts',
    async (role) => {
      const response = await request(t.http)
        .get(`/api/v1/parcels/${seededParcelId}/receipt`)
        .set('Cookie', await t.cookieFor(role))
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    },
  );
});
