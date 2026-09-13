import type { CatalogGame, CatalogPayload, GameDetails } from "./types";
import {
  isReleasedInLastTwoWeeks,
  parseSearchHtml,
  steamClientUrl,
  steamHeader,
  steamStoreUrl,
} from "./parse";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const STEAM_HEADERS = {
  "User-Agent": UA,
  Accept: "application/json, text/html;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
  Cookie:
    "birthtime=568022401; lastagecheckage=1-January-1988; wants_mature_content=0; mature_content=0",
};

const CACHE_TTL_MS = 4 * 60 * 1000;
let cache: { at: number; payload: CatalogPayload } | null = null;

type SteamSearchJson = {
  success?: number;
  results_html?: string;
  total_count?: number;
};

async function fetchJson<T>(url: string, timeoutMs = 12000): Promise<T> {
  const res = await fetch(url, {
    headers: STEAM_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Richiesta fallita (${res.status})`);
  }
  return (await res.json()) as T;
}

function searchUrl(start: number, extra: string): string {
  const params = new URLSearchParams({
    query: "",
    start: String(start),
    count: "50",
    infinite: "1",
    category1: "998",
    ndl: "1",
    cc: "IT",
    l: "italian",
  });
  return `https://store.steampowered.com/search/results/?${params.toString()}&${extra}`;
}

async function fetchSearch(extra: string, start = 0): Promise<CatalogGame[]> {
  const data = await fetchJson<SteamSearchJson>(searchUrl(start, extra));
  return parseSearchHtml(data.results_html ?? "");
}

type FeaturedItem = {
  id: number;
  type?: number;
  name: string;
  discounted?: boolean;
  discount_percent?: number;
  original_price?: number | null;
  final_price?: number | null;
  currency?: string;
  large_capsule_image?: string;
  header_image?: string;
  windows_available?: boolean;
  mac_available?: boolean;
  linux_available?: boolean;
};

type FeaturedCategories = {
  specials?: { items?: FeaturedItem[] };
  new_releases?: { items?: FeaturedItem[] };
};

function formatEuroCents(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined || cents <= 0) return null;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function fromFeatured(item: FeaturedItem, kind: CatalogGame["kind"]): CatalogGame {
  const platforms: CatalogGame["platforms"] = [];
  if (item.windows_available) platforms.push("windows");
  if (item.mac_available) platforms.push("mac");
  if (item.linux_available) platforms.push("linux");
  const original = formatEuroCents(item.original_price ?? null);
  return {
    id: `steam-${item.id}`,
    steamAppId: item.id,
    title: item.name,
    image: item.header_image || steamHeader(item.id),
    capsule: item.large_capsule_image ?? null,
    releaseLabel: null,
    releaseAt: null,
    platforms,
    kind,
    lanes: kind === "promo" ? ["limited"] : ["new"],
    originalPrice: original,
    discountPercent: item.discount_percent ?? null,
    endsAt: null,
    endsLabel: null,
    steamUrl: steamStoreUrl(item.id),
    steamClientUrl: steamClientUrl(item.id),
    reviewLabel: null,
    reviewSummary: null,
    source: "steam",
    description: null,
    instructions: null,
    worth: original,
  };
}

async function fetchFeaturedPromos(): Promise<CatalogGame[]> {
  const data = await fetchJson<FeaturedCategories>(
    "https://store.steampowered.com/api/featuredcategories/?l=italian&cc=IT",
  );
  const items = [
    ...(data.specials?.items ?? []),
    ...(data.new_releases?.items ?? []),
  ];
  return items
    .filter((item) => item.type === 0 || item.type === undefined)
    .filter(
      (item) =>
        item.discount_percent === 100 ||
        (item.final_price === 0 && (item.original_price ?? 0) > 0),
    )
    .map((item) => fromFeatured(item, "promo"));
}

type GamerPowerItem = {
  id: number;
  title: string;
  worth?: string;
  thumbnail?: string;
  image?: string;
  description?: string;
  instructions?: string;
  open_giveaway_url?: string;
  gamerpower_url?: string;
  published_date?: string;
  type?: string;
  platforms?: string;
  end_date?: string;
  status?: string;
};

function parseGamerPowerEnd(raw: string | undefined): number | null {
  if (!raw || raw === "N/A") return null;
  const t = Date.parse(raw.replace(" ", "T") + "Z");
  return Number.isNaN(t) ? null : t;
}

function extractAppId(...texts: Array<string | undefined>): number | null {
  for (const text of texts) {
    if (!text) continue;
    const match = text.match(/store\.steampowered\.com\/app\/(\d+)/i);
    if (match) return Number(match[1]);
  }
  return null;
}

async function fetchGiveaways(): Promise<CatalogGame[]> {
  const data = await fetchJson<GamerPowerItem[] | { status?: number }>(
    "https://www.gamerpower.com/api/giveaways?platform=steam&type=game",
  );
  if (!Array.isArray(data)) return [];
  const now = Date.now();
  const games: CatalogGame[] = [];
  const junk =
    /\b(dlc|decal|emblem|skin key|in-game items|starter kit|points key|npc dice|weapon skins?|helmet)\b/i;

  for (const item of data) {
    if (item.status && item.status.toLowerCase() !== "active") continue;
    const type = (item.type ?? "").toLowerCase();
    if (type && type !== "game") continue;
    if (junk.test(item.title ?? "")) continue;
    const endsAt = parseGamerPowerEnd(item.end_date);
    if (endsAt !== null && endsAt < now - 60 * 60 * 1000) continue;

    const steamAppId = extractAppId(
      item.description,
      item.instructions,
      item.open_giveaway_url,
      item.gamerpower_url,
    );
    const claimUrl =
      item.open_giveaway_url ||
      (steamAppId ? steamStoreUrl(steamAppId) : item.gamerpower_url) ||
      "";
    if (!claimUrl) continue;

    const worth =
      item.worth && item.worth !== "N/A" ? item.worth : null;
    const published = item.published_date
      ? Date.parse(item.published_date.replace(" ", "T") + "Z")
      : NaN;

    games.push({
      id: steamAppId ? `steam-${steamAppId}` : `gp-${item.id}`,
      steamAppId,
      title: item.title
        .replace(/\s+Steam Key Giveaway/i, "")
        .replace(/\s+Giveaway/i, "")
        .replace(/\s*\(Steam\)\s*/gi, " ")
        .replace(/\s+Steam Keys?\b/gi, "")
        .replace(/\s+Keys?$/i, "")
        .replace(/\s{2,}/g, " ")
        .trim(),
      image: item.image || item.thumbnail || (steamAppId ? steamHeader(steamAppId) : ""),
      capsule: item.thumbnail ?? null,
      releaseLabel: null,
      releaseAt: Number.isNaN(published) ? null : published,
      platforms: ["windows"],
      kind: "giveaway",
      lanes: ["limited"],
      originalPrice: worth,
      discountPercent: 100,
      endsAt,
      endsLabel: item.end_date && item.end_date !== "N/A" ? item.end_date : null,
      steamUrl: claimUrl,
      steamClientUrl: steamAppId ? steamClientUrl(steamAppId) : null,
      reviewLabel: type === "dlc" ? "DLC" : "Giveaway",
      reviewSummary: null,
      source: "gamerpower",
      description: item.description ?? null,
      instructions: item.instructions ?? null,
      worth,
    });
  }

  return games;
}

function mergeGames(groups: CatalogGame[][]): CatalogGame[] {
  const byId = new Map<string, CatalogGame>();
  for (const group of groups) {
    for (const game of group) {
      const existing = byId.get(game.id);
      if (!existing) {
        byId.set(game.id, { ...game, lanes: [...game.lanes] });
        continue;
      }
      const lanes = new Set([...existing.lanes, ...game.lanes]);
      byId.set(game.id, {
        ...existing,
        ...game,
        title: existing.title || game.title,
        image: existing.image || game.image,
        capsule: existing.capsule || game.capsule,
        releaseLabel: existing.releaseLabel || game.releaseLabel,
        releaseAt: existing.releaseAt ?? game.releaseAt,
        originalPrice: existing.originalPrice || game.originalPrice,
        discountPercent: existing.discountPercent ?? game.discountPercent,
        endsAt: existing.endsAt ?? game.endsAt,
        endsLabel: existing.endsLabel || game.endsLabel,
        description: existing.description || game.description,
        instructions: existing.instructions || game.instructions,
        steamClientUrl: existing.steamClientUrl || game.steamClientUrl,
        kind:
          existing.kind === "giveaway" || game.kind === "giveaway"
            ? "giveaway"
            : existing.kind === "promo" || game.kind === "promo"
              ? "promo"
              : "f2p",
        lanes: Array.from(lanes),
        source: existing.source === "steam" ? "steam" : game.source,
      });
    }
  }
  return Array.from(byId.values());
}

function emptyPayload(error: string | null): CatalogPayload {
  return {
    generatedAt: Date.now(),
    limited: [],
    recent: [],
    all: [],
    sources: { steam: false, giveaways: false },
    error,
  };
}

export async function loadCatalog(force = false): Promise<CatalogPayload> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.payload;
  }

  const steamRecent = Promise.all([
    fetchSearch("maxprice=free&sort_by=Released_DESC", 0),
    fetchSearch("maxprice=free&sort_by=Released_DESC", 50),
    fetchSearch("maxprice=free&sort_by=Released_DESC", 100),
  ]);
  const steamPromos = fetchSearch("maxprice=free&specials=1");
  const featured = fetchFeaturedPromos();
  const giveaways = fetchGiveaways();

  const settled = await Promise.allSettled([
    steamRecent,
    steamPromos,
    featured,
    giveaways,
  ]);

  const steamOk =
    settled[0].status === "fulfilled" ||
    settled[1].status === "fulfilled" ||
    settled[2].status === "fulfilled";
  const giveawaysOk = settled[3].status === "fulfilled";

  const recentPages =
    settled[0].status === "fulfilled" ? settled[0].value.flat() : [];
  const promoSearch =
    settled[1].status === "fulfilled" ? settled[1].value : [];
  const featuredPromos =
    settled[2].status === "fulfilled" ? settled[2].value : [];
  const gp = settled[3].status === "fulfilled" ? settled[3].value : [];

  const now = Date.now();
  const recent = recentPages
    .filter((game) => isReleasedInLastTwoWeeks(game.releaseAt, now))
    .map((game) => ({
      ...game,
      lanes: Array.from(new Set([...game.lanes, "new" as const])),
    }));

  // If date parsing dropped everything, keep the freshest search rows.
  const recentOrFallback =
    recent.length > 0
      ? recent
      : recentPages.slice(0, 24).map((game) => ({
          ...game,
          lanes: Array.from(new Set([...game.lanes, "new" as const])),
        }));

  const limitedRaw = [
    ...promoSearch.filter((g) => g.kind === "promo"),
    ...featuredPromos,
    ...gp,
  ].map((game) => ({
    ...game,
    lanes: Array.from(new Set([...game.lanes, "limited" as const])),
  }));

  const merged = mergeGames([limitedRaw, recentOrFallback]);

  const limited = merged
    .filter((g) => g.lanes.includes("limited"))
    .sort((a, b) => (a.endsAt ?? Number.MAX_SAFE_INTEGER) - (b.endsAt ?? Number.MAX_SAFE_INTEGER));

  const recentList = merged
    .filter((g) => g.lanes.includes("new"))
    .sort((a, b) => (b.releaseAt ?? 0) - (a.releaseAt ?? 0));

  const all = [...merged].sort((a, b) => {
    const aLtd = a.lanes.includes("limited") ? 0 : 1;
    const bLtd = b.lanes.includes("limited") ? 0 : 1;
    if (aLtd !== bLtd) return aLtd - bLtd;
    if (a.endsAt && b.endsAt) return a.endsAt - b.endsAt;
    return (b.releaseAt ?? 0) - (a.releaseAt ?? 0);
  });

  let error: string | null = null;
  if (!steamOk && !giveawaysOk) {
    error = "Steam non risponde. Riprova tra poco.";
  } else if (all.length === 0) {
    error = "Nessun gioco gratis trovato in questo momento.";
  }

  const payload: CatalogPayload = {
    generatedAt: now,
    limited,
    recent: recentList,
    all,
    sources: { steam: steamOk, giveaways: giveawaysOk },
    error,
  };

  if (all.length > 0) {
    cache = { at: Date.now(), payload };
  }
  return payload;
}

