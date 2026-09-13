import { useQuery } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, ExternalLink, MonitorPlay, X } from "lucide-react";
import { Drawer } from "vaul";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClaimed } from "@/lib/claimed";
import { getGameDetails } from "@/lib/steam/catalog.functions";
import { endsInLabel, kindLabel, platformLabel, relativeIt } from "@/lib/steam/format";
import type { CatalogGame } from "@/lib/steam/types";

type GameDrawerProps = {
  game: CatalogGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GameDrawer({ game, open, onOpenChange }: GameDrawerProps) {
  const { has, toggle } = useClaimed();
  const taken = game ? has(game.id) : false;
  const detailsQuery = useQuery({
    queryKey: ["steam-details", game?.steamAppId],
    queryFn: () => getGameDetails({ data: { appId: game!.steamAppId! } }),
    enabled: open && Boolean(game?.steamAppId),
    staleTime: 10 * 60 * 1000,
  });

  if (!game) return null;
  const kind = kindLabel(game);
  const details = detailsQuery.data;
  const description = details?.description || game.description;
  const instructions = game.instructions;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-bg/70" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[92vh] max-w-lg flex-col rounded-t-[28px] bg-surface shadow-[var(--shadow-border)] outline-none">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border-strong" />
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
            <Drawer.Title className="font-display text-xl font-semibold leading-snug tracking-tight text-fg text-balance">
              {details?.title || game.title}
            </Drawer.Title>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-elevated hover:text-fg"
              aria-label="Chiudi"
            >
              <X className="size-5" />
            </button>
          </div>
          <Drawer.Description className="sr-only">
            Dettagli del gioco e link per prenderlo su Steam
          </Drawer.Description>

          <div className="overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
            <img
              src={details?.header || game.image || game.capsule || ""}
              alt=""
              className="mb-4 aspect-[92/43] w-full rounded-2xl object-cover outline outline-1 -outline-offset-1 outline-fg/10"
            />

            <div className="mb-4 flex flex-wrap gap-1.5">
              <Badge variant={kind.variant}>{kind.text}</Badge>
              {details?.genres.slice(0, 3).map((genre) => (
                <Badge key={genre}>{genre}</Badge>
              ))}
              {taken ? <Badge variant="free">Preso</Badge> : null}
            </div>

            <p className="text-sm text-muted">
              {game.releaseAt
                ? `Uscito ${relativeIt(game.releaseAt)}`
                : game.releaseLabel || details?.releaseLabel || "Uscita recente"}
              {game.platforms.length > 0 ? ` · ${platformLabel(game.platforms)}` : ""}
            </p>
            {game.endsAt ? (
              <p className="mt-1 text-sm font-medium tabular-nums text-warn">
                {endsInLabel(game.endsAt)}
              </p>
            ) : null}

            {detailsQuery.isLoading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : description ? (
              <p className="mt-4 text-pretty text-sm leading-relaxed text-fg/90">{description}</p>
            ) : null}

            {instructions ? (
              <div className="mt-4 rounded-2xl bg-elevated p-4 shadow-[var(--shadow-border)]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Come prenderlo
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg/90">
                  {instructions}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-elevated p-4 shadow-[var(--shadow-border)]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Come prenderlo
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-relaxed text-fg/90">
                  <li>Apri la pagina su Steam con il pulsante sotto.</li>
                  <li>Accedi al tuo account Steam se richiesto.</li>
                  <li>
                    {game.kind === "promo"
                      ? "Aggiungi il gioco al carrello: costa 0 e resta nella libreria."
                      : "Premi «Aggiungi alla libreria» o «Gioca» per reclamarlo."}
                  </li>
                </ol>
              </div>
            )}

            {details?.screenshots?.length ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {details.screenshots.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-24 w-40 shrink-0 rounded-lg object-cover outline outline-1 -outline-offset-1 outline-fg/10"
                  />
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              <Button asChild className="h-12 w-full rounded-xl">
                <a
                  href={game.steamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (!taken) toggle(game.id);
                  }}
                >
                  Apri su Steam
                  <ExternalLink />
                </a>
              </Button>
              {game.steamClientUrl ? (
                <Button asChild variant="secondary" className="h-12 w-full rounded-xl">
                  <a href={game.steamClientUrl}>
                    Apri nel client Steam
                    <MonitorPlay />
                  </a>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className="h-12 w-full rounded-xl"
                onClick={() => toggle(game.id)}
              >
                {taken ? <BookmarkCheck /> : <Bookmark />}
                {taken ? "Togli dai presi" : "Segna come preso"}
              </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
