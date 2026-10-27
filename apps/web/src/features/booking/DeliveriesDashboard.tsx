import type { ParcelStatus } from '@swiftdrop/contracts';
import Link from 'next/link';
import { Button, EmptyState, STATUS_LABEL, StatusBadge, Table } from '@/components/ui';
import type { components } from '@/lib/api/schema';

type DeliveryPage = components['schemas']['ParcelPageDto'];
type Delivery = components['schemas']['ParcelDto'];

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
