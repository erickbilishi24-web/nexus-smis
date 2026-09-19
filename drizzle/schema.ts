import {
  bigint,
  date,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Manus OAuth users. This table is provided by the WebDev full-stack template. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const schoolSettings = mysqlTable("school_settings", {
  id: int("id").autoincrement().primaryKey(),
  schoolName: varchar("schoolName", { length: 200 }).notNull(),
  motto: varchar("motto", { length: 255 }),
  currentTerm: varchar("currentTerm", { length: 40 }).notNull(),
  academicYear: int("academicYear").notNull(),
  includeFeesOnReportCard: int("includeFeesOnReportCard").notNull().default(1),
  logoPath: varchar("logoPath", { length: 255 }),
  principalSignaturePath: varchar("principalSignaturePath", { length: 255 }),
  classTeacherSignaturePath: varchar("classTeacherSignaturePath", { length: 255 }),
});

export const staffProfiles = mysqlTable("staff_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  role: mysqlEnum("role", ["super_admin", "admin", "teacher", "finance", "storekeeper", "other"]).notNull().default("other"),
  status: mysqlEnum("status", ["active", "disabled"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const grades = mysqlTable("grades", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  stream: varchar("stream", { length: 80 }),
  classTeacherUserId: int("classTeacherUserId"),
});

export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  code: varchar("code", { length: 30 }).notNull().unique(),
});

export const learners = mysqlTable("learners", {
  id: int("id").autoincrement().primaryKey(),
  admissionNumber: varchar("admissionNumber", { length: 40 }).notNull().unique(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  guardianName: varchar("guardianName", { length: 160 }),
  guardianPhone: varchar("guardianPhone", { length: 40 }),
  gradeId: int("gradeId").notNull(),
  status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const teacherAllocations = mysqlTable("teacher_allocations", {
  id: int("id").autoincrement().primaryKey(),
  teacherUserId: int("teacherUserId").notNull(),
  gradeId: int("gradeId").notNull(),
  subjectId: int("subjectId").notNull(),
  academicYear: int("academicYear").notNull(),
});

export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 120 }).notNull(),
  term: varchar("term", { length: 40 }).notNull(),
  academicYear: int("academicYear").notNull(),
  gradeId: int("gradeId").notNull(),
  status: mysqlEnum("status", ["draft", "open", "locked", "approved"]).notNull().default("open"),
});

export const marks = mysqlTable("marks", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  learnerId: int("learnerId").notNull(),
  subjectId: int("subjectId").notNull(),
  midTerm: decimal("midTerm", { precision: 5, scale: 2 }).notNull(),
  endTerm: decimal("endTerm", { precision: 5, scale: 2 }).notNull(),
  average: decimal("average", { precision: 5, scale: 2 }).notNull(),
  cbcLevel: mysqlEnum("cbcLevel", ["EE1", "EE2", "ME1", "ME2", "AE1", "AE2", "BE1", "BE2"]).notNull(),
  teacherRemark: varchar("teacherRemark", { length: 255 }),
});

export const attendances = mysqlTable("attendances", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  gradeId: int("gradeId").notNull(),
  attendanceDate: date("attendanceDate").notNull(),
  status: mysqlEnum("status", ["present", "absent", "late", "excused"]).notNull(),
  note: varchar("note", { length: 255 }),
});

export const feeStructures = mysqlTable("fee_structures", {
  id: int("id").autoincrement().primaryKey(),
  gradeId: int("gradeId").notNull(),
  term: varchar("term", { length: 40 }).notNull(),
  academicYear: int("academicYear").notNull(),
  itemName: varchar("itemName", { length: 120 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
});

export const payments = mysqlTable("payments", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["mpesa", "bank", "cash"]).notNull(),
  reference: varchar("reference", { length: 80 }).notNull().unique(),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
});

export const storeItems = mysqlTable("store_items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  reorderLevel: decimal("reorderLevel", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const storeMovements = mysqlTable("store_movements", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  movementType: mysqlEnum("movementType", ["received", "issued", "adjustment"]).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const timetableEntries = mysqlTable("timetable_entries", {
  id: int("id").autoincrement().primaryKey(),
  gradeId: int("gradeId").notNull(),
  subjectId: int("subjectId").notNull(),
  teacherUserId: int("teacherUserId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(),
  period: int("period").notNull(),
  room: varchar("room", { length: 80 }),
});

export const communications = mysqlTable("communications", {
  id: int("id").autoincrement().primaryKey(),
  audience: mysqlEnum("audience", ["parents", "staff", "learners", "all"]).notNull(),
  channel: mysqlEnum("channel", ["sms", "notice", "email"]).notNull(),
  subject: varchar("subject", { length: 160 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "queued", "sent", "failed"]).notNull().default("draft"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const alumni = mysqlTable("alumni", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull().unique(),
  completionYear: int("completionYear").notNull(),
  destination: varchar("destination", { length: 160 }),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  archivedByUserId: int("archivedByUserId").notNull(),
});

export const auditLogs = mysqlTable("smis_audit_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }),
  entityId: varchar("entityId", { length: 80 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Learner = typeof learners.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type Mark = typeof marks.$inferSelect;
export type Payment = typeof payments.$inferSelect;
