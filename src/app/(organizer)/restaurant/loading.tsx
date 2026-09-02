import {
  EntityListSkeleton,
  KpiGridSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";
import { COPY } from "@/lib/copy/fr";

// Streamed while the venue payload loads. Shaped like the overview so
// the layout does not jump when the real blocks land.
export default function RestaurantLoading() {
  return (
    <LoadingRegion label={COPY.loading.workspace}>
      <div className="space-y-5 md:space-y-7">
        <PageHeaderSkeleton />
        <Skeleton shape="card" className="h-52 w-full" />
        <KpiGridSkeleton />
        <EntityListSkeleton />
      </div>
    </LoadingRegion>
  );
}
