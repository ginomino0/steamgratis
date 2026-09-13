import { RefreshCw, Search } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GameCard } from "@/components/game-card";
import { GameDrawer } from "@/components/game-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useClaimed } from "@/lib/claimed";
import { refreshCatalog } from "@/lib/steam/catalog.functions";
import { updatedLabel } from "@/lib/steam/format";
import type { CatalogGame, CatalogPayload } from "@/lib/steam/types";
import { cn } from "@/lib/utils";

type FilterId = "all" | "limited" | "new" | "claimed";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "limited", label: "A tempo" },
  { id: "new", label: "Nuovi" },
  { id: "claimed", label: "Presi" },
];

type CatalogViewProps = {
  catalog: CatalogPayload;
};

export function CatalogView({ catalog }: CatalogViewProps) {
  const router = useRouter();
  const { claimed } = useClaimed();
  const [filter, setFilter] = useState<FilterId>("new");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CatalogGame | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [visible, setVisible] = useState(16);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: CatalogGame[] = catalog.all;
    if (filter === "limited") list = catalog.limited;
    else if (filter === "new") list = catalog.recent;
    else if (filter === "claimed") {
      list = catalog.all.filter((game) => claimed.has(game.id));
    }
    if (!q) return list;
    return list.filter((game) => game.title.toLowerCase().includes(q));
  }, [catalog, filter, query, claimed]);

  const shown = query ? filtered : filtered.slice(0, visible);

  async function refresh() {
    setRefreshing(true);
    try {
      await refreshCatalog();
      await router.invalidate();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl pb-10">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Live da Steam
            </p>
            <h1 className="font-display text-2xl font-semibold leading-none tracking-tight text-fg">
              SteamGratis
            </h1>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="rounded-xl"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Aggiorna elenco"
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
          </Button>
        </div>
        <p className="mt-2 max-w-prose text-sm text-muted text-pretty">
          Giochi sempre gratis e promozioni a tempo. Uscite delle ultime due settimane, pronti da
          aggiungere alla libreria Steam.
        </p>
      </header>

      <section className="px-4 pt-5">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Da prendere" value={catalog.all.length} />
          <Stat label="A tempo" value={catalog.limited.length} />
          <Stat label="Nuove uscite" value={catalog.recent.length} />
        </div>
        <p className="mt-3 text-xs tabular-nums text-faint">{updatedLabel(catalog.generatedAt)}</p>
        {catalog.error ? (
          <p className="mt-3 rounded-2xl bg-elevated px-4 py-3 text-sm text-warn shadow-[var(--shadow-border)]">
            {catalog.error}
          </p>
        ) : null}
        {catalog.limited.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setFilter("limited");
              setVisible(16);
            }}
            className="mt-3 flex w-full items-center justify-between rounded-2xl bg-elevated px-4 py-3 text-left shadow-[var(--shadow-border)]"
          >
            <span className="text-sm text-fg">
              <span className="font-semibold tabular-nums text-warn">{catalog.limited.length}</span>
              {" "}
              {catalog.limited.length === 1
                ? "titolo gratis a tempo"
                : "titoli gratis a tempo"}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Aprili
            </span>
          </button>
        ) : null}
      </section>

      <div className="mt-5 bg-bg px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca un titolo…"
            className="pl-10"
            aria-label="Cerca giochi"
          />
        </div>
        <div
          className="mt-3 grid grid-cols-4 gap-1 rounded-full bg-elevated p-1 shadow-[var(--shadow-border)]"
          role="tablist"
          aria-label="Filtri"
        >
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(item.id);
                  setVisible(16);
                }}
                className={cn(
                  "flex h-10 items-center justify-center rounded-full px-1 text-xs font-semibold tracking-wide transition-[background-color,color] duration-[var(--motion-fast)] ease-[var(--ease-smooth-out)]",
                  active ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-4 flex flex-col gap-2 px-4">
        {filtered.length === 0 ? (
          <EmptyState filter={filter} query={query} />
        ) : (
          shown.map((game) => <GameCard key={game.id} game={game} onOpen={setSelected} />)
        )}

        {!query && filtered.length > visible ? (
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-full rounded-2xl"
            onClick={() => setVisible((n) => n + 16)}
          >
            Mostra altri ({filtered.length - visible})
          </Button>
        ) : null}
      </section>

      <footer className="px-4 pb-8 pt-10 text-center text-xs leading-relaxed text-faint">
        Non affiliato a Valve o Steam. Dati dal Steam Store
        {catalog.sources.giveaways ? " e GamerPower" : ""}. Apri ogni scheda per reclamarlo sul tuo
        account.
      </footer>

      <GameDrawer
        game={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-3 shadow-[var(--shadow-border)]">
      <p className="font-display text-2xl font-semibold tabular-nums leading-none tracking-tight text-fg">
        {value}
      </p>
      <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
    </div>
  );
}

function EmptyState({ filter, query }: { filter: FilterId; query: string }) {
  let title = "Nessun gioco in elenco";
  let body = "Aggiorna per ricontrollare Steam.";
  if (query) {
    title = "Nessun risultato";
    body = "Prova un altro titolo o togli la ricerca.";
  } else if (filter === "limited") {
    title = "Nessuna promo a tempo";
    body = "Al momento Steam non ha giochi a 100% o giveaway attivi. Controlla le nuove uscite gratis.";
  } else if (filter === "claimed") {
    title = "Ancora nessun gioco preso";
    body = "Quando apri un titolo su Steam, viene segnato qui.";
  }
  return (
    <div className="rounded-xl bg-surface px-5 py-10 text-center shadow-[var(--shadow-border)]">
      <p className="font-display text-lg font-semibold text-fg">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted text-pretty">{body}</p>
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pt-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-48" />
      <Skeleton className="mt-3 h-12 w-full" />
      <div className="mt-6 grid grid-cols-3 gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <div className="mt-6 space-y-2">
        <Skeleton className="h-[72px] w-full rounded-xl" />
        <Skeleton className="h-[72px] w-full rounded-xl" />
        <Skeleton className="h-[72px] w-full rounded-xl" />
        <Skeleton className="h-[72px] w-full rounded-xl" />
        <Skeleton className="h-[72px] w-full rounded-xl" />
      </div>
    </div>
  );
}
