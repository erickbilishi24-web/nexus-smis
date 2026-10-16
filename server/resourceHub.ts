import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  resourceAuditLogs,
  resourceCategories,
  resourceRoleVisibility,
  resources,
  users,
  type Resource,
  type ResourceCategory,
  type User,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDb } from "./db";

export const DEFAULT_CATEGORIES = [
  { slug: "tpad", name: "TPAD", description: "Teacher Performance Appraisal and Development.", icon: "clipboard-check", displayOrder: 1 },
  { slug: "school-website", name: "School Website", description: "The official school website configured by your school team.", icon: "globe-2", displayOrder: 2 },
  { slug: "video-audio-lessons", name: "Video & Audio Lessons", description: "Digital teaching and learning resources.", icon: "play-square", displayOrder: 3 },
  { slug: "virtual-labs", name: "Virtual Labs", description: "Online science, mathematics, ICT, coding and robotics laboratories.", icon: "flask-conical", displayOrder: 4 },
  { slug: "kemis", name: "KEMIS", description: "Kenya Education Management Information System.", icon: "landmark", displayOrder: 5 },
  { slug: "knec", name: "KNEC", description: "Kenya National Examinations Council.", icon: "award", displayOrder: 6 },
] as const;

export const VISIBILITY_ROLES = ["user", "teacher", "learner", "parent", "admin"] as const;
export type VisibilityRole = (typeof VISIBILITY_ROLES)[number];

export function validateResourceUrl(value: string, allowHttp = false): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) throw new Error("A destination URL is required.");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Enter a complete destination URL, including https://.");
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "https:" && !(protocol === "http:" && allowHttp)) {
    if (protocol === "http:") throw new Error("HTTP links require explicit authorization before they can be saved.");
    throw new Error("Only HTTPS links are allowed. Unsafe URL schemes are rejected.");
  }
  if (!parsed.hostname || parsed.username || parsed.password) {
    throw new Error("The destination URL must contain a hostname and no embedded credentials.");
  }
  if (parsed.hash.length > 4096) throw new Error("The destination URL is too long.");
  return parsed.toString();
}

export function canManageResourceHub(user: Pick<User, "role" | "resourceHubManage" | "openId"> & { username?: string | null }): boolean {
  return user.role === "admin" && (user.username === "superadmin" || user.openId === (process.env.OWNER_OPEN_ID ?? ENV.ownerOpenId));
}

function requireDb() {
  return getDb().then(db => {
    if (!db) throw new Error("The Resource Hub database is not available.");
    return db;
  });
}

export async function ensureDefaultCategories(): Promise<ResourceCategory[]> {
  const db = await requireDb();
  const existing = await db.select().from(resourceCategories).orderBy(asc(resourceCategories.displayOrder));
  const existingSlugs = new Set(existing.map(category => category.slug));
  for (const category of DEFAULT_CATEGORIES) {
    if (!existingSlugs.has(category.slug)) {
      await db.insert(resourceCategories).values(category);
    }
  }
  return db.select().from(resourceCategories).orderBy(asc(resourceCategories.displayOrder), asc(resourceCategories.name));
}

export async function getResourceHubSnapshot() {
  const db = await requireDb();
  const categories = await ensureDefaultCategories();
  const allResources = await db.select().from(resources).orderBy(asc(resources.displayOrder), desc(resources.updatedAt));
  const allVisibility = allResources.length
    ? await db.select().from(resourceRoleVisibility).where(inArray(resourceRoleVisibility.resourceId, allResources.map(resource => resource.id)))
    : [];
  return { categories, resources: allResources, visibility: allVisibility };
}

export async function getResourcesForRole(role: string) {
  const snapshot = await getResourceHubSnapshot();
  const categoryMap = new Map(snapshot.categories.map(category => [category.id, category]));
  const visibilityMap = new Map<number, string[]>();
  for (const item of snapshot.visibility) {
    const current = visibilityMap.get(item.resourceId) ?? [];
    current.push(item.role);
    visibilityMap.set(item.resourceId, current);
  }
  const visibleResources = snapshot.resources
    .filter(resource => resource.isActive)
    .filter(resource => {
      const allowedRoles = visibilityMap.get(resource.id) ?? [];
      return allowedRoles.length === 0 || allowedRoles.includes("all") || allowedRoles.includes(role);
    })
    .map(resource => ({ ...resource, category: categoryMap.get(resource.categoryId) ?? null, visibilityRoles: visibilityMap.get(resource.id) ?? [] }))
    .filter(resource => resource.category !== null);

  return { categories: snapshot.categories, resources: visibleResources };
}

