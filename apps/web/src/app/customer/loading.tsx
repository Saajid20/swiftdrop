/** Applies to every /customer page; the skeleton matches the deliveries list, the most common one. */
export default function CustomerLoading() {
  return (
    <div className="animate-pulse" aria-label="Loading" aria-busy="true">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded bg-line" />
          <div className="h-4 w-64 rounded bg-line" />
        </div>
        <div className="h-9 w-32 rounded bg-line" />
      </div>
      <div className="mb-5 h-10 w-72 rounded bg-line" />
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="h-10 bg-canvas" />
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="grid grid-cols-5 gap-4 border-t border-line px-4 py-4">
            {[1, 2, 3, 4, 5].map((cell) => (
              <div key={cell} className="h-4 rounded bg-line" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
