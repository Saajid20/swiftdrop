'use client';

import { Alert, Button, PageHeader } from '@/components/ui';

export default function ParcelDetailsError({ reset }: { reset: () => void }) {
  return (
    <>
      <PageHeader title="Delivery details" description="Status history and receipt" />
      <Alert tone="error">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>We could not load this delivery. Please try again.</span>
          <Button type="button" variant="secondary" onClick={reset}>
            Try again
          </Button>
        </div>
      </Alert>
    </>
  );
}
