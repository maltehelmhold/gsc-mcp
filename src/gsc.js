import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { GoogleAuth } from "google-auth-library";

const WEBMASTERS = "https://www.googleapis.com/webmasters/v3";
const SEARCHCONSOLE = "https://searchconsole.googleapis.com/v1";

const SCOPE_READ = "https://www.googleapis.com/auth/webmasters.readonly";
const SCOPE_WRITE = "https://www.googleapis.com/auth/webmasters";

export const readOnly = process.env.GSC_READONLY === "1";
export const defaultSite = process.env.GSC_DEFAULT_SITE || null;

let client = null;

/** Node expandiert "~" nicht von selbst, in Env-Dateien erst recht nicht. */
function expandHome(path) {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  return path;
}

/**
 * Service-Account-Client. Der Key liegt ausserhalb des Projekts, der Pfad
 * kommt aus GSC_KEY_FILE (oder GOOGLE_APPLICATION_CREDENTIALS). Ohne
 * Schreibrechte fordern wir bewusst nur den readonly-Scope an: dann kann
 * der Server selbst bei einem Fehler nichts veraendern.
 */
function auth() {
  if (client) return client;
  const rawKeyFile = process.env.GSC_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!rawKeyFile) {
    throw new Error(
      "Kein Service-Account-Key konfiguriert. Setze GSC_KEY_FILE in " +
        ".env.local (Vorlage: .env.example) auf die JSON-Datei."
    );
  }
  const keyFile = expandHome(rawKeyFile);
  if (!existsSync(keyFile)) {
    throw new Error(
      `Der Service-Account-Key fehlt: ${keyFile}\n` +
        "Noch offen: in der Google Cloud Console die Search Console API " +
        "aktivieren, ein Dienstkonto anlegen, einen JSON-Schluessel " +
        "herunterladen und genau unter diesem Pfad ablegen. Danach die " +
        "client_email aus dem JSON in der Search Console als Nutzer " +
        "eintragen."
    );
  }
  client = new GoogleAuth({
    keyFile,
    scopes: [readOnly ? SCOPE_READ : SCOPE_WRITE],
  });
  return client;
}

/** Property-Kennung: explizit, sonst GSC_DEFAULT_SITE. */
export function resolveSite(siteUrl) {
  const site = siteUrl || defaultSite;
  if (!site) {
    throw new Error(
      "Keine Property angegeben. site_url mitgeben oder GSC_DEFAULT_SITE setzen."
    );
  }
  return site;
}

async function call(url, { method = "GET", body } = {}) {
  const c = await auth().getClient();
  const res = await c.request({
    url,
    method,
    data: body,
    // Fehler selbst auswerten statt Exceptions mit halbem Kontext.
    validateStatus: () => true,
    responseType: "json",
  });
  if (res.status >= 400) {
    const detail =
      res.data?.error?.message || res.statusText || `HTTP ${res.status}`;
    const hint =
      res.status === 403
        ? " Haeufigste Ursache: die Mailadresse des Service Accounts ist in der Search Console nicht als Nutzer der Property eingetragen."
        : "";
    throw new Error(`Search Console API: ${detail} (HTTP ${res.status}).${hint}`);
  }
  return res.data ?? {};
}

/** siteUrl und Sitemap-Pfad stehen im URL-Pfad und muessen kodiert werden. */
const seg = (v) => encodeURIComponent(v);

export async function listSites() {
  return call(`${WEBMASTERS}/sites`);
}

export async function searchAnalytics(site, body) {
  return call(`${WEBMASTERS}/sites/${seg(site)}/searchAnalytics/query`, {
    method: "POST",
    body,
  });
}

export async function listSitemaps(site) {
  return call(`${WEBMASTERS}/sites/${seg(site)}/sitemaps`);
}

export async function submitSitemap(site, feedpath) {
  await call(`${WEBMASTERS}/sites/${seg(site)}/sitemaps/${seg(feedpath)}`, {
    method: "PUT",
  });
  return { submitted: feedpath };
}

export async function deleteSitemap(site, feedpath) {
  await call(`${WEBMASTERS}/sites/${seg(site)}/sitemaps/${seg(feedpath)}`, {
    method: "DELETE",
  });
  return { deleted: feedpath };
}

export async function inspectUrl(site, inspectionUrl, languageCode) {
  return call(`${SEARCHCONSOLE}/urlInspection/index:inspect`, {
    method: "POST",
    body: {
      siteUrl: site,
      inspectionUrl,
      languageCode: languageCode || "de",
    },
  });
}
