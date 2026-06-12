import { BranchContext } from "./schema.js";

export function publicContext(context: BranchContext): Record<string, unknown> {
  return {
    work_item: {
      source: context.work_item.source,
      entity_type: context.work_item.entity_type,
      id: context.work_item.id,
      ...(context.work_item.short_id ? { short_id: context.work_item.short_id } : {}),
      ...(context.work_item.title ? { title: context.work_item.title } : {}),
      ...(context.work_item.url ? { url: context.work_item.url } : {}),
      ...(context.work_item.workspace_id
        ? { workspace_id: context.work_item.workspace_id }
        : {}),
    },
    assignee: {
      display_name: context.assignee.display_name,
    },
    binding: context.binding,
    git: {
      base_branch: context.git.base_branch,
      source_branch: context.git.source_branch,
      created_from_commit: context.git.created_from_commit,
    },
    status: context.status,
    created_at: context.created_at,
    updated_at: context.updated_at,
  };
}

export function currentJson(branch: string, context: BranchContext): Record<string, unknown> {
  return {
    ok: true,
    branch,
    context: publicContext(context),
  };
}

export function currentMarkdown(branch: string, context: BranchContext): string {
  const item = context.work_item;
  const lines = [
    `当前分支：${branch}`,
    `工作项：${item.entity_type} ${item.id}`,
  ];
  if (item.title) {
    lines.push(`标题：${item.title}`);
  }
  if (item.url) {
    lines.push(`链接：${item.url}`);
  }
  if (item.workspace_id) {
    lines.push(`项目：${item.workspace_id}`);
  }
  lines.push(`负责人：${context.assignee.display_name || "未提供"}`);
  lines.push(`绑定方式：${context.binding.method}`);
  lines.push(`本地阶段：${context.status.local_phase}`);
  lines.push(`base 分支：${context.git.base_branch}`);
  return lines.join("\n");
}
