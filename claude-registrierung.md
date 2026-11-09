# gsc-mcp in der Claude-App registrieren

Dieses Snippet kommt in die Konfigurationsdatei der Claude-Desktop-App.
Sie liegt auf dem Mac hier:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

(Am schnellsten: Claude-App > Einstellungen > Entwickler > Konfiguration
bearbeiten. Falls die Datei noch nicht existiert, einfach anlegen.)

## Snippet

```json
{
  "mcpServers": {
    "search-console": {
      "command": "node",
      "args": ["/Users/DEIN-BENUTZERNAME/Documents/gsc-mcp/src/index.js"]
    }
  }
}
```

**Anpassen:** `DEIN-BENUTZERNAME` durch den macOS-Benutzernamen des
jeweiligen Rechners ersetzen (`whoami` im Terminal zeigt ihn). Der Pfad
muss auf das geklonte Repo zeigen.

Hat die Datei schon einen `mcpServers`-Block mit anderen Servern, nur den
Eintrag `"search-console": { ... }` dort hineinkopieren, nicht den ganzen
Block ersetzen.

## Warum kein env-Block?

Der Server findet seine Einstellungen selbst, in dieser Reihenfolge:

1. `<repo>/.env.local`
2. `~/Documents/.env-files/.env.local.gsc-mcp`

Auf dem neuen Rechner muss also nur die Env-Datei existieren
(Vorlage: `.env.example` in diesem Repo), plus der Service-Account-Key,
auf den `GSC_KEY_FILE` darin zeigt. Beides liegt bewusst NICHT im Repo.

## Danach

1. Claude-App komplett beenden und neu starten.
2. Test im Repo-Ordner: `npm run check` (zeigt gefundene Env-Datei,
   Properties und Sitemaps).
3. In Claude sollte der Server als `search-console` mit sechs
   `gsc_*`-Tools auftauchen.

Hängt etwas: fast immer fehlt die Freischaltung des Service Accounts in
der Search Console (Einstellungen > Nutzer und Berechtigungen), dann
antwortet die API mit 403. Details im README.
