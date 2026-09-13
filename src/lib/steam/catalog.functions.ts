import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loadCatalog, loadGameDetails } from "./catalog.server";

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  return loadCatalog(false);
});

export const refreshCatalog = createServerFn({ method: "POST" }).handler(async () => {
  return loadCatalog(true);
});

export const getGameDetails = createServerFn({ method: "POST" })
  .validator(z.object({ appId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    return loadGameDetails(data.appId);
  });
