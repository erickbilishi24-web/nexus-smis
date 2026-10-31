import { and, asc, eq } from "drizzle-orm";
import { commentBank, staffProfiles, users } from "../drizzle/schema";
import { getDb } from "./db";
import { can } from "./access";

export type CommentRole = "class_teacher" | "principal";
export type CommentCategory = "BE" | "AE" | "ME" | "EE";

const classComments: Record<CommentCategory, string[]> = {
  BE: ["Requires additional support to understand key concepts and develop the expected competencies.", "Is beginning to develop essential skills and would benefit from regular guided practice.", "Needs more practice applying learned concepts to practical tasks and everyday situations.", "Is encouraged to participate more actively in learning activities to strengthen understanding.", "Would benefit from structured support in literacy and numeracy skills.", "Needs to improve consistency when completing assigned learning activities.", "Is developing foundational competencies and should continue practising with guidance.", "Requires encouragement to explain ideas and demonstrate understanding independently.", "Should focus on mastering basic skills before progressing to more complex tasks.", "Can make progress through regular practice, targeted support and active participation."],
  AE: ["Is making progress towards the expected competencies and should continue practising consistently.", "Demonstrates growing understanding of concepts but needs further practice applying them independently.", "Is developing problem-solving skills and should work on explaining solutions clearly.", "Participates in learning activities and is encouraged to contribute more consistently.", "Is improving in essential skills and should continue strengthening areas that remain challenging.", "Shows potential to achieve the expected standard through focused effort and regular practice.", "Is beginning to apply learned skills in practical situations with some guidance.", "Is developing confidence in expressing ideas and sharing learning experiences.", "Completes many learning tasks but should improve accuracy and consistency.", "Should continue building on recent progress to achieve the expected learning outcomes."],
  ME: ["Meets the expected learning outcomes and demonstrates sound understanding of key concepts.", "Applies acquired skills appropriately in familiar learning situations.", "Demonstrates consistent progress in developing the expected competencies.", "Participates constructively and contributes positively to classroom learning activities.", "Shows sound problem-solving skills and applies knowledge to practical tasks.", "Works responsibly and completes learning activities to the expected standard.", "Communicates ideas clearly and demonstrates effective collaboration with peers.", "Demonstrates satisfactory independence when completing assigned tasks.", "Maintains consistent performance and should continue developing confidence and accuracy.", "Has achieved the expected competencies and is encouraged to sustain this progress."],
  EE: ["Consistently exceeds the expected learning outcomes and demonstrates advanced understanding.", "Applies knowledge creatively and effectively in unfamiliar situations.", "Demonstrates strong critical-thinking and problem-solving skills.", "Shows initiative and independently explores ideas beyond the basic learning requirements.", "Communicates ideas confidently and supports constructive collaboration.", "Demonstrates creativity, curiosity and effective application of acquired competencies.", "Produces high-quality work and applies feedback to improve further.", "Transfers knowledge and skills effectively across different learning situations.", "Demonstrates advanced independence and takes initiative in learning activities.", "Excels in the expected competencies and is encouraged to pursue further challenges."]
};
const principalComments: Record<CommentCategory, string[]> = {
  BE: ["Is encouraged to develop greater responsibility and consistency in meeting school expectations.", "Needs continued guidance in demonstrating self-discipline and making responsible choices.", "Should work towards showing greater respect for school rules and shared responsibilities.", "Would benefit from encouragement to participate positively in school activities.", "Is encouraged to develop more consistent habits of punctuality and preparedness.", "Needs support in building positive relationships and cooperating respectfully with others.", "Should demonstrate greater care in fulfilling assigned duties and responsibilities.", "Is encouraged to show improved commitment to school routines and expectations.", "Would benefit from guidance in developing confidence, accountability and positive conduct.", "With appropriate support and consistent effort, can strengthen personal responsibility and school engagement."],
  AE: ["Is making progress in accepting responsibility and should continue developing consistency.", "Is encouraged to demonstrate self-discipline more consistently in daily school activities.", "Shows growing awareness of school expectations and should continue making responsible choices.", "Is developing positive relationships and should continue strengthening respectful communication.", "Is encouraged to improve consistency in punctuality and preparedness.", "Shows willingness to participate in school activities and should build on this effort.", "Is developing a stronger sense of accountability and should follow through on assigned duties.", "Is encouraged to demonstrate greater initiative in contributing to the school community.", "Is making progress in personal development and should continue practising the school's values.", "Should build on recent improvements to demonstrate more consistent responsibility and positive conduct."],
  ME: ["Demonstrates appropriate conduct and generally meets the school's expectations.", "Shows respect for others and contributes positively to the school community.", "Demonstrates a sound sense of responsibility in carrying out assigned duties.", "Generally makes responsible choices and follows established school routines.", "Works cooperatively with peers and demonstrates respect for different viewpoints.", "Shows commitment to school activities and contributes constructively when involved.", "Demonstrates growing independence, accountability and respect for school values.", "Maintains appropriate relationships with peers and members of the school community.", "Demonstrates a satisfactory commitment to personal development and responsible conduct.", "Is encouraged to maintain these positive habits and continue developing leadership and initiative."],
  EE: ["Consistently demonstrates exemplary responsibility and respect for school expectations.", "Serves as a positive role model through responsible conduct and considerate behaviour.", "Demonstrates strong leadership qualities and contributes positively to the school community.", "Shows initiative in supporting teamwork and encouraging others constructively.", "Consistently demonstrates integrity, accountability and respect for others.", "Takes responsibility for assigned duties and completes them with commendable commitment.", "Demonstrates maturity in decision-making and handles responsibilities confidently.", "Contributes positively to a respectful, inclusive and cooperative school environment.", "Demonstrates outstanding commitment to school values and personal development.", "Is encouraged to sustain these exemplary qualities and continue developing leadership potential."]
};