export async function getPublicCategorySummary() {
  const snapshot = await getResourceHubSnapshot();
  const counts = new Map<number, number>();
  for (const resource of snapshot.resources) {
    if (resource.isActive) counts.set(resource.categoryId, (counts.get(resource.categoryId) ?? 0) + 1);
  }
  return snapshot.categories.map(category => ({ ...category, activeCount: counts.get(category.id) ?? 0 }));
}

function auditResource(resource: Resource | undefined) {
  if (!resource) return null;
  return {
    id: resource.id,
    categoryId: resource.categoryId,
    title: resource.title,
    url: resource.url,
    description: resource.description,
    icon: resource.icon,
    grade: resource.grade,
    subject: resource.subject,
    learningArea: resource.learningArea,
    mediaType: resource.mediaType,
    allowHttp: resource.allowHttp,
    isActive: resource.isActive,
    displayOrder: resource.displayOrder,
  };
}

async function writeAudit(
  actor: User,
  action: string,
  targetLabel: string,
  resourceId: number | null,
  before: unknown,
  after: unknown,
) {
  const db = await requireDb();
  await db.insert(resourceAuditLogs).values({
    actorUserId: actor.id,
    action,
    resourceId,
    targetLabel,
    beforeJson: before === null || before === undefined ? null : JSON.stringify(before),
    afterJson: after === null || after === undefined ? null : JSON.stringify(after),
  });
}

export async function getAdminDashboard() {
  const snapshot = await getResourceHubSnapshot();
  const db = await requireDb();
  const audit = await db.select().from(resourceAuditLogs).orderBy(desc(resourceAuditLogs.createdAt), desc(resourceAuditLogs.id)).limit(40);
  const managers = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, resourceHubManage: users.resourceHubManage })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.name), asc(users.email));
  const categoryMap = new Map(snapshot.categories.map(category => [category.id, category]));
  const visibilityMap = new Map<number, string[]>();
  for (const item of snapshot.visibility) visibilityMap.set(item.resourceId, [...(visibilityMap.get(item.resourceId) ?? []), item.role]);
  const resourcesWithMeta = snapshot.resources.map(resource => ({
    ...resource,
    category: categoryMap.get(resource.categoryId) ?? null,
    visibilityRoles: visibilityMap.get(resource.id) ?? [],
  }));
  const activeCount = snapshot.resources.filter(resource => resource.isActive).length;
  const configuredCount = snapshot.resources.filter(resource => Boolean(resource.url)).length;
  return {
    categories: snapshot.categories,
    resources: resourcesWithMeta,
    audit,
    managers,
    stats: { total: snapshot.resources.length, active: activeCount, inactive: snapshot.resources.length - activeCount, configured: configuredCount, categories: snapshot.categories.length },
  };
}

export async function createResource(input: {
  categoryId: number;
  title: string;
  url: string;
  description: string;
  icon: string;
  grade?: string;
  subject?: string;
  learningArea?: string;
  mediaType?: string;
  allowHttp: boolean;
  isActive: boolean;
  displayOrder: number;
  visibilityRoles: string[];
}, actor: User) {
  const db = await requireDb();
  const category = await db.select().from(resourceCategories).where(eq(resourceCategories.id, input.categoryId)).limit(1);
  if (!category[0]) throw new Error("Choose one of the six configured Resource Hub categories.");
  const safeUrl = validateResourceUrl(input.url, input.allowHttp);
  const [result] = await db.insert(resources).values({
    categoryId: input.categoryId,
    title: input.title.trim(),
    url: safeUrl,
    description: input.description.trim(),
    icon: input.icon.trim() || category[0].icon,
    grade: input.grade?.trim() || null,
    subject: input.subject?.trim() || null,
    learningArea: input.learningArea?.trim() || null,
    mediaType: input.mediaType?.trim() || null,
    allowHttp: input.allowHttp,
    isActive: input.isActive,
    displayOrder: input.displayOrder,
    createdBy: actor.id,
    updatedBy: actor.id,
  });
  const resourceId = Number(result.insertId);
  if (input.visibilityRoles.length) {
    await db.insert(resourceRoleVisibility).values(input.visibilityRoles.map(role => ({ resourceId, role })));
  }
  const created = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1);
  await writeAudit(actor, "created", input.title.trim(), resourceId, null, auditResource(created[0]));
  return created[0];
}

