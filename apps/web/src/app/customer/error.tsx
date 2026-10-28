'use client';

import { Alert, Button } from '@/components/ui';

/** Applies to every /customer page, so the copy stays generic. */
export default function CustomerError({ reset }: { reset: () => void }) {
  return (
    <>
      <Alert tone="error">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>We could not load this page. Please try again.</span>
          <Button type="button" variant="secondary" onClick={reset}>
            Try again
          </Button>
        </div>
      </Alert>
    </>
  );
}
