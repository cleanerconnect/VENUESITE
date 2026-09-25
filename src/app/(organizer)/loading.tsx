import {
  EntityListSkeleton,
  KpiGridSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";
import { COPY } from "@/lib/copy/fr";

// Streamed for any server-rendered route in the workspace that has no
// loading file of its own — today that is the dashboard.
//
// Shaped like the densest of them rather than a spinner: a placeholder
// that does not match what follows causes a jump on load, which reads
// worse than a slightly slower paint.
export default function WorkspaceLoading() {
  return (
    <LoadingRegion label={COPY.loading.generic}>
      <div className="space-y-5 md:space-y-7">
        <PageHeaderSkeleton />
        <Skeleton shape="card" className="h-48 w-full" />
        <KpiGridSkeleton count={4} />
        <EntityListSkeleton rows={4} />
      </div>
    </LoadingRegion>
  );
}
