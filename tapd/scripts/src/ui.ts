import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { connector, connectors } from "./connectors.js";
import { ConnectionProfile } from "./contracts.js";
import { home, readPrivate, safePath } from "./storage.js";

const staticDirectory = fileURLToPath(new URL("../ui/", import.meta.url));
const cliFile = fileURLToPath(new URL("./cli.js", import.meta.url));
const skillDirectory = resolve(fileURLToPath(new URL("../../", import.meta.url)));

type ConnectionView = {
  name: string;
  connector: string;
  host: ConnectionProfile["host"];
  server: string;
  transport: ConnectionProfile["transport"];
  endpoint?: string;
  state: ConnectionProfile["state"];
  allowWrites: boolean;
  capabilities: Array<{ id: string; write: boolean }>;
};

function listConnections(root: string): ConnectionView[] {
  const directory = join(root, "connections");
  if (!existsSync(directory)) return [];
  safePath(directory);
  const result: ConnectionView[] = [];
  for (const entry of readdirSync(directory)) {
    if (!entry.endsWith(".json")) continue;
    try {
      const profile = readPrivate<ConnectionProfile>(join(directory, entry));
      const definition = connector(profile.connector);
      result.push({
        name: profile.name,
        connector: profile.connector,
        host: profile.host,
        server: profile.server,
        transport: profile.transport,
        endpoint: profile.url ? new URL(profile.url).host : undefined,
        state: profile.state,
        allowWrites: profile.allowWrites,
        capabilities: Object.entries(definition.capabilities).map(([id, binding]) => ({
          id,
          write: binding.write,
        })),
      });
    } catch {
      // A broken private profile is handled by the CLI. The dashboard must remain usable.
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function listSkills(): Array<{ id: string; roots: string[] }> {
  const roots = [
    ["agents", join(homedir(), ".agents", "skills")],
    ["codex", join(homedir(), ".codex", "skills")],
  ] as const;
  const found = new Map<string, string[]>();
  for (const [label, directory] of roots) {
    if (!existsSync(directory)) continue;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      if (existsSync(join(directory, entry.name, "SKILL.md"))) {
        const installed = found.get(entry.name) || [];
        installed.push(label);
        found.set(entry.name, installed);
      }
    }
  }
  return [...found.entries()]
    .map(([id, roots]) => ({ id, roots }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function overview(root = home()): Record<string, unknown> {
  const connections = listConnections(root);
  return {
    node: process.execPath,
    cli: cliFile,
    skillDirectory,
    connectors: connectors().map((definition) => ({
      id: definition.id,
      node: definition.node,
      capabilities: Object.entries(definition.capabilities).map(([id, binding]) => ({
        id,
        write: binding.write,
      })),
    })),
    connections,
    skills: listSkills(),
    hosts: ["codex", "claude", "cursor"].map((id) => ({
      id,
      connections: connections.filter((connection) => connection.host === id).length,
    })),
  };
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function contentType(path: string): string {
  const types: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
  };
  return types[extname(path)] || "application/octet-stream";
}

function asset(response: ServerResponse, requestPath: string): boolean {
  const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
  const path = resolve(staticDirectory, relativePath);
  if (relative(staticDirectory, path).startsWith("..") || !existsSync(path)) return false;
  if (!statSync(path).isFile()) return false;
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'",
    "Content-Type": contentType(path),
    "X-Content-Type-Options": "nosniff",
  });
  response.end(readFileSync(path));
  return true;
}

export function createUiServer(root = home()) {
  return createServer((request: IncomingMessage, response: ServerResponse) => {
    const path = new URL(request.url || "/", "http://127.0.0.1").pathname;
    if (request.method !== "GET") return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
    if (path === "/api/overview") return json(response, 200, overview(root));
    if (asset(response, path)) return;
    return json(response, 404, { error: "NOT_FOUND" });
  });
}

export async function startUi(port: number): Promise<void> {
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("UI 端口需要是 1024–65535 的整数。");
  const server = createUiServer();
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolvePromise();
    });
  });
  process.stdout.write(`WorkBridge UI: http://127.0.0.1:${port}\n`);
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => server.close());
}
