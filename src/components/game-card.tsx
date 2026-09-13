import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClaimed } from "@/lib/claimed";
import { endsInLabel, kindLabel, platformLabel, relativeIt } from "@/lib/steam/format";
import type { CatalogGame } from "@/lib/steam/types";

type GameCardProps = {
  game: CatalogGame;
  onOpen: (game: CatalogGame) => void;
};

export function GameCard({ game, onOpen }: GameCardProps) {
  const { has, toggle } = useClaimed();
  const taken = has(game.id);
  const kind = kindLabel(game);
  const end = game.endsAt ? endsInLabel(game.endsAt) : null;

  return (
    <article className="flex items-center gap-3 rounded-xl bg-surface p-2 shadow-[var(--shadow-border)]">
      <button
        type="button"
        onClick={() => onOpen(game)}
        aria-label={`Dettagli di ${game.title}`}
        className="relative block h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-elevated"
      >
        <img
          src={game.image || game.capsule || ""}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
          onError={(event) => {
            const img = event.currentTarget;
            if (game.capsule && img.src !== game.capsule) {
              img.src = game.capsule;
            }
          }}
        />
      </button>

      <button
        type="button"
        onClick={() => onOpen(game)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={kind.variant}>{kind.text}</Badge>
          {taken ? <Badge variant="free">Preso</Badge> : null}
        </div>
        <h3 className="mt-1 truncate font-display text-sm font-semibold leading-snug tracking-tight text-fg">
          {game.title}
        </h3>
        <p className="truncate text-xs text-muted">
          {game.releaseAt
            ? `Uscito ${relativeIt(game.releaseAt)}`
            : game.releaseLabel || "Data di uscita n/d"}
          {game.platforms.length > 0 ? ` · ${platformLabel(game.platforms)}` : ""}
        </p>
        {end ? <p className="truncate text-xs font-medium tabular-nums text-warn">{end}</p> : null}
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
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
        <Button asChild size="icon" className="rounded-xl">
          <a
            href={game.steamUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Apri su Steam"
            onClick={() => {
              if (!taken) toggle(game.id);
            }}
          >
            <ExternalLink />
          </a>
        </Button>
      </div>
    </article>
  );
}
