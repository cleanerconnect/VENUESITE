import {
  EntityListSkeleton,
  KpiGridSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";
import { COPY } from "@/lib/copy/fr";

// The venue workspace's loading shape.
//
// The same component the route's `loading.tsx` renders, exported so
// `?etat=chargement` can force it. Two skeletons would drift; one means
// what a reviewer forces is exactly what a slow request shows.
export function ScreenSkeleton() {
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
