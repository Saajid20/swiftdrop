export default function ParcelDetailsLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Loading delivery details" aria-busy="true">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded bg-line" />
        <div className="h-4 w-72 rounded bg-line" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="h-40 rounded-lg border border-line bg-surface lg:col-span-2" />
        <div className="h-40 rounded-lg border border-line bg-surface" />
      </div>
      <div className="h-72 rounded-lg border border-line bg-surface" />
    </div>
  );
}
