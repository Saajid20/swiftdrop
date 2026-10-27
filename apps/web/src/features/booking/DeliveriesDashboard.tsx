import type { ParcelStatus } from '@swiftdrop/contracts';
import Link from 'next/link';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  STATUS_LABEL,
  StatusBadge,
  Table,
} from '@/components/ui';
import type { components } from '@/lib/api/schema';

type DeliveryPage = components['schemas']['ParcelPageDto'];
type Delivery = components['schemas']['ParcelDto'];
type CustomerParcel = components['schemas']['CustomerParcelDetailDto'];

function formatFee(feeCents: number, currency: string) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(feeCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

function pageHref(page: number, status?: ParcelStatus) {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set('status', status);
  return `/customer?${params.toString()}`;
}

const linkButton =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition';

export function BookingLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/customer/book"
      className={`${linkButton} bg-brand text-white hover:bg-brand-dark ${compact ? 'px-3 py-1.5' : ''}`}
    >
      Book a delivery
    </Link>
  );
}

export function DeliveriesDashboard({
  result,
  status,
}: {
  result: DeliveryPage;
  status?: ParcelStatus;
}) {
  const { data: deliveries, meta } = result;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const columns = [
    {
      header: 'Tracking number',
      cell: (delivery: Delivery) => (
        <Link
          href={`/customer/parcels/${delivery.id}`}
          className="font-medium text-brand hover:text-brand-dark"
        >
          {delivery.trackingNumber}
        </Link>
      ),
    },
    {
      header: 'Recipient city',
      cell: (delivery: Delivery) => delivery.dropoffCity,
    },
    {
      header: 'Status',
      cell: (delivery: Delivery) => <StatusBadge status={delivery.status} />,
    },
    {
      header: 'Booked',
      cell: (delivery: Delivery) => formatDate(delivery.createdAt),
      className: 'whitespace-nowrap px-4 py-3 text-muted',
    },
    {
      header: 'Fee',
      cell: (delivery: Delivery) => formatFee(delivery.feeCents, delivery.currency),
      className: 'whitespace-nowrap px-4 py-3 font-medium',
    },
  ];

  return (
    <div className="space-y-5">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="status">
          Status
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className="min-w-48 rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Apply filter
        </Button>
        {status && (
          <Link href="/customer" className="px-2 py-2 text-sm font-medium text-brand">
            Clear
          </Link>
        )}
      </form>

      <Table
        columns={columns}
        rows={deliveries}
        rowKey={(delivery) => delivery.id}
        empty={
          <EmptyState
            title={status ? 'No deliveries match this status' : 'No deliveries yet'}
            description={
              status
                ? 'Try another status or clear the filter.'
                : 'Book your first delivery to receive a tracking number.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-3">
                {status && (
                  <Link
                    href="/customer"
                    className={`${linkButton} border border-line bg-surface text-ink hover:bg-canvas`}
                  >
                    Clear filter
                  </Link>
                )}
                <BookingLink />
              </div>
            }
          />
        }
      />

      {meta.total > 0 && (
        <nav
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
          aria-label="Delivery pages"
        >
          <p className="text-muted">
            Page {meta.page} of {totalPages}, {meta.total} deliveries
          </p>
          <div className="flex gap-2">
            {meta.page > 1 ? (
              <Link
                href={pageHref(meta.page - 1, status)}
                className={`${linkButton} border border-line bg-surface text-ink hover:bg-canvas`}
              >
                Previous
              </Link>
            ) : (
              <span className={`${linkButton} cursor-not-allowed bg-canvas text-muted opacity-60`}>
                Previous
              </span>
            )}
            {meta.page < totalPages ? (
              <Link
                href={pageHref(meta.page + 1, status)}
                className={`${linkButton} border border-line bg-surface text-ink hover:bg-canvas`}
              >
                Next
              </Link>
            ) : (
              <span className={`${linkButton} cursor-not-allowed bg-canvas text-muted opacity-60`}>
                Next
              </span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

export function ParcelDetails({ parcel }: { parcel: CustomerParcel }) {
  return (
    <div>
      <PageHeader
        title={parcel.trackingNumber}
        description={`${parcel.pickupCity} to ${parcel.dropoffCity}`}
        actions={
          <a
            href={`/api/v1/parcels/${parcel.id}/receipt`}
            aria-label={`Download receipt for ${parcel.trackingNumber}`}
            className={`${linkButton} bg-brand text-white hover:bg-brand-dark`}
          >
            Download receipt
          </a>
        }
      />

      <Link href="/customer" className="mb-5 inline-block text-sm font-medium text-brand">
        ← Back to my deliveries
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Current status</p>
              <div className="mt-2">
                <StatusBadge status={parcel.status} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted">Delivery fee</p>
              <p className="mt-1 text-lg font-semibold">
                {formatFee(parcel.feeCents, parcel.currency)}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
            <Detail label="Sender">{parcel.senderName}</Detail>
            <Detail label="Recipient">{parcel.recipientName}</Detail>
            <Detail label="Pickup">
              {parcel.pickupAddress}, {parcel.pickupCity}
            </Detail>
            <Detail label="Drop-off">
              {parcel.dropoffAddress}, {parcel.dropoffCity}
            </Detail>
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold">Parcel</h2>
          <dl className="mt-4 space-y-4">
            <Detail label="Size">{parcel.size.toLowerCase()}</Detail>
            <Detail label="Weight">{parcel.weightKg} kg</Detail>
            <Detail label="Booked">{formatDateTime(parcel.createdAt)}</Detail>
            {parcel.deliveredAt && (
              <Detail label="Delivered">{formatDateTime(parcel.deliveredAt)}</Detail>
            )}
          </dl>
        </Card>
      </div>

      <Card className="mt-5">
        <div>
          <h2 className="font-semibold">Status timeline</h2>
          <p className="mt-1 text-sm text-muted">Status updates recorded for this delivery.</p>
        </div>

        {parcel.history.length > 0 ? (
          <ol className="mt-6 space-y-5">
            {parcel.history.map((entry, index) => (
              <li key={`${entry.status}-${entry.at}`} className="relative flex gap-4">
                {index < parcel.history.length - 1 && (
                  <span
                    className="absolute left-2 top-5 h-[calc(100%+0.25rem)] w-px bg-line"
                    aria-hidden="true"
                  />
                )}
                <span
                  className="relative mt-1.5 h-4 w-4 shrink-0 rounded-full border-4 border-brand-soft bg-brand"
                  aria-hidden="true"
                />
                <div className="min-w-0 pb-1">
                  <p className="font-medium">{STATUS_LABEL[entry.status as ParcelStatus]}</p>
                  <time className="text-sm text-muted" dateTime={entry.at}>
                    {formatDateTime(entry.at)}
                  </time>
                  {entry.reason && <p className="mt-1 text-sm text-muted">{entry.reason}</p>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-5 text-sm text-muted">No status updates are available yet.</p>
        )}
      </Card>
    </div>
  );
}
