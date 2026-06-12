function pad(value) {
    return String(value).padStart(2, "0");
}
export function formatDate(date) {
    return `${String(date.getFullYear()).slice(-2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}
export function slugifyTitle(title) {
    const withoutPrefixes = title.replace(/^(?:\s*【[^】]*】\s*)+/, "");
    return withoutPrefixes
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)
        .replace(/-+$/g, "");
}
export function fallbackSlug(item) {
    const identity = item.short_id || item.id.slice(-9);
    return `${item.entity_type.toLowerCase()}-${identity}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .slice(0, 40);
}
export function buildBranchName(config, item, slugOverride, date) {
    const normalizedOverride = slugOverride ? slugifyTitle(slugOverride) : "";
    const slug = normalizedOverride || slugifyTitle(item.title || "") || fallbackSlug(item);
    const type = config.branch.type_map[item.entity_type];
    return config.branch.name_template
        .replaceAll("{type}", type)
        .replaceAll("{date}", formatDate(date))
        .replaceAll("{slug}", slug);
}
