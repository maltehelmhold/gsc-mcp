#!/usr/bin/env node
// MUSS der erste Import bleiben: laedt die Env-Datei, bevor gsc.js
// GSC_READONLY liest.
import { envFile } from "./env.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS } from "./tools.js";

/**
 * MCP-Server fuer die Google Search Console.
 *
 * Transport ist stdio, deshalb darf NICHTS auf stdout geschrieben werden
 * ausser dem Protokoll selbst. Logging geht nach stderr.
 */
const server = new Server(
  { name: "gsc-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = TOOLS.find((t) => t.name === req.params.name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: "text", text: `Unbekanntes Tool: ${req.params.name}` }],
    };
  }
  try {
    const result = await tool.handler(req.params.arguments ?? {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    // Fehler als Tool-Ergebnis zurueckgeben, nicht als Transportfehler:
    // sonst sieht der Aufrufer nur "call failed" ohne Grund.
    return {
      isError: true,
      content: [{ type: "text", text: err?.message ?? String(err) }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `gsc-mcp laeuft (stdio). Env: ${envFile ?? "nur aus der Umgebung"}`
);
