# M03: Customer portal & booking

> **Kick-off prompt for your agent**
> "I am M3 on SwiftDrop. Read AGENTS.md, then docs/members/M03-customer-booking.md, docs/conventions/api.md
> and docs/conventions/frontend.md. Implement my Week-N tasks only inside my owned paths. Find stubs with
> `grep -rn "TODO(M3)\|notImplemented('M3')" apps`. Write unit + integration tests including negative
> authorization cases, then run `make check`."

## Mission

The customer journey: register/login → enter pickup and destination → **estimate the fee** → confirm
the booking → get a **tracking number** → follow its status → **download a receipt**.

## You own

- API: `apps/api/src/modules/bookings/`, `apps/api/test/bookings/`
- Web: `src/app/page.tsx` (landing), `src/app/customer/**`, `src/features/booking/`
- Co-owner (with M4) of the booking fields on `Parcel` in `parcel.prisma`. Coordinate any change with M4.

## Interfaces you consume

| From | Interface                                                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M4   | `ParcelsService.create({ ...details, source: 'CUSTOMER', customerId }, 'CUSTOMER')` returns the Parcel (computes the fee, tracking number, history, event) |
| M4   | `ParcelDetailsDto`, `ParcelDto` (import from `'../parcels'`), and the live-tracking component/hook in `src/features/tracking/`                             |
| M7   | `POST /pricing/estimate` (the web calls it directly for the quote)                                                                                         |
| M2   | session (`@CurrentUser()`), `/login`, `/register`                                                                                                          |
| M6   | `GET /parcels/:id/proof/photo` (show the proof on a delivered parcel)                                                                                      |

You **don't** compute fees or create parcels yourself. M4 and M7 own those rules.

## Endpoints (stubs exist in `bookings.controller.ts`)

