import {
  FormSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
} from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <LoadingRegion label="Chargement des réglages">
      <div className="space-y-7">
        <PageHeaderSkeleton />
        <FormSkeleton fields={5} />
        <FormSkeleton fields={3} />
      </div>
    </LoadingRegion>
  );
}
