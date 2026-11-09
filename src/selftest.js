#!/usr/bin/env node
/**
 * Schneller Rauchtest ohne MCP-Client: prueft Key, Rechte und Property.
 * Aufruf: npm run check
 */
// MUSS der erste Import bleiben, siehe env.js.
import { envFile } from "./env.js";
import { defaultSite, listSites, listSitemaps, readOnly } from "./gsc.js";

console.log(`Env-Datei: ${envFile ?? "keine gefunden, nutze die Umgebung"}`);

try {
  const sites = await listSites();
  const entries = sites.siteEntry ?? [];
  console.log(`Zugriff auf ${entries.length} Property(s):`);
  for (const s of entries) console.log(`  ${s.siteUrl}  (${s.permissionLevel})`);
  console.log(`Modus: ${readOnly ? "nur lesen" : "lesen und schreiben"}`);

  if (defaultSite) {
    console.log(`\nStandard-Property: ${defaultSite}`);
    const sm = await listSitemaps(defaultSite);
    for (const s of sm.sitemap ?? []) {
      const urls = s.contents?.[0]?.submitted ?? "?";
      console.log(`  Sitemap ${s.path}: ${urls} URLs, Fehler ${s.errors ?? 0}`);
    }
  }
} catch (err) {
  console.error("Fehlgeschlagen:", err.message);
  process.exit(1);
}
