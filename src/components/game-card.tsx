import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClaimed } from "@/lib/claimed";
import { endsInLabel, kindLabel, platformLabel, relativeIt } from "@/lib/steam/format";
import type { CatalogGame } from "@/lib/steam/types";
import { cn } from "@/lib/utils";

type GameCardProps = {
  game: CatalogGame;
  onOpen: (game: CatalogGame) => void;
  featured?: boolean;
};

export function GameCard({ game, onOpen, featured = false }: GameCardProps) {
  const { has, toggle } = useClaimed();
  const taken = has(game.id);
  const kind = kindLabel(game);
  const end = game.endsAt ? endsInLabel(game.endsAt) : null;

  return (
    <article
      className={cn(
        "group rounded-xl bg-surface p-2 shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--ease-smooth-out)]",
        featured ? "sm:grid sm:grid-cols-[1.2fr_1fr] sm:gap-1" : "",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(game)}
        aria-label={`Dettagli di ${game.title}`}
        className="relative block w-full overflow-hidden rounded-2xl bg-elevated text-left"
      >
        <img
          src={game.image || game.capsule || ""}
          alt=""
          loading="lazy"
          className={cn(
            "w-full object-cover outline outline-1 -outline-offset-1 outline-fg/10",
            featured ? "aspect-[16/9] sm:aspect-[16/10] sm:h-full" : "aspect-[92/43]",
          )}
          onError={(event) => {
            const img = event.currentTarget;
            if (game.capsule && img.src !== game.capsule) {
              img.src = game.capsule;
            }
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge variant={kind.variant}>{kind.text}</Badge>
          {taken ? <Badge variant="free">Preso</Badge> : null}
        </div>
      </button>

      <div className="flex flex-col gap-3 px-3 pb-3 pt-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-balance text-fg">
            {game.title}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {game.releaseAt
              ? `Uscito ${relativeIt(game.releaseAt)}`
              : game.releaseLabel || "Data di uscita n/d"}
            {game.platforms.length > 0 ? ` · ${platformLabel(game.platforms)}` : ""}
          </p>
          {end ? (
            <p className="mt-1 text-sm font-medium tabular-nums text-warn">{end}</p>
          ) : null}
          {game.originalPrice ? (
            <p className="mt-1 text-sm text-faint">
              Valore <span className="line-through">{game.originalPrice}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2">
          <Button asChild className="min-h-11 flex-1 rounded-xl">
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
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="rounded-xl"
            aria-label={taken ? "Togli dai presi" : "Segna come preso"}
            onClick={() => toggle(game.id)}
          >
            {taken ? <BookmarkCheck /> : <Bookmark />}
          </Button>
        </div>
      </div>
    </article>
  );
}
