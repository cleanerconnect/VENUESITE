import { ScreenSkeleton } from "@/components/restaurant/ScreenSkeleton";

// Streamed while the venue payload loads. Shaped like the overview so
// the layout does not jump when the real blocks land — and shared with
// `?etat=chargement`, so the forced state cannot drift from the real one.
export default function RestaurantLoading() {
  return <ScreenSkeleton />;
}
