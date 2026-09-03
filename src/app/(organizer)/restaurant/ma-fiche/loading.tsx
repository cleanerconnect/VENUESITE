import {
  FormSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
} from "@/components/ui/Skeleton";
import { COPY } from "@/lib/copy/fr";

export default function SettingsLoading() {
  return (
    <LoadingRegion label={COPY.loading.settings}>
      <div className="space-y-7">
        <PageHeaderSkeleton />
        <FormSkeleton fields={5} />
        <FormSkeleton fields={3} />
      </div>
    </LoadingRegion>
  );
}
