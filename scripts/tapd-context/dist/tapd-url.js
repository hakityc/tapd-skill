import { CliError, normalizeWorkItem } from "./schema.js";
const STANDARD_DETAIL_PATH = /^\/tapd_fe\/([^/]+)\/(story|task|bug)\/detail\/([^/?#]+)\/?$/i;
export function parseTapdUrl(rawUrl) {
    let url;
    try {
        url = new URL(rawUrl.trim());
    }
    catch {
        throw new CliError("UNSUPPORTED_TAPD_URL", "无法解析 TAPD URL。", { url: rawUrl });
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new CliError("UNSUPPORTED_TAPD_URL", "TAPD URL 必须使用 http 或 https。");
    }
    const match = url.pathname.match(STANDARD_DETAIL_PATH);
    if (!match) {
        throw new CliError("UNSUPPORTED_TAPD_URL", "P0 仅支持标准 Story、Task、Bug detail 链接。", { url: rawUrl });
    }
    return normalizeWorkItem({
        source: "tapd",
        workspace_id: match[1],
        entity_type: match[2],
        id: decodeURIComponent(match[3]),
        url: url.toString(),
    });
}
export function mergeUrlIdentity(input) {
    if (!input.url) {
        return input;
    }
    const parsed = parseTapdUrl(input.url);
    return {
        ...input,
        entity_type: parsed.entity_type,
        id: parsed.id,
        workspace_id: parsed.workspace_id,
        url: parsed.url,
    };
}
export function parseInput(rawInput) {
    const trimmed = rawInput.trim();
    if (!trimmed) {
        throw new CliError("INVALID_INPUT_JSON", "--input 不能为空。");
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return parseTapdUrl(trimmed);
    }
    try {
        return mergeUrlIdentity(normalizeWorkItem(JSON.parse(trimmed)));
    }
    catch (error) {
        if (error instanceof CliError) {
            throw error;
        }
        throw new CliError("INVALID_INPUT_JSON", "--input 不是有效的 TAPD Context JSON。");
    }
}