export async function updateResource(resourceId: number, input: Omit<Parameters<typeof createResource>[0], "displayOrder"> & { displayOrder: number }, actor: User) {
  const db = await requireDb();
  const existing = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1);
  if (!existing[0]) throw new Error("Resource not found.");
  const category = await db.select().from(resourceCategories).where(eq(resourceCategories.id, input.categoryId)).limit(1);
  if (!category[0]) throw new Error("Choose one of the six configured Resource Hub categories.");
  const safeUrl = validateResourceUrl(input.url, input.allowHttp);
  await db.update(resources).set({
    categoryId: input.categoryId,
    title: input.title.trim(),
    url: safeUrl,
    description: input.description.trim(),
    icon: input.icon.trim() || category[0].icon,
    grade: input.grade?.trim() || null,
    subject: input.subject?.trim() || null,
    learningArea: input.learningArea?.trim() || null,
    mediaType: input.mediaType?.trim() || null,
    allowHttp: input.allowHttp,
    isActive: input.isActive,
    displayOrder: input.displayOrder,
    updatedBy: actor.id,
  }).where(eq(resources.id, resourceId));
  await db.delete(resourceRoleVisibility).where(eq(resourceRoleVisibility.resourceId, resourceId));
  if (input.visibilityRoles.length) await db.insert(resourceRoleVisibility).values(input.visibilityRoles.map(role => ({ resourceId, role })));
  const updated = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1);
  await writeAudit(actor, "updated", input.title.trim(), resourceId, auditResource(existing[0]), auditResource(updated[0]));
  return updated[0];
}

export async function setResourceActive(resourceId: number, isActive: boolean, actor: User) {
  const db = await requireDb();
  const existing = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1);
  if (!existing[0]) throw new Error("Resource not found.");
  await db.update(resources).set({ isActive, updatedBy: actor.id }).where(eq(resources.id, resourceId));
  await writeAudit(actor, isActive ? "activated" : "deactivated", existing[0].title, resourceId, auditResource(existing[0]), { ...auditResource(existing[0]), isActive });
  return { success: true } as const;
}

export async function deleteResource(resourceId: number, actor: User) {
  const db = await requireDb();
  const existing = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1);
  if (!existing[0]) throw new Error("Resource not found.");
  await db.delete(resourceRoleVisibility).where(eq(resourceRoleVisibility.resourceId, resourceId));
  await db.delete(resources).where(eq(resources.id, resourceId));
  await writeAudit(actor, "deleted", existing[0].title, resourceId, auditResource(existing[0]), null);
  return { success: true } as const;
}

export async function reorderResource(resourceId: number, displayOrder: number, actor: User) {
  const db = await requireDb();
  const existing = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1);
  if (!existing[0]) throw new Error("Resource not found.");
  await db.update(resources).set({ displayOrder, updatedBy: actor.id }).where(eq(resources.id, resourceId));
  await writeAudit(actor, "reordered", existing[0].title, resourceId, { displayOrder: existing[0].displayOrder }, { displayOrder });
  return { success: true } as const;
}

export async function setResourceVisibility(resourceId: number, visibilityRoles: string[], actor: User) {
  const db = await requireDb();
  const existing = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1);
  if (!existing[0]) throw new Error("Resource not found.");
  const before = await db.select().from(resourceRoleVisibility).where(eq(resourceRoleVisibility.resourceId, resourceId));
  await db.delete(resourceRoleVisibility).where(eq(resourceRoleVisibility.resourceId, resourceId));
  if (visibilityRoles.length) await db.insert(resourceRoleVisibility).values(visibilityRoles.map(role => ({ resourceId, role })));
  await writeAudit(actor, "visibility_changed", existing[0].title, resourceId, before.map(item => item.role), visibilityRoles);
  return { success: true } as const;
}

export async function setResourceManager(targetUserId: number, resourceHubManage: boolean, actor: User) {
  const db = await requireDb();
  const target = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!target[0] || target[0].role !== "admin") throw new Error("Only an existing admin can be granted Resource Hub management access.");
  if (targetUserId === actor.id && !resourceHubManage) throw new Error("The active Super Admin cannot remove their own management access.");
  await db.update(users).set({ resourceHubManage }).where(eq(users.id, targetUserId));
  await writeAudit(actor, resourceHubManage ? "manager_granted" : "manager_revoked", target[0].name || target[0].email || `User ${targetUserId}`, null, { resourceHubManage: target[0].resourceHubManage }, { resourceHubManage });
  return { success: true } as const;
}
