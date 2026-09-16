export default function VaultLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading the Vault">
      <div className="space-y-2">
        <div className="skeleton h-7 w-36" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="plate flex items-center gap-5 p-6">
        <div className="skeleton size-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-9 w-24" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="plate space-y-3 p-4">
            <div className="flex gap-3">
              <div className="skeleton size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-2.5 w-14" />
                <div className="skeleton h-5 w-28" />
              </div>
            </div>
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
