# gsc-mcp

MCP-Server für die Google Search Console. Authentifizierung über einen
Service Account, kein Browser-Login, kein ablaufendes Token.

## Was der Server kann

| Tool | Zweck |
| --- | --- |
| `gsc_list_sites` | Properties, auf die der Service Account Zugriff hat |
| `gsc_search_analytics` | Klicks, Impressionen, CTR, Position; nach query, page, country, device, date |
| `gsc_inspect_url` | Indexierungsstatus einer URL, von Google gewähltes Canonical, letzter Crawl |
| `gsc_list_sitemaps` | Eingereichte Sitemaps mit URL-Zahl und Fehlern |
| `gsc_submit_sitemap` | Sitemap anmelden (schreibend) |
| `gsc_delete_sitemap` | Sitemap-Anmeldung entfernen (schreibend) |

Nicht verfügbar, weil die API es nicht hergibt: die Crawling-Statistik und
der Seitenindexierungs-Bericht. Beides bleibt Handarbeit im Browser.
`gsc_inspect_url` ist der Ersatz, allerdings pro URL und mit 2.000
Abfragen pro Tag und Property gedeckelt.

## Einrichtung

**1. Google-Projekt und Service Account**

1. In der Google Cloud Console ein Projekt anlegen oder ein bestehendes wählen.
2. Unter APIs und Dienste die **Google Search Console API** aktivieren.
3. Unter IAM und Verwaltung einen Service Account anlegen, keine Projektrollen nötig.
4. Beim Service Account einen Schlüssel vom Typ JSON erzeugen und herunterladen.

**2. Schlüssel ablegen**

Die heruntergeladene JSON-Datei gehört an einen Ort **außerhalb dieses
Repos**, zum Beispiel:

```
~/.gsc-mcp/service-account.json
```

Jeder Teilnehmer legt einen eigenen Service Account an und verwendet
seinen eigenen Schlüssel. Der Schlüssel ist ein Passwort: nie
committen, nie weitergeben.

Danach die Vorlage kopieren und den Pfad eintragen:

```
cp .env.example .env.local
```

In `.env.local` `GSC_KEY_FILE` auf den Pfad der JSON-Datei setzen und
`GSC_DEFAULT_SITE` auf die eigene Property.

**3. Service Account in der Search Console freischalten**

Die Mailadresse aus dem JSON (`client_email`, endet auf
`.iam.gserviceaccount.com`) in der Search Console unter Einstellungen,
Nutzer und Berechtigungen hinzufügen. Berechtigung **Vollständig**, wenn
Sitemaps eingereicht werden sollen, sonst **Eingeschränkt**.

Das ist der Schritt, der am häufigsten vergessen wird. Ohne ihn
antwortet die API mit 403, egal wie korrekt der Schlüssel ist.

**4. Server eintragen**

In `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "search-console": {
      "command": "node",
      "args": ["/ABSOLUTER/PFAD/ZUM/gsc-mcp/src/index.js"]
    }
  }
}
```

`/ABSOLUTER/PFAD/ZUM/gsc-mcp` durch den Ordner ersetzen, in den das
Repo geklont wurde (im Repo-Ordner zeigt `pwd` den Pfad).

Kein `env`-Block nötig, die Einstellungen kommen aus der Env-Datei.
Danach die Claude-App neu starten.

**5. Prüfen**

```
npm run check
```

Gibt zuerst aus, welche Env-Datei gefunden wurde, dann die Properties
samt Berechtigungsstufe und die Sitemaps der Standard-Property.

## Env-Datei

Gesucht wird in dieser Reihenfolge, die erste gefundene Datei gewinnt:

1. `--env-file=<pfad>` als Argument oder `GSC_ENV_FILE`
2. `<projekt>/.env.local` (Kopie von `.env.example`)
3. `~/Documents/.env-files/.env.local.gsc-mcp`

Normales `KEY=VALUE`-Format. Bereits gesetzte Umgebungsvariablen werden
nicht überschrieben: was im MCP-Eintrag steht, sticht die Datei.

## Konfiguration

| Variable | Bedeutung |
| --- | --- |
| `GSC_KEY_FILE` | Pfad zum Service-Account-JSON. Pflicht. `GOOGLE_APPLICATION_CREDENTIALS` geht auch. |
| `GSC_ENV_FILE` | Abweichender Pfad zur Env-Datei. |
| `GSC_DEFAULT_SITE` | Property, die ohne `site_url` benutzt wird. `sc-domain:example.com` oder `https://example.com/`. |
| `GSC_READONLY` | Auf `1` setzen: die schreibenden Tools werden gar nicht erst angeboten, und der Server fordert nur den readonly-Scope an. |

## Hinweise

- Search-Console-Daten hinken zwei bis drei Tage hinterher. Ohne
  Zeitraumangabe fragt `gsc_search_analytics` deshalb die letzten 28 Tage
  bis vor drei Tagen ab.
- Eine Domain-Property (`sc-domain:`) deckt alle Subdomains und beide
  Protokolle ab, eine URL-Präfix-Property nur genau ihr Präfix.
- Der Server schreibt ausschließlich nach stderr, stdout gehört dem
  MCP-Protokoll.