export const categoryLabel = (category: CommentCategory) => ({ BE: "B.E — Below Expectation", AE: "A.E — Approaching Expectation", ME: "M.E — Meeting Expectation", EE: "E.E — Exceeding Expectation" }[category]);
export const parentCategory = (level?: string | null): CommentCategory | null => {
  if (!level) return null;
  const prefix = level.toUpperCase().slice(0, 2);
  return prefix === "BE" || prefix === "AE" || prefix === "ME" || prefix === "EE" ? prefix : null;
};

async function seedCommentBank(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const existing = await db.select({ id: commentBank.id }).from(commentBank).limit(1);
  if (existing.length) return;
  const rows = (Object.keys(classComments) as CommentCategory[]).flatMap(category => [
    ...classComments[category].map((text, index) => ({ role: "class_teacher" as const, category, position: index + 1, text, active: 1 })),
    ...principalComments[category].map((text, index) => ({ role: "principal" as const, category, position: index + 1, text, active: 1 })),
  ]);
  await db.insert(commentBank).values(rows);
}

async function resolveRole(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number): Promise<CommentRole> {
  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const staff = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  return staff?.role === "class_teacher" || staff?.role === "teacher" || actor?.role === "user" ? "class_teacher" : "principal";
}

export async function listReportComments(input: { category: CommentCategory; userId: number; role?: CommentRole }) {
  const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await seedCommentBank(db);
  const role = input.role ?? await resolveRole(db, input.userId);
  const allowed = role === "principal" ? await can(input.userId, "admin", "settings.edit") : await can(input.userId, "user", "assessments.edit");
  if (!allowed) throw new Error("REPORT_COMMENT_FORBIDDEN");
  const rows = await db.select().from(commentBank).where(and(eq(commentBank.role, role), eq(commentBank.category, input.category), eq(commentBank.active, 1))).orderBy(asc(commentBank.position));
  return { role, category: input.category, categoryLabel: categoryLabel(input.category), comments: rows };
}

async function assertManager(userId: number) {
  if (!(await can(userId, "admin", "settings.edit"))) throw new Error("REPORT_COMMENT_BANK_FORBIDDEN");
}

export async function listCommentBankAdmin(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertManager(userId); await seedCommentBank(db);
  return db.select().from(commentBank).orderBy(asc(commentBank.role), asc(commentBank.category), asc(commentBank.position));
}

export async function createCommentBankEntry(input: { role: CommentRole; category: CommentCategory; text: string; userId: number }) {
  const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertManager(input.userId);
  const previous = await db.select({ position: commentBank.position }).from(commentBank)
    .where(and(eq(commentBank.role, input.role), eq(commentBank.category, input.category)))
    .orderBy(asc(commentBank.position));
  const position = previous.at(-1)?.position ?? 0;
  const result = await db.insert(commentBank).values({ role: input.role, category: input.category, position: position + 1, text: input.text.trim(), active: 1 });
  return { ok: true, id: Number(result[0].insertId) };
}

export async function updateCommentBankEntry(input: { id: number; text?: string; active?: boolean; userId: number }) {
  const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertManager(input.userId);
  await db.update(commentBank).set({ ...(input.text === undefined ? {} : { text: input.text.trim() }), ...(input.active === undefined ? {} : { active: input.active ? 1 : 0 }) }).where(eq(commentBank.id, input.id));
  return { ok: true };
}
