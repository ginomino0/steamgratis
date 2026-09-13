import type { CatalogGame, GameKind, Platform } from "./types";

const ADULT_TITLE =
  /\b(hentai|nsfw|porn|erotic|erotica|nudity|nude|sex\b|sexual|18\+|sucked)\b/i;
const ADULT_TAGS = new Set([6650, 12095, 9130, 24904, 4085]);
const ADULT_DESC = new Set([1, 3]);

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  gen: 0,
  gennaio: 0,
  feb: 1,
  february: 1,
  febbraio: 1,
  mar: 2,
  march: 2,
  marzo: 2,
  apr: 3,
  april: 3,
  aprile: 3,
  may: 4,
  mag: 4,
  maggio: 4,
  jun: 5,
  june: 5,
  giu: 5,
  giugno: 5,
  jul: 6,
  july: 6,
  lug: 6,
  luglio: 6,
  aug: 7,
  august: 7,
  ago: 7,
  agosto: 7,
  sep: 8,
  sept: 8,
  september: 8,
  set: 8,
  settembre: 8,
  oct: 9,
  october: 9,
  ott: 9,
  ottobre: 9,
  nov: 10,
  november: 10,
  novembre: 10,
  dec: 11,
  december: 11,
  dic: 11,
  dicembre: 11,
};

export function decodeHtml(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/"/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/'/gi, "'")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) =>
      String.fromCharCode(parseInt(n, 16)),
    )
    .trim();
}

export function parseSteamDate(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = decodeHtml(raw).replace(/\./g, "").trim();
  if (!text || /coming soon|prossimamente|to be announced|da annunciare/i.test(text)) {
    return null;
  }

  const dmy = text.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,})\s*,?\s*(\d{4})$/);
  if (dmy) {
    const month = MONTHS[dmy[2].toLowerCase()];
    if (month === undefined) return null;
    const t = Date.UTC(Number(dmy[3]), month, Number(dmy[1]));
    return Number.isNaN(t) ? null : t;
  }

  const mdy = text.match(/^([A-Za-zÀ-ÿ]{3,})\s+(\d{1,2}),?\s*(\d{4})$/);
  if (mdy) {
    const month = MONTHS[mdy[1].toLowerCase()];
    if (month === undefined) return null;
    const t = Date.UTC(Number(mdy[3]), month, Number(mdy[2]));
    return Number.isNaN(t) ? null : t;
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseIdList(raw: string | undefined): number[] {
  if (!raw) return [];
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner) return [];
  return inner
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function isAdult(chunk: string): boolean {
  const tags = parseIdList(chunk.match(/data-ds-tagids="([^"]*)"/)?.[1]);
  if (tags.some((id) => ADULT_TAGS.has(id))) return true;
  const desc = parseIdList(chunk.match(/data-ds-descids="([^"]*)"/)?.[1]);
  return desc.some((id) => ADULT_DESC.has(id));
}

function parsePlatforms(chunk: string): Platform[] {
  const platforms: Platform[] = [];
  if (/\bplatform_img win\b/.test(chunk)) platforms.push("windows");
  if (/\bplatform_img mac\b/.test(chunk)) platforms.push("mac");
  if (/\bplatform_img linux\b/.test(chunk)) platforms.push("linux");
  return platforms;
}

function parseReview(chunk: string): {
  label: string | null;
  summary: CatalogGame["reviewSummary"];
} {
  const cls = chunk.match(/search_review_summary\s+(positive|mixed|negative)/);
  if (!cls) return { label: null, summary: null };
  const summary = cls[1] as NonNullable<CatalogGame["reviewSummary"]>;
  const tip = chunk.match(/data-tooltip-html="([^"]*)"/);
  if (!tip) {
    return {
      label:
        summary === "positive"
          ? "Positivo"
          : summary === "mixed"
            ? "Misto"
            : "Negativo",
      summary,
    };
  }
  const decoded = decodeHtml(tip[1].replace(/<br>/gi, "\n"));
  const first = decoded.split("\n")[0]?.trim() ?? null;
  return { label: first, summary };
}

export function steamHeader(appId: number): string {
  return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
}

export function steamStoreUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}/`;
}

export function steamClientUrl(appId: number): string {
  return `steam://openurl/https://store.steampowered.com/app/${appId}/`;
}

export function parseSearchHtml(html: string): CatalogGame[] {
  const chunks = html.split(/<a href="https:\/\/store\.steampowered\.com\/app\//);
  const games: CatalogGame[] = [];
  const seen = new Set<number>();

  for (const chunk of chunks.slice(1)) {
    const idMatch = chunk.match(/^(\d+)/);
    if (!idMatch) continue;
    const steamAppId = Number(idMatch[1]);
    if (!Number.isFinite(steamAppId) || seen.has(steamAppId)) continue;
    if (isAdult(chunk)) continue;

    const title = decodeHtml(chunk.match(/class="title">([^<]+)/)?.[1] ?? "");
    if (!title) continue;
    if (ADULT_TITLE.test(title)) continue;

    const capsule = chunk.match(/<img src="([^"]+)"/)?.[1] ?? null;
    const releaseLabelRaw = decodeHtml(
      chunk.match(/search_released[^>]*>\s*([^<]+)/)?.[1] ?? "",
    );
    const releaseLabel = releaseLabelRaw || null;
    const releaseAt = parseSteamDate(releaseLabel);

    const discountRaw = chunk.match(/discount_pct">\s*([^<]+)/)?.[1] ?? "";
    const discountPercent = Number(discountRaw.replace(/[^\d]/g, "")) || null;
    const originalPrice = decodeHtml(
      chunk.match(/discount_original_price">([^<]+)/)?.[1] ?? "",
    ) || null;

    const kind: GameKind =
      discountPercent === 100 && originalPrice ? "promo" : "f2p";

    const review = parseReview(chunk);
    seen.add(steamAppId);

    games.push({
      id: `steam-${steamAppId}`,
      steamAppId,
      title,
      image: steamHeader(steamAppId),
      capsule,
      releaseLabel,
      releaseAt,
      platforms: parsePlatforms(chunk),
      kind,
      lanes: kind === "promo" ? ["limited"] : ["new"],
      originalPrice,
      discountPercent,
      endsAt: null,
      endsLabel: null,
      steamUrl: steamStoreUrl(steamAppId),
      steamClientUrl: steamClientUrl(steamAppId),
      reviewLabel: review.label,
      reviewSummary: review.summary,
      source: "steam",
      description: null,
      instructions: null,
      worth: originalPrice,
    });
  }

  return games;
}

export const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export function isReleasedInLastTwoWeeks(
  releaseAt: number | null,
  now = Date.now(),
): boolean {
  if (releaseAt === null) return false;
  if (releaseAt > now + 36 * 60 * 60 * 1000) return false;
  return now - releaseAt <= TWO_WEEKS_MS;
}
