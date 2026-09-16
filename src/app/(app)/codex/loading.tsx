export default function CodexLoading() {
  return (
    <div
      className="mx-auto max-w-3xl space-y-6"
      aria-busy="true"
      aria-label="Loading the Codex"
    >
      <div className="space-y-2">
        <div className="skeleton h-7 w-52" />
        <div className="skeleton h-4 w-72" />
      </div>
      <div className="plate grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-2.5 w-20" />
            <div className="skeleton h-7 w-16" />
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="plate flex items-center gap-3 px-4 py-3">
          <div className="skeleton size-4 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-2.5 w-1/4" />
          </div>
          <div className="skeleton h-8 w-14" />
        </div>
      ))}
    </div>
  );
}
