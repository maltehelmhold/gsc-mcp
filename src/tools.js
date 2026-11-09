import {
  deleteSitemap,
  inspectUrl,
  listSitemaps,
  listSites,
  readOnly,
  resolveSite,
  searchAnalytics,
  submitSitemap,
} from "./gsc.js";

const SITE_ARG = {
  type: "string",
  description:
    "Property, z. B. sc-domain:curila.app oder https://curila.app/. Ohne Angabe gilt GSC_DEFAULT_SITE.",
};

/** Default-Zeitraum: die letzten 28 Tage, mit 3 Tagen Nachlauf (GSC hinkt hinterher). */
function defaultRange() {
  const day = 86400000;
  const end = new Date(Date.now() - 3 * day);
  const start = new Date(end.getTime() - 27 * day);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

export const TOOLS = [
  {
    name: "gsc_list_sites",
    description:
      "Listet alle Search-Console-Properties, auf die dieser Service Account Zugriff hat. Gut als erster Aufruf, um die richtige Property-Kennung zu finden.",
    inputSchema: { type: "object", properties: {} },
    handler: () => listSites(),
  },

  {
    name: "gsc_search_analytics",
    description:
      "Leistungsdaten: Klicks, Impressionen, CTR und Durchschnittsposition. Gruppierbar nach query, page, country, device, date, searchAppearance. Ohne Zeitraum gelten die letzten 28 Tage.",
    inputSchema: {
      type: "object",
      properties: {
        site_url: SITE_ARG,
        start_date: { type: "string", description: "YYYY-MM-DD" },
        end_date: { type: "string", description: "YYYY-MM-DD" },
        dimensions: {
          type: "array",
          items: {
            type: "string",
            enum: ["query", "page", "country", "device", "date", "searchAppearance"],
          },
          description: "Gruppierung, Standard: query",
        },
        search_type: {
          type: "string",
          enum: ["web", "image", "video", "news", "discover", "googleNews"],
          description: "Standard: web",
        },
        row_limit: { type: "integer", minimum: 1, maximum: 25000 },
        start_row: { type: "integer", minimum: 0 },
        page_filter: {
          type: "string",
          description: "Nur Zeilen, deren Seiten-URL diesen Text enthaelt.",
        },
        query_filter: {
          type: "string",
          description: "Nur Zeilen, deren Suchanfrage diesen Text enthaelt.",
        },
        country_filter: {
          type: "string",
          description: "Dreibuchstabiger Laendercode, z. B. deu, pol, usa.",
        },
      },
    },
    handler: (a) => {
      const range = defaultRange();
      const filters = [];
      if (a.page_filter)
        filters.push({ dimension: "page", operator: "contains", expression: a.page_filter });
      if (a.query_filter)
        filters.push({ dimension: "query", operator: "contains", expression: a.query_filter });
      if (a.country_filter)
        filters.push({
          dimension: "country",
          operator: "equals",
          expression: String(a.country_filter).toLowerCase(),
        });

      return searchAnalytics(resolveSite(a.site_url), {
        startDate: a.start_date || range.startDate,
        endDate: a.end_date || range.endDate,
        dimensions: a.dimensions?.length ? a.dimensions : ["query"],
        type: a.search_type || "web",
        rowLimit: a.row_limit ?? 100,
        startRow: a.start_row ?? 0,
        ...(filters.length
          ? { dimensionFilterGroups: [{ groupType: "and", filters }] }
          : {}),
      });
    },
  },

  {
    name: "gsc_inspect_url",
    description:
      "Prueft eine einzelne URL: ist sie indexiert, welches Canonical hat Google gewaehlt, wann war der letzte Crawl, welche Sitemap hat sie gemeldet. Kontingent: 2000 Abfragen pro Tag und Property.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Vollstaendige URL, muss in der Property liegen." },
        site_url: SITE_ARG,
        language_code: { type: "string", description: "Sprache der Antworttexte, Standard de." },
      },
      required: ["url"],
    },
    handler: (a) => inspectUrl(resolveSite(a.site_url), a.url, a.language_code),
  },

  {
    name: "gsc_list_sitemaps",
    description:
      "Alle eingereichten Sitemaps der Property mit Anzahl entdeckter URLs, letztem Download und gemeldeten Fehlern.",
    inputSchema: { type: "object", properties: { site_url: SITE_ARG } },
    handler: (a) => listSitemaps(resolveSite(a.site_url)),
  },
];

/** Schreibende Tools gibt es nur, wenn GSC_READONLY nicht gesetzt ist. */
if (!readOnly) {
  TOOLS.push(
    {
      name: "gsc_submit_sitemap",
      description:
        "Reicht eine Sitemap bei Google ein. Schreibend. Die URL muss vollstaendig sein, z. B. https://curila.app/sitemap.xml.",
      inputSchema: {
        type: "object",
        properties: {
          sitemap_url: { type: "string" },
          site_url: SITE_ARG,
        },
        required: ["sitemap_url"],
      },
      handler: (a) => submitSitemap(resolveSite(a.site_url), a.sitemap_url),
    },
    {
      name: "gsc_delete_sitemap",
      description:
        "Entfernt eine Sitemap aus der Search Console. Schreibend. Loescht nur die Anmeldung, nicht die Datei.",
      inputSchema: {
        type: "object",
        properties: {
          sitemap_url: { type: "string" },
          site_url: SITE_ARG,
        },
        required: ["sitemap_url"],
      },
      handler: (a) => deleteSitemap(resolveSite(a.site_url), a.sitemap_url),
    }
  );
}
