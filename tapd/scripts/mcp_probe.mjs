#!/usr/bin/env node

import { spawn } from "node:child_process";

const READ_ONLY_PROBE_TOOLS = new Set([
  "get_user_participant_projects",
  "get_stories_or_tasks",
  "get_bug",
  "get_comments",
  "get_entity_attachments",
  "get_entity_relations",
  "get_image",
  "get_iterations",
  "get_tcases",
  "get_timesheets",
  "get_workflows_last_steps",
]);
const SECRET_VALUES = [
  process.env.TAPD_ACCESS_TOKEN,
  process.env.TAPD_API_PASSWORD,
  process.env.TAPD_API_USER,
].filter((value) => typeof value === "string" && value.length >= 4);
const configuredTimeout = Number.parseInt(
  process.env.FLOW_MCP_PROBE_TIMEOUT_MS || "15000",
  10,
);
const PROBE_TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 15_000;

function redactSecrets(value) {
  let output = value;
  for (const secret of SECRET_VALUES) {
    output = output.replaceAll(secret, "***");
  }
  return output.replace(/Bearer\s+[^\s"']+/gi, "Bearer ***");
}

function parseArgs(argv) {
  const separator = argv.indexOf("--");
  if (separator < 0 || !argv[separator + 1]) {
    throw new Error(
      "usage: node scripts/mcp_probe.mjs [--require tool,tool] [--probe tool] -- <command> [args...]",
    );
  }
  const options = argv.slice(0, separator);
  const command = argv[separator + 1];
  const commandArgs = argv.slice(separator + 2);
  let required = [];
  let probe = "";
  for (let index = 0; index < options.length; index += 1) {
    if (options[index] === "--require") {
      const value = options[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--require needs a comma-separated tool list");
      }
      required = value.split(",").filter(Boolean);
      index += 1;
    } else if (options[index] === "--probe") {
      const value = options[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--probe needs one read-only tool name");
      }
      probe = value;
      index += 1;
    } else {
      throw new Error(`unknown option: ${options[index]}`);
    }
  }
  if (probe && !READ_ONLY_PROBE_TOOLS.has(probe)) {
    throw new Error(`--probe only accepts read-only tools; rejected: ${probe}`);
  }
  return { command, commandArgs, required, probe };
}

let input;
try {
  input = parseArgs(process.argv.slice(2));
} catch (error) {
  process.stdout.write(
    `${redactSecrets(
      JSON.stringify(
        {
          ok: false,
          stage: "arguments",
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    )}\n`,
  );
  process.exit(1);
}
const child = spawn(input.command, input.commandArgs, {
  env: process.env,
  stdio: ["pipe", "pipe", "pipe"],
});

let stdoutBuffer = "";
let stderrBuffer = "";
let finished = false;

function send(message) {
  if (!child.stdin.writable) {
    finish({ ok: false, stage: "transport", error: "MCP stdin is not writable" }, 1);
    return;
  }
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function finish(result, exitCode = 0) {
  if (finished) {
    return;
  }
  finished = true;
  clearTimeout(timeout);
  process.stdout.write(`${redactSecrets(JSON.stringify(result, null, 2))}\n`);
  child.stdin.end();
  child.kill("SIGTERM");
  setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
  }, 1_000).unref();
  process.exitCode = exitCode;
}

function handle(message) {
  if (message.id === 1) {
    if (message.error) {
      finish({ ok: false, stage: "initialize", error: message.error.message }, 1);
      return;
    }
    send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    return;
  }
  if (message.id === 2) {
    if (message.error) {
      finish({ ok: false, stage: "tools/list", error: message.error.message }, 1);
      return;
    }
    const tools = (message.result?.tools || []).map((tool) => tool.name).sort();
    const missing = input.required.filter((name) => !tools.includes(name));
    if (missing.length > 0) {
      finish(
        {
          ok: false,
          stage: "capability",
          tool_count: tools.length,
          required_tools: input.required,
          missing_tools: missing,
        },
        1,
      );
      return;
    }
    if (input.probe) {
      if (!tools.includes(input.probe)) {
        finish({ ok: false, stage: "probe", missing_probe_tool: input.probe }, 1);
        return;
      }
      send({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: input.probe, arguments: {} },
      });
      return;
    }
    finish({
      ok: true,
      stage: "capability",
      tool_count: tools.length,
      required_tools: input.required,
    });
    return;
  }
  if (message.id === 3) {
    const toolError = message.error?.message;
    const resultError = message.result?.isError === true;
    finish(
      {
        ok: !toolError && !resultError,
        stage: "read-only-probe",
        probe_tool: input.probe,
        ...(toolError ? { error: toolError } : {}),
        ...(resultError ? { error: "MCP tool returned isError=true" } : {}),
      },
      toolError || resultError ? 1 : 0,
    );
  }
}

child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  stdoutBuffer += chunk;
  for (;;) {
    const newline = stdoutBuffer.indexOf("\n");
    if (newline < 0) {
      break;
    }
    const line = stdoutBuffer.slice(0, newline).trim();
    stdoutBuffer = stdoutBuffer.slice(newline + 1);
    if (!line) {
      continue;
    }
    try {
      handle(JSON.parse(line));
    } catch {
      // Ignore server log lines written to stdout; protocol JSON will still be handled.
    }
  }
});

child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => {
  stderrBuffer = `${stderrBuffer}${chunk}`.slice(-4000);
});

child.stdin.on("error", (error) => {
  if (!finished) {
    finish({ ok: false, stage: "transport", error: error.message }, 1);
  }
});

child.on("error", (error) => {
  finish({ ok: false, stage: "spawn", error: error.message }, 1);
});

child.on("exit", (code) => {
  if (!finished) {
    finish(
      {
        ok: false,
        stage: "server-exit",
        exit_code: code,
        error: stderrBuffer.trim() || "MCP server exited before completing the probe",
      },
      1,
    );
  }
});

const timeout = setTimeout(() => {
  finish(
    {
      ok: false,
      stage: "timeout",
      error: stderrBuffer.trim() || "MCP probe timed out",
    },
    1,
  );
}, PROBE_TIMEOUT_MS);

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "flow-mcp-probe", version: "1.0.0" },
  },
});
