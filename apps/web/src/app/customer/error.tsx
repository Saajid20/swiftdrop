'use client';

import { Alert, Button, PageHeader } from '@/components/ui';

export default function CustomerError({ reset }: { reset: () => void }) {
  return (
    <>
      <PageHeader title="My deliveries" description="Your bookings and their current status" />
      <Alert tone="error">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>We could not load your deliveries. Please try again.</span>
          <Button type="button" variant="secondary" onClick={reset}>
            Try again
          </Button>
        </div>
      </Alert>
    </>
  );
}
