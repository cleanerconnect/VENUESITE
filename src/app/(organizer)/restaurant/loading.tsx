import {
  EntityListSkeleton,
  KpiGridSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";

// Streamed while the venue payload loads. Shaped like the overview so
// the layout does not jump when the real blocks land.
export default function RestaurantLoading() {
  return (
    <LoadingRegion label="Chargement de votre espace">
      <div className="space-y-5 md:space-y-7">
        <PageHeaderSkeleton />
        <Skeleton shape="card" className="h-52 w-full" />
        <KpiGridSkeleton />
        <EntityListSkeleton />
      </div>
    </LoadingRegion>
  );
}