| Endpoint                   | Behaviour                                                                                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /parcels`            | Validate `CreateBookingDto` → `parcels.create(...)` → return `ParcelDto` (201).                                                                                                                                              |
| `GET /parcels/mine`        | Paginated list, `where: { customerId: user.id }`, optional `status` filter, newest first.                                                                                                                                    |
| `GET /parcels/:id`         | Own parcel plus its status history. Someone else's parcel → **404**.                                                                                                                                                         |
| `GET /parcels/:id/receipt` | PDF built with `pdfkit` (already installed): SwiftDrop header, tracking number, date, sender/recipient city, size and weight, fee (LKR, from cents), status. File name `swiftdrop-receipt-<tracking>.pdf`. Own parcels only. |

Write a `toParcelDto()` mapper. Never return the Prisma row as is: it has `internalNotes`.

## Web pages

| Route                    | Content                                                                                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                      | Landing with the tracking form (M4's component) and CTAs. Keep it simple.                                                                                                                                                          |
| `/customer`              | "My deliveries" table: tracking number, recipient city, `StatusBadge`, date, fee. Status filter, pagination, empty state with a "Book a delivery" CTA.                                                                             |
| `/customer/book`         | Multi-section form (sender, pickup, recipient, drop-off, size/weight/description). "Get price" → estimate → show the fee → "Confirm booking" → success screen with the tracking number and links. Show `ZONE_NOT_SERVICED` nicely. |
| `/customer/parcels/[id]` | Details, status timeline, live status (embed M4's tracking component), receipt download button, proof photo when delivered.                                                                                                        |

Mobile-friendly. Use the `@/components/ui` kit. Validate on the client for UX, but the server is the authority.

## Tests required

- Unit: the DTO → `CreateParcelInput` mapping; the receipt content builder (amount formatting).
- Integration (`test/bookings/`):
  - customer books a parcel → 201 with a tracking number, a fee computed by the server, status CREATED;
  - a client-sent `feeCents` is rejected (400, forbidden property);
  - `/parcels/mine` only lists own parcels;
  - customer2 → customer's parcel and receipt = **404**;
  - COURIER/MERCHANT → `POST /parcels` = 403;
  - receipt returns `application/pdf`.
- E2E (with M10): `apps/e2e/tests/customer-booking.spec.ts`, covering login → book → see tracking number → open details.

## Week-by-week

| Week | Tasks                                                                                                                                    | Exit                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1    | Agree booking fields with M4 and the estimate contract with M7. Sketch pages.                                                            | Contracts agreed                                             |
| 2    | `POST /parcels` + `/parcels/mine` (as soon as M4's `create` lands; stub it locally in tests until then). Booking form wired to estimate. | **A customer can create a parcel and get a tracking number** |
| 3    | Customer history list, detail page, tracking UI integration                                                                              | Booking visible to the dispatcher queue                      |
| 4    | Live status on the detail page (M4's SSE hook)                                                                                           | Status changes appear live                                   |
| 5    | Receipt PDF                                                                                                                              | Receipt downloads                                            |
| 6    | Validation edge cases, empty and error states, responsive polish                                                                         | Journey complete                                             |
| 7    | Tests and E2E booking spec, bug fixes                                                                                                    | Green                                                        |
| 8    | Demo steps 1–2, docs                                                                                                                     | —                                                            |

## Status / notes

- 2026-10-27: Completed the "My deliveries" vertical slice. `GET /parcels/mine` now returns an
  explicitly mapped, paginated customer-only projection with optional status filtering and stable
  newest-first ordering. The customer dashboard includes filtering, pagination, loading, error and
  empty states, plus booking and parcel-detail links.
- Added unit and integration coverage for the mapper, customer isolation, role restrictions,
  filtering, pagination and exclusion of private parcel fields.
- 2026-10-27: Added authorized PDF receipts for customer-owned parcels, with deterministic filenames,
  privacy-safe content and LKR minor-unit formatting. Integration coverage verifies PDF responses,
  cross-customer 404 behavior and non-customer role denial.
- 2026-10-27: Added the customer booking form and `POST /parcels` wrapper. The form validates all
  booking fields, requests real M7 estimates, invalidates stale estimates and only shows success
  after M4 returns a created parcel. Wrapper tests mock M4 only and cover field mapping, ownership,
  role restrictions and rejection of client-sent fees.
- 2026-10-27: Added the authorized customer parcel detail slice. `GET /parcels/:id` scopes the
  lookup to the authenticated customer and exposes an explicit parcel projection plus ordered,
  privacy-safe persisted status history. `/customer/parcels/[id]` now shows delivery details, the
  status timeline and an authorized receipt download, with loading, error and not-found handling.
- No M4 contract change was needed for the static timeline: the M03 response extends the exported
  parcel DTO with an additive customer-detail response shaped consistently with M4's tracking DTO
  and reads the append-only history relation.
- 2026-10-27: Hardened the customer booking UI for the PR. Invalid submissions now show a linked
  error summary and focus the first invalid field; estimate/submit busy states are announced and
  conflicting actions are disabled. Success and action layouts now remain usable on narrow screens.
- Added focused web tests around validation and payload normalization, mocked M7 estimate success
  and failure, mocked M4 booking success and failure, and mocked M6 proof-photo success, unavailable
  and request-failure responses. The API integration suite explicitly labels its mocked M4 creation
  dependency and verifies the 201 response includes M4's tracking number and server-calculated fee.
- Delivered parcel details now request `GET /parcels/:id/proof/photo` with the authenticated
  same-origin cookie, keep the storage location private, render the returned image through a local
  object URL, and distinguish loading, unavailable and retryable failure states. This UI is complete,
  but the live endpoint still fails until M6 implements `CourierService.proofPhoto()`.
- M4 currently provides only `features/tracking/TrackForm.tsx`; no reusable live-tracking hook or
  customer detail component exists. The exact integration point is `ParcelDetails` in
  `features/booking/DeliveriesDashboard.tsx`: pass `parcel.trackingNumber` to M4's future hook beside
  the current-status summary, while retaining the persisted API timeline as the initial/fallback
  history. No M4 files or invented events were added.
- The M10-owned Playwright journey was not edited. Coordinate a customer flow covering login,
  successful estimate, booking, details, receipt and cross-customer denial once M4/M7 are live.
- Remaining blockers: booking confirmation requires M4's `ParcelsService.create()` implementation;
  price estimates require M7's `PricingService.estimate()` implementation; detail-page live status
  requires M4's tracking hook and SSE implementation. Ask M4 to provide the reusable customer-safe
  tracking component/hook promised by the module interface once SSE/public tracking is implemented.
  The proof display remains runtime-blocked on M6 implementing the authorized
  `GET /parcels/:id/proof/photo` stream; it reports the failure and does not infer proof existence or
  request a fake image while that service method is unfinished.
- **Review fixes (merge):** integration tests no longer hard-code the seeded parcel count, and now
  cover 401 on all four endpoints, 403 for DISPATCHER/ADMIN, and 400 for bad list queries and
  incomplete bookings. The customer-wide `loading.tsx`/`error.tsx` copy is generic (they also apply
  to `/customer/book`), and the receipt link is URL-encoded.
- **Known gaps:** the `features/booking/*.test.ts(x)` files use `node:test`, but `apps/web` has no
  test runner yet (`pnpm test` only echoes), so they do not run in `make test` or CI. Ask M10 for a
  web runner (e.g. vitest). `POST /parcels` and the estimate button only work end to end once M4's
  `ParcelsService.create` and M7's `PricingService.estimate` are on main. Live tracking on the
  detail page can use M4's `useLiveTracking` from `@/features/tracking` once PR #3 is merged.
