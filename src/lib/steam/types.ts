export type GameLane = "limited" | "new";
export type GameKind = "promo" | "giveaway" | "f2p";
export type Platform = "windows" | "mac" | "linux";

export type CatalogGame = {
  id: string;
  steamAppId: number | null;
  title: string;
  image: string;
  capsule: string | null;
  releaseLabel: string | null;
  releaseAt: number | null;
  platforms: Platform[];
  kind: GameKind;
  lanes: GameLane[];
  originalPrice: string | null;
  discountPercent: number | null;
  endsAt: number | null;
  endsLabel: string | null;
  steamUrl: string;
  steamClientUrl: string | null;
  reviewLabel: string | null;
  reviewSummary: "positive" | "mixed" | "negative" | null;
  source: "steam" | "gamerpower";
  description: string | null;
  instructions: string | null;
  worth: string | null;
};

export type CatalogPayload = {
  generatedAt: number;
  limited: CatalogGame[];
  recent: CatalogGame[];
  all: CatalogGame[];
  sources: {
    steam: boolean;
    giveaways: boolean;
  };
  error: string | null;
};

export type GameDetails = {
  appId: number;
  title: string;
  description: string | null;
  about: string | null;
  header: string | null;
  screenshots: string[];
  genres: string[];
  developers: string[];
  isFree: boolean;
  releaseLabel: string | null;
  steamUrl: string;
};
