import { notFound } from 'next/navigation';
import { Alert, PageHeader } from '@/components/ui';
import { ParcelDetails } from '@/features/booking/DeliveriesDashboard';
import { errorCode, errorMessage } from '@/lib/api/errors';
import { serverApi } from '@/lib/api/server';

export const metadata = { title: 'Delivery details' };

export default async function CustomerParcelsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await serverApi();
  const { data, error } = await api.GET('/api/v1/parcels/{id}', {
    params: { path: { id } },
  });

  if (errorCode(error) === 'NOT_FOUND') notFound();

  if (!data) {
    return (
      <>
        <PageHeader title="Delivery details" description="Status history and receipt" />
        <Alert tone="error">{errorMessage(error, 'Unable to load this delivery')}</Alert>
      </>
    );
  }

  return <ParcelDetails parcel={data} />;
}
