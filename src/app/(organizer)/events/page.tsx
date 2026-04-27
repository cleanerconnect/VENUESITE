import { EmptyState } from "@/components/ui/EmptyState";

export default function EventsPage() {
  return (
    <div className="py-12">
      <EmptyState
        title="Mes événements arrivent."
        description="Cet écran sera construit après validation de la direction sur l'Overview."
      />
    </div>
  );
}
