'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Alert, Button, Card } from '@/components/ui';

export type ProofPhotoState =
  | { status: 'loading' }
  | { status: 'success'; url: string }
  | { status: 'unavailable' }
  | { status: 'error' };

type ProofPhotoResult =
  { status: 'success'; blob: Blob } | { status: 'unavailable' } | { status: 'error' };

export async function fetchProofPhoto(
  parcelId: string,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ProofPhotoResult> {
  try {
    const response = await request(`/api/v1/parcels/${encodeURIComponent(parcelId)}/proof/photo`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'image/*' },
      signal,
    });
    if (response.status === 404 || response.status === 204) return { status: 'unavailable' };
    if (!response.ok) return { status: 'error' };

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.startsWith('image/')) return { status: 'error' };
    const blob = await response.blob();
    return blob.size > 0 ? { status: 'success', blob } : { status: 'unavailable' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return { status: 'error' };
  }
}

export function ProofPhotoContent({
  state,
  trackingNumber,
  onRetry,
}: {
  state: ProofPhotoState;
  trackingNumber: string;
  onRetry: () => void;
}) {
  if (state.status === 'loading') {
    return (
      <div className="space-y-3" role="status" aria-live="polite">
        <p className="text-sm text-muted">Loading proof photo...</p>
        <div className="h-48 animate-pulse rounded-md bg-line sm:h-64" aria-hidden="true" />
      </div>
    );
  }

  if (state.status === 'unavailable') {
    return <Alert tone="info">A proof photo is not available for this delivered parcel yet.</Alert>;
  }

  if (state.status === 'error') {
    return (
      <Alert tone="error">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>We could not load the proof photo.</span>
          <Button type="button" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <Image
      src={state.url}
      alt={`Proof of delivery for ${trackingNumber}`}
      width={1200}
      height={900}
      unoptimized
      className="max-h-[32rem] w-full rounded-md border border-line bg-canvas object-contain"
    />
  );
}

export function ProofOfDeliveryPhoto({
  parcelId,
  trackingNumber,
}: {
  parcelId: string;
  trackingNumber: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ProofPhotoState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;

    void fetchProofPhoto(parcelId, fetch, controller.signal)
      .then((result) => {
        if (result.status === 'success') {
          objectUrl = URL.createObjectURL(result.blob);
          setState({ status: 'success', url: objectUrl });
        } else {
          setState(result);
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setState({ status: 'error' });
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attempt, parcelId]);

  return (
    <Card className="mt-5">
      <div className="mb-4">
        <h2 className="font-semibold">Proof of delivery</h2>
        <p className="mt-1 text-sm text-muted">Photo recorded when this parcel was delivered.</p>
      </div>
      <ProofPhotoContent
        state={state}
        trackingNumber={trackingNumber}
        onRetry={() => {
          setState({ status: 'loading' });
          setAttempt((current) => current + 1);
        }}
      />
    </Card>
  );
}
