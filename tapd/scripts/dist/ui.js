import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { connector, connectors } from "./connectors.js";
import { home, readPrivate, safePath } from "./storage.js";
const staticDirectory = fileURLToPath(new URL("../ui/", import.meta.url));
const cliFile = fileURLToPath(new URL("./cli.js", import.meta.url));
const skillDirectory = resolve(fileURLToPath(new URL("../../", import.meta.url)));
function listConnections(root) {
    const directory = join(root, "connections");
    if (!existsSync(directory))
        return [];
    safePath(directory);
    const result = [];
    for (const entry of readdirSync(directory)) {
        if (!entry.endsWith(".json"))
            continue;
        try {
            const profile = readPrivate(join(directory, entry));
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
        }
        catch {
            // A broken private profile is handled by the CLI. The dashboard must remain usable.
        }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
}
function listSkills() {
    const roots = [
        ["agents", join(homedir(), ".agents", "skills")],
        ["codex", join(homedir(), ".codex", "skills")],
    ];
    const found = new Map();
    for (const [label, directory] of roots) {
        if (!existsSync(directory))
            continue;
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (!entry.isDirectory() && !entry.isSymbolicLink())
                continue;
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
export function overview(root = home()) {
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
function json(response, status, body) {
    response.writeHead(status, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
    });
    response.end(JSON.stringify(body));
}
function contentType(path) {
    const types = {
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".svg": "image/svg+xml",
    };
    return types[extname(path)] || "application/octet-stream";
}
function asset(response, requestPath) {
    const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
    const path = resolve(staticDirectory, relativePath);
    if (relative(staticDirectory, path).startsWith("..") || !existsSync(path))
        return false;
    if (!statSync(path).isFile())
        return false;
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
    return createServer((request, response) => {
        const path = new URL(request.url || "/", "http://127.0.0.1").pathname;
        if (request.method !== "GET")
            return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
        if (path === "/api/overview")
            return json(response, 200, overview(root));
        if (asset(response, path))
            return;
        return json(response, 404, { error: "NOT_FOUND" });
    });
}
export async function startUi(port) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
        throw new Error("UI 端口需要是 1024–65535 的整数。");
    const server = createUiServer();
    await new Promise((resolvePromise, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
            server.off("error", reject);
            resolvePromise();
        });
    });
    process.stdout.write(`WorkBridge UI: http://127.0.0.1:${port}\n`);
    for (const signal of ["SIGINT", "SIGTERM"])
        process.once(signal, () => server.close());
}
