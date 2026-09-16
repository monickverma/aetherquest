import { QuestSkeleton } from "@/components/ui";

export default function SanctumLoading() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_23rem]"
      aria-busy="true"
      aria-label="Loading the quest log"
    >
      <div className="order-2 space-y-4 lg:order-1">
        <div className="space-y-2">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-4 w-56" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-7 w-20" />
          ))}
        </div>
        <div className="skeleton h-[4.25rem] w-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <QuestSkeleton key={i} />
        ))}
      </div>

      <div className="plate order-1 space-y-5 p-6 lg:order-2">
        <div className="flex items-center gap-4">
          <div className="skeleton size-[4.5rem] rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
        <div className="skeleton h-2.5 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-14" />
          <div className="skeleton h-14" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