type AppDetailsResponse = Record<
  string,
  {
    success: boolean;
    data?: {
      name?: string;
      is_free?: boolean;
      short_description?: string;
      detailed_description?: string;
      header_image?: string;
      screenshots?: Array<{ path_full?: string; path_thumbnail?: string }>;
      genres?: Array<{ description?: string }>;
      developers?: string[];
      release_date?: { date?: string };
    };
  }
>;

export async function loadGameDetails(appId: number): Promise<GameDetails> {
  const data = await fetchJson<AppDetailsResponse>(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=IT&l=italian`,
  );
  const entry = data[String(appId)];
  if (!entry?.success || !entry.data) {
    return {
      appId,
      title: `App ${appId}`,
      description: null,
      about: null,
      header: steamHeader(appId),
      screenshots: [],
      genres: [],
      developers: [],
      isFree: true,
      releaseLabel: null,
      steamUrl: steamStoreUrl(appId),
    };
  }
  const d = entry.data;
  return {
    appId,
    title: d.name ?? `App ${appId}`,
    description: d.short_description ?? null,
    about: d.detailed_description ?? null,
    header: d.header_image ?? steamHeader(appId),
    screenshots: (d.screenshots ?? [])
      .map((s) => s.path_full || s.path_thumbnail || "")
      .filter(Boolean)
      .slice(0, 6),
    genres: (d.genres ?? []).map((g) => g.description ?? "").filter(Boolean),
    developers: d.developers ?? [],
    isFree: Boolean(d.is_free),
    releaseLabel: d.release_date?.date ?? null,
    steamUrl: steamStoreUrl(appId),
  };
}

export function emptyCatalog(): CatalogPayload {
  return emptyPayload(null);
}
