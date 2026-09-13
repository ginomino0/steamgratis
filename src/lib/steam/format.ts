import { formatDistanceToNowStrict } from "date-fns";
import { it } from "date-fns/locale";
import type { CatalogGame } from "./types";

export function relativeIt(ts: number, now = Date.now()): string {
  try {
    return formatDistanceToNowStrict(ts, { addSuffix: true, locale: it });
  } catch {
    return new Date(ts).toLocaleDateString("it-IT");
  }
}

export function endsInLabel(ts: number, now = Date.now()): string | null {
  const delta = ts - now;
  if (delta <= 0) return "Scaduto";
  const hours = Math.round(delta / (60 * 60 * 1000));
  if (hours < 1) return "Scade tra pochi minuti";
  if (hours < 24) return `Scade tra ${hours} ore`;
  const days = Math.round(hours / 24);
  return `Scade tra ${days} ${days === 1 ? "giorno" : "giorni"}`;
}

export function kindLabel(game: CatalogGame): { text: string; variant: "free" | "limited" | "new" } {
  if (game.kind === "giveaway") return { text: "Giveaway", variant: "limited" };
  if (game.kind === "promo") return { text: "Gratis a tempo", variant: "limited" };
  if (game.lanes.includes("new")) return { text: "Nuova uscita", variant: "new" };
  return { text: "Gratis", variant: "free" };
}

export function updatedLabel(generatedAt: number): string {
  const mins = Math.max(0, Math.round((Date.now() - generatedAt) / 60000));
  if (mins <= 1) return "Aggiornato ora";
  return `Aggiornato ${mins} min fa`;
}

export function platformLabel(platforms: CatalogGame["platforms"]): string {
  const map = { windows: "Win", mac: "Mac", linux: "Linux" };
  return platforms.map((p) => map[p]).join(" · ");
}
