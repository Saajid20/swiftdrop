import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { fetchProofPhoto, ProofPhotoContent } from './ProofOfDeliveryPhoto';

test('loads an authenticated image response from mocked M6', async () => {
  let requestedUrl = '';
  let requestedInit: RequestInit | undefined;
  const result = await fetchProofPhoto('parcel/1', async (url, init) => {
    requestedUrl = String(url);
    requestedInit = init;
    return new Response(new Blob(['photo'], { type: 'image/jpeg' }), {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
    });
  });

  assert.equal(result.status, 'success');
  assert.equal(requestedUrl, '/api/v1/parcels/parcel%2F1/proof/photo');
  assert.equal(requestedInit?.credentials, 'include');
  assert.deepEqual(requestedInit?.headers, { Accept: 'image/*' });
});

test('distinguishes mocked M6 unavailable and failed responses', async () => {
  const unavailable = await fetchProofPhoto(
    'parcel-1',
    async () => new Response(null, { status: 404 }),
  );
  const failed = await fetchProofPhoto(
    'parcel-1',
    async () => new Response('Not implemented', { status: 501 }),
  );

  assert.deepEqual(unavailable, { status: 'unavailable' });
  assert.deepEqual(failed, { status: 'error' });
});

test('renders success, unavailable and retryable error states', () => {
  const success = renderToStaticMarkup(
    <ProofPhotoContent
      state={{ status: 'success', url: 'blob:proof-photo' }}
      trackingNumber="SD100000003"
      onRetry={() => undefined}
    />,
  );
  const unavailable = renderToStaticMarkup(
    <ProofPhotoContent
      state={{ status: 'unavailable' }}
      trackingNumber="SD100000003"
      onRetry={() => undefined}
    />,
  );
  const failed = renderToStaticMarkup(
    <ProofPhotoContent
      state={{ status: 'error' }}
      trackingNumber="SD100000003"
      onRetry={() => undefined}
    />,
  );

  assert.match(success, /src="blob:proof-photo"/);
  assert.match(success, /Proof of delivery for SD100000003/);
  assert.match(unavailable, /proof photo is not available/i);
  assert.match(failed, /could not load the proof photo/i);
  assert.match(failed, /Try again/);
});
