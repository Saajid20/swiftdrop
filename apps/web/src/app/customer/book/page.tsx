import { PageHeader } from '@/components/ui';
import { BookingForm } from '@/features/booking/BookingForm';

export const metadata = { title: 'Book a delivery' };

export default function CustomerBookPage() {
  return (
    <>
      <PageHeader
        title="Book a delivery"
        description="Enter the route and parcel details, then get the current delivery price."
      />
      <BookingForm />
    </>
  );
}
