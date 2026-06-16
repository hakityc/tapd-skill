export const ENTITY_TYPES = ["Story", "Task", "Bug"];
export class CliError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = "CliError";
        this.code = code;
        this.details = details;
    }
}
export function asString(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim();
}
export function normalizeEntityType(value) {
    const raw = asString(value).toLowerCase();
    if (raw === "story" || raw === "stories") {
        return "Story";
    }
    if (raw === "task" || raw === "tasks") {
        return "Task";
    }
    if (raw === "bug" || raw === "bugs") {
        return "Bug";
    }
    throw new CliError("MISSING_WORK_ITEM_TYPE", "工作项类型必须是 Story、Task 或 Bug。");
}
export function normalizeWorkItem(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new CliError("INVALID_INPUT_JSON", "TAPD Context JSON 必须是对象。");
    }
    const input = value;
    const id = asString(input.id);
    if (!id) {
        throw new CliError("MISSING_WORK_ITEM_ID", "TAPD Context 缺少工作项 id。");
    }
    const item = {
        source: asString(input.source) || "tapd",
        entity_type: normalizeEntityType(input.entity_type),
        id,
    };
    const optionalKeys = [
        "short_id",
        "title",
        "url",
        "external_url",
        "user_nick",
        "workspace_id",
    ];
    for (const key of optionalKeys) {
        const normalized = asString(input[key]);
        if (normalized) {
            item[key] = normalized;
        }
    }
    return item;
}
export function defaultProjectConfig(baseBranch, workspaceId, userNick) {
    return {
        version: 1,
        base_branch: baseBranch,
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
        ...(userNick ? { user_nick: userNick } : {}),
        branch: {
            type_map: {
                Story: "feat",
                Task: "task",
                Bug: "fix",
            },
            name_template: "{type}/tapd-{entity}-{id}-{slug}",
            date_format: "YYMMDD",
            slug_language: "en",
        },
    };
}
export function validateProjectConfig(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new CliError("INVALID_CONFIG_FILE", "TAPD 项目配置必须是 JSON 对象。");
    }
    const config = value;
    const baseBranch = asString(config.base_branch) || asString(config.git?.base_branch);
    const workspaceId = asString(config.workspace_id) || asString(config.tapd?.workspace_id);
    const userNick = asString(config.user_nick) || asString(config.user?.display_name);
    if (config.version !== 1 || !baseBranch) {
        throw new CliError("INVALID_CONFIG_FILE", "TAPD 项目配置缺少 version 或 base_branch。");
    }
    const defaults = defaultProjectConfig(baseBranch, workspaceId, userNick);
    const typeMap = config.branch?.type_map;
    if (typeMap) {
        for (const entityType of ENTITY_TYPES) {
            const mapped = asString(typeMap[entityType]);
            if (mapped) {
                defaults.branch.type_map[entityType] = mapped;
            }
        }
    }
    defaults.branch.name_template =
        asString(config.branch?.name_template) || defaults.branch.name_template;
    return defaults;
}
export function emptyContextStore() {
    return {
        version: 1,
        branches: {},
    };
}
export function validateContextStore(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new CliError("INVALID_CONTEXT_FILE", ".tapd/context.json 必须是 JSON 对象。");
    }
    const store = value;
    if (store.version !== 1 ||
        !store.branches ||
        typeof store.branches !== "object" ||
        Array.isArray(store.branches)) {
        throw new CliError("INVALID_CONTEXT_FILE", ".tapd/context.json 缺少 version 或 branches 映射。");
    }
    for (const [branchName, rawContext] of Object.entries(store.branches)) {
        if (!rawContext || typeof rawContext !== "object" || Array.isArray(rawContext)) {
            throw new CliError("INVALID_CONTEXT_FILE", `.tapd/context.json 中的分支 ${branchName} 不是有效对象。`);
        }
        const context = rawContext;
        const validBinding = context.binding?.method === "start" || context.binding?.method === "bind";
        const validStatus = context.status?.local_phase === "initialized" &&
            (context.status.last_synced_at === null ||
                typeof context.status.last_synced_at === "string");
        const validGit = Boolean(asString(context.git?.base_branch)) &&
            Boolean(asString(context.git?.source_branch)) &&
            Boolean(asString(context.git?.created_from_commit));
        const validWorkItem = context.work_item &&
            typeof context.work_item === "object" &&
            Boolean(asString(context.work_item.id));
        try {
            if (validWorkItem) {
                normalizeEntityType(context.work_item?.entity_type);
            }
        }
        catch {
            throw new CliError("INVALID_CONTEXT_FILE", `.tapd/context.json 中分支 ${branchName} 的工作项类型无效。`);
        }
        if (asString(context.branch) !== branchName ||
            !asString(context.created_at) ||
            !asString(context.updated_at) ||
            !validBinding ||
            !validStatus ||
            !validGit ||
            !validWorkItem ||
            !context.assignee ||
            typeof context.assignee !== "object") {
            throw new CliError("INVALID_CONTEXT_FILE", `.tapd/context.json 中分支 ${branchName} 的结构不完整。`);
        }
    }
    return store;
}
