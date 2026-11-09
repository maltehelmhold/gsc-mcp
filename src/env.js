import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

/**
 * Fundorte fuer die Env-Datei, in dieser Reihenfolge:
 *
 *   1. --env-file=<pfad> oder GSC_ENV_FILE, falls gesetzt
 *   2. <projekt>/.env.local  (bei Curila ein Symlink auf den zentralen Ordner)
 *   3. ~/Documents/.env-files/.env.local.gsc-mcp
 *
 * Die erste gefundene Datei gewinnt. Bereits gesetzte Umgebungsvariablen
 * werden NICHT ueberschrieben: was im MCP-Eintrag der Claude-App steht,
 * sticht die Datei. Fehlt jede Datei, ist das kein Fehler, dann kommt
 * eben alles aus der Umgebung.
 */
function candidates() {
  const fromArg = process.argv
    .find((a) => a.startsWith("--env-file="))
    ?.slice("--env-file=".length);
  return [
    fromArg,
    process.env.GSC_ENV_FILE,
    resolve(projectRoot, ".env.local"),
    resolve(homedir(), "Documents/.env-files/.env.local.gsc-mcp"),
  ].filter(Boolean);
}

/** Minimaler Parser fuer Node ohne process.loadEnvFile (vor 20.12). */
function parseInto(file) {
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function loadEnv() {
  for (const file of candidates()) {
    if (!existsSync(file)) continue;
    if (typeof process.loadEnvFile === "function") {
      // Ueberschreibt bestehende Variablen nicht, genau wie --env-file.
      process.loadEnvFile(file);
    } else {
      parseInto(file);
    }
    return file;
  }
  return null;
}

/**
 * Wird beim Import ausgefuehrt. Wichtig: dieses Modul MUSS als erstes
 * importiert werden. ES-Module werden in Importreihenfolge ausgewertet,
 * und gsc.js liest GSC_READONLY schon beim Laden. Stuende das Laden als
 * Anweisung im Dateikoerper, liefe es zu spaet.
 */
export const envFile = loadEnv();
