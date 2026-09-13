import { createFileRoute } from "@tanstack/react-router";
import { CatalogSkeleton, CatalogView } from "@/components/catalog-view";
import { getCatalog } from "@/lib/steam/catalog.functions";

export const Route = createFileRoute("/")({
  loader: () => getCatalog(),
  staleTime: 60_000,
  pendingMs: 150,
  pendingComponent: CatalogSkeleton,
  component: Home,
});

function Home() {
  const catalog = Route.useLoaderData();
  return (
    <main>
      <CatalogView catalog={catalog} />
    </main>
  );
}
