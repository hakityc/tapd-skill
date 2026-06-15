import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  CliError,
  ContextStore,
  emptyContextStore,
  ProjectConfig,
  validateContextStore,
  validateProjectConfig,
} from "./schema.js";

export const CONFIG_FILE = join(".tapd", "config.json");
export const LEGACY_PROJECT_FILE = join(".tapd", "project.json");
export const CONTEXT_FILE = join(".tapd", "context.json");

function readJson(path: string, errorCode: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code === "ENOENT") {
      throw cause;
    }
    throw new CliError(errorCode, `${path} 不是有效 JSON。`);
  }
}

export function readProject(repoRoot: string): ProjectConfig {
  const configPath = join(repoRoot, CONFIG_FILE);
  const legacyPath = join(repoRoot, LEGACY_PROJECT_FILE);
  try {
    return validateProjectConfig(readJson(configPath, "INVALID_CONFIG_FILE"));
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code !== "ENOENT") {
      throw error;
    }
  }
  try {
    return validateProjectConfig(readJson(legacyPath, "INVALID_PROJECT_FILE"));
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code !== "ENOENT") {
      if (error instanceof CliError && error.code === "INVALID_CONFIG_FILE") {
        throw new CliError("INVALID_PROJECT_FILE", ".tapd/project.json 配置无效。");
      }
      throw error;
    }
    throw new CliError(
      "PROJECT_NOT_INITIALIZED",
      "尚未初始化 .tapd/config.json，请先执行 tapd-context init。",
    );
  }
}

export function readContextStore(repoRoot: string): ContextStore {
  const path = join(repoRoot, CONTEXT_FILE);
  try {
    return validateContextStore(readJson(path, "INVALID_CONTEXT_FILE"));
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code === "ENOENT") {
      return emptyContextStore();
    }
    throw error;
  }
}

export function writeJsonAtomic(path: string, value: unknown, errorCode: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    renameSync(tempPath, path);
  } catch (error) {
    throw new CliError(errorCode, `写入 ${path} 失败。`, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export function writeProject(repoRoot: string, config: ProjectConfig): void {
  writeJsonAtomic(join(repoRoot, CONFIG_FILE), config, "CONFIG_WRITE_FAILED");
}

export function writeContextStore(repoRoot: string, store: ContextStore): void {
  writeJsonAtomic(join(repoRoot, CONTEXT_FILE), store, "CONTEXT_WRITE_FAILED");
}
