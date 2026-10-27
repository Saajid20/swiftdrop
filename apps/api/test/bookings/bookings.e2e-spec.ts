import request from 'supertest';
import { createTestApp, type TestContext } from '../utils/app';

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

  beforeAll(async () => {
    t = await createTestApp();
    const customer = await t.prisma.user.findUniqueOrThrow({
      where: { email: 'customer@swiftdrop.test' },
    });
    const customer2 = await t.prisma.user.findUniqueOrThrow({
      where: { email: 'customer2@swiftdrop.test' },
    });
    const seededParcel = await t.prisma.parcel.findUniqueOrThrow({
      where: { trackingNumber: 'SD100000001' },
    });
    seededParcelId = seededParcel.id;
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
    await t.prisma.parcel.deleteMany({
      where: { id: { in: ['m03-page-a', 'm03-page-b', 'm03-customer-2'] } },
    });
    await t.close();
  });

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
