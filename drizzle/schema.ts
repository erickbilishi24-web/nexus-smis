import {
  bigint,
  boolean,
  date,
  decimal,
  int,
  longtext,
  index,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Manus OAuth users. This table is provided by the WebDev full-stack template. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  schoolId: int("schoolId"),
  username: varchar("username", { length: 120 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  accountStatus: mysqlEnum("accountStatus", ["active", "disabled", "locked", "pending_activation"]).notNull().default("active"),
  failedLoginAttempts: int("failedLoginAttempts").notNull().default(0),
  accountLocked: int("accountLocked").notNull().default(0),
  mustChangePassword: int("mustChangePassword").notNull().default(0),
  passwordChangedAt: timestamp("passwordChangedAt"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  resourceHubManage: boolean("resourceHubManage").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export const schools = mysqlTable("schools", {
  id: int("id").autoincrement().primaryKey(),
  schoolCode: varchar("schoolCode", { length: 40 }).notNull().unique(),
  schoolName: varchar("schoolName", { length: 200 }).notNull(),
  status: mysqlEnum("status", ["active", "pending_activation", "suspended", "disabled"]).notNull().default("pending_activation"),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const schoolSettings = mysqlTable("school_settings", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  schoolName: varchar("schoolName", { length: 200 }).notNull(),
  motto: varchar("motto", { length: 255 }),
  currentTerm: varchar("currentTerm", { length: 40 }).notNull(),
  academicYear: int("academicYear").notNull(),
  includeFeesOnReportCard: int("includeFeesOnReportCard").notNull().default(1),
  showPercentagesOnReportCard: int("showPercentagesOnReportCard").notNull().default(0),
  logoPath: varchar("logoPath", { length: 255 }),
  principalSignaturePath: varchar("principalSignaturePath", { length: 255 }),
  classTeacherSignaturePath: varchar("classTeacherSignaturePath", { length: 255 }),
  address: varchar("address", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  geofenceRadiusMeters: int("geofenceRadiusMeters").notNull().default(150),
  enabledSchoolLevels: varchar("enabledSchoolLevels", { length: 255 }).notNull().default("ECDE,Lower Primary,Upper Primary,Junior School,Senior School"),
  subjectShortNames: text("subjectShortNames"),
});

export const staffProfiles = mysqlTable("staff_profiles", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  userId: int("userId").notNull(),
  teacherCode: int("teacherCode").unique(),
  staffId: varchar("staffId", { length: 40 }),
  department: varchar("department", { length: 120 }),
  title: varchar("title", { length: 30 }),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  designation: varchar("designation", { length: 120 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 40 }),
  role: mysqlEnum("role", ["super_admin", "admin", "teacher", "class_teacher", "senior_teacher", "deputy_head", "head_teacher", "finance", "storekeeper", "other"]).notNull().default("other"),
  status: mysqlEnum("status", ["active", "disabled"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ staffSchoolNameIdx: index("staff_school_name_idx").on(table.schoolId, table.displayName) }));

export const grades = mysqlTable("grades", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  name: varchar("name", { length: 80 }).notNull(),
  stream: varchar("stream", { length: 80 }),
  classTeacherUserId: int("classTeacherUserId"),
});

export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  name: varchar("name", { length: 120 }).notNull(),
  code: varchar("code", { length: 30 }).notNull().unique(),
});

export const learners = mysqlTable("learners", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  admissionNumber: varchar("admissionNumber", { length: 40 }).notNull().unique(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  guardianName: varchar("guardianName", { length: 160 }),
  guardianIdNumber: varchar("guardianIdNumber", { length: 40 }),
  guardianPhone: varchar("guardianPhone", { length: 40 }),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  dateOfBirth: date("dateOfBirth"),
  contactAddress: varchar("contactAddress", { length: 255 }),
  gradeId: int("gradeId").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "archived"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ learnerSchoolNameIdx: index("learner_school_name_idx").on(table.schoolId, table.fullName) }));

export const guardians = mysqlTable("guardians", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  idNumber: varchar("idNumber", { length: 40 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  communicationPreference: mysqlEnum("communicationPreference", ["sms", "email", "phone"]).notNull().default("sms"),
});

export const learnerGuardians = mysqlTable("learner_guardians", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  learnerId: int("learnerId").notNull(),
  guardianId: int("guardianId").notNull(),
  relationship: varchar("relationship", { length: 80 }).notNull(),
  isPrimary: int("isPrimary").notNull().default(0),
}, table => ({ learnerGuardianUnique: uniqueIndex("learner_guardian_unique").on(table.learnerId, table.guardianId) }));

export const teacherAllocations = mysqlTable("teacher_allocations", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  teacherUserId: int("teacherUserId").notNull(),
  gradeId: int("gradeId").notNull(),
  subjectId: int("subjectId").notNull(),
  academicYear: int("academicYear").notNull(),
  term: varchar("term", { length: 40 }).notNull().default("Term 1"),
  allocationType: mysqlEnum("allocationType", ["class_teacher", "learning_area", "co_teacher", "substitute", "activity"]).notNull().default("learning_area"),
  status: mysqlEnum("status", ["active", "inactive", "replaced"]).notNull().default("active"),
  startsOn: date("startsOn"),
  endsOn: date("endsOn"),
  replacedByUserId: int("replacedByUserId"),
}, table => ({ teacherAllocationScopeUnique: uniqueIndex("teacher_allocation_scope_unique").on(table.teacherUserId, table.gradeId, table.subjectId, table.academicYear, table.term, table.allocationType) }));

export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  title: varchar("title", { length: 120 }).notNull(),
  term: varchar("term", { length: 40 }).notNull(),
  academicYear: int("academicYear").notNull(),
  gradeId: int("gradeId").notNull(),
  subjectId: int("subjectId").notNull(),
  teacherUserId: int("teacherUserId").notNull(),
  assessmentType: mysqlEnum("assessmentType", ["mid_term", "end_term"]).notNull().default("end_term"),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "locked"]).notNull().default("draft"),
  submittedAt: timestamp("submittedAt"),
  verifiedByUserId: int("verifiedByUserId"),
  verifiedAt: timestamp("verifiedAt"),
  lockedAt: timestamp("lockedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ assessmentScopeUnique: uniqueIndex("assessment_scope_unique").on(table.academicYear, table.term, table.assessmentType, table.gradeId, table.subjectId) }));

export const marks = mysqlTable("marks", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  assessmentId: int("assessmentId").notNull(),
  learnerId: int("learnerId").notNull(),
  subjectId: int("subjectId").notNull(),
  teacherUserId: int("teacherUserId").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }),
  midTerm: decimal("midTerm", { precision: 5, scale: 2 }),
  endTerm: decimal("endTerm", { precision: 5, scale: 2 }),
  average: decimal("average", { precision: 5, scale: 2 }),
  cbcLevel: mysqlEnum("cbcLevel", ["EE1", "EE2", "ME1", "ME2", "AE1", "AE2", "BE1", "BE2"]),
  teacherRemark: varchar("teacherRemark", { length: 255 }),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ markUnique: uniqueIndex("mark_unique").on(table.assessmentId, table.learnerId, table.subjectId) }));

export const attendances = mysqlTable("attendances", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  learnerId: int("learnerId").notNull(),
  gradeId: int("gradeId").notNull(),
  attendanceDate: date("attendanceDate").notNull(),
  session: mysqlEnum("session", ["morning", "afternoon"]).notNull().default("morning"),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["present", "absent", "late", "excused"]).notNull(),
  note: varchar("note", { length: 255 }),
}, table => ({ attendanceUnique: uniqueIndex("attendance_unique").on(table.learnerId, table.attendanceDate, table.session) }));
export const attendanceRegisterApprovals = mysqlTable("attendance_register_approvals", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  attendanceDate: date("attendanceDate").notNull(),
  gradeId: int("gradeId").notNull(),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "reopened"]).notNull().default("draft"),
  submittedByUserId: int("submittedByUserId"),
  submittedAt: timestamp("submittedAt"),
  approvedByUserId: int("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  notes: varchar("notes", { length: 255 }),
}, table => ({ attendanceRegisterApprovalUnique: uniqueIndex("attendance_register_approval_unique").on(table.attendanceDate, table.gradeId) }));

export const feeStructures = mysqlTable("fee_structures", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  gradeId: int("gradeId").notNull(),
  term: varchar("term", { length: 40 }).notNull(),
  academicYear: int("academicYear").notNull(),
  itemName: varchar("itemName", { length: 120 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
});

export const payments = mysqlTable("payments", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  learnerId: int("learnerId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["mpesa", "bank", "cash"]).notNull(),
  reference: varchar("reference", { length: 80 }).notNull().unique(),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
});

export const storeItems = mysqlTable("store_items", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  name: varchar("name", { length: 160 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  reorderLevel: decimal("reorderLevel", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const storeMovements = mysqlTable("store_movements", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  itemId: int("itemId").notNull(),
  movementType: mysqlEnum("movementType", ["received", "issued", "adjustment"]).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const timetableEntries = mysqlTable("timetable_entries", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  gradeId: int("gradeId").notNull(),
  subjectId: int("subjectId").notNull(),
  teacherUserId: int("teacherUserId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(),
  period: int("period").notNull(),
  room: varchar("room", { length: 80 }),
  isForcePlaced: boolean("isForcePlaced").notNull().default(false),
}, table => ({ timetableGradeSlotUnique: uniqueIndex("timetable_grade_slot_unique").on(table.gradeId, table.dayOfWeek, table.period) }));

export const timetableRequirements = mysqlTable("timetable_requirements", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  gradeId: int("gradeId").notNull(),
  subjectId: int("subjectId").notNull(),
  academicYear: int("academicYear").notNull(),
  periodsPerWeek: int("periodsPerWeek").notNull(),
}, table => ({ timetableRequirementUnique: uniqueIndex("timetable_requirement_unique").on(table.gradeId, table.subjectId, table.academicYear) }));

export const communications = mysqlTable("communications", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  audience: mysqlEnum("audience", ["parents", "staff", "learners", "all"]).notNull(),
  channel: mysqlEnum("channel", ["sms", "notice", "email"]).notNull(),
  subject: varchar("subject", { length: 160 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "queued", "sent", "failed"]).notNull().default("draft"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const nexusMessages = mysqlTable("nexus_messages", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  category: varchar("category", { length: 80 }).notNull().default("announcement"),
  channel: mysqlEnum("channel", ["sms", "email", "in_app", "whatsapp"]).notNull().default("in_app"),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "queued", "sent", "failed", "cancelled"]).notNull().default("queued"),
  selectionJson: text("selectionJson"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const nexusMessageRecipients = mysqlTable("nexus_message_recipients", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  messageId: int("messageId").notNull(),
  recipientType: varchar("recipientType", { length: 30 }).notNull(),
  recipientId: int("recipientId").notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["queued", "sent", "failed"]).notNull().default("queued"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ messageRecipientUnique: uniqueIndex("nexus_message_recipient_unique").on(table.messageId, table.recipientType, table.recipientId) }));

export const curriculumOfferings = mysqlTable("curriculum_offerings", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  level: varchar("level", { length: 40 }).notNull(),
  gradeLabel: varchar("gradeLabel", { length: 40 }).notNull(),
  pathway: varchar("pathway", { length: 100 }),
  learningArea: varchar("learningArea", { length: 160 }).notNull(),
  subjectCode: varchar("subjectCode", { length: 40 }),
  offered: int("offered").notNull().default(1),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  updatedByUserId: int("updatedByUserId").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, table => ({ curriculumOfferingUnique: uniqueIndex("curriculum_offering_unique").on(table.level, table.gradeLabel, table.pathway, table.learningArea) }));

export const alumni = mysqlTable("alumni", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  learnerId: int("learnerId").notNull().unique(),
  completionYear: int("completionYear").notNull(),
  finalGradeId: int("finalGradeId"),
  finalClassName: varchar("finalClassName", { length: 120 }),
  completionStatus: mysqlEnum("completionStatus", ["completed", "graduated", "transferred", "withdrawn", "other"]).notNull().default("completed"),
  completionDate: date("completionDate"),
  destination: varchar("destination", { length: 160 }),
  contactPhone: varchar("contactPhone", { length: 40 }),
  engagementNotes: text("engagementNotes"),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  archivedByUserId: int("archivedByUserId").notNull(),
});
export const learnerExits = mysqlTable("learner_exits", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  learnerId: int("learnerId").notNull(),
  status: mysqlEnum("status", ["completed", "graduated", "transferred", "withdrawn", "other"]).notNull(),
  effectiveDate: date("effectiveDate").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  finalGradeId: int("finalGradeId"),
  notes: text("notes"),
  processedByUserId: int("processedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ learnerExitDateUnique: uniqueIndex("learner_exit_date_unique").on(table.learnerId, table.effectiveDate) }));
export const counsellingCases = mysqlTable("counselling_cases", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  learnerId: int("learnerId").notNull(),
  referralSource: varchar("referralSource", { length: 80 }).notNull().default("staff"),
  concern: varchar("concern", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "closed", "archived"]).notNull().default("open"),
  assignedCounsellorUserId: int("assignedCounsellorUserId"),
  interventionPlan: text("interventionPlan"),
  closureOutcome: text("closureOutcome"),
  reviewDate: date("reviewDate"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const counsellingNotes = mysqlTable("counselling_notes", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  caseId: int("caseId").notNull(),
  note: text("note").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const counsellingFollowUps = mysqlTable("counselling_follow_ups", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  caseId: int("caseId").notNull(),
  scheduledFor: date("scheduledFor").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).notNull().default("pending"),
  completedAt: timestamp("completedAt"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const behaviourRecords = mysqlTable("behaviour_records", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  learnerId: int("learnerId").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(),
  outcome: varchar("outcome", { length: 500 }),
  isApprovedForReport: int("isApprovedForReport").notNull().default(0),
  recordedByUserId: int("recordedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("smis_audit_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  userId: int("userId"),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }),
  entityId: varchar("entityId", { length: 80 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const iamSessions = mysqlTable("iam_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionHash: varchar("sessionHash", { length: 128 }).notNull().unique(),
  loginAt: timestamp("loginAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  logoutAt: timestamp("logoutAt"),
  ipAddress: varchar("ipAddress", { length: 80 }),
  userAgent: varchar("userAgent", { length: 500 }),
  status: mysqlEnum("status", ["active", "revoked", "expired"]).notNull().default("active"),
});

export const iamPasswordResets = mysqlTable("iam_password_resets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
});

export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  permissionKey: varchar("permissionKey", { length: 120 }).notNull().unique(),
  description: varchar("description", { length: 255 }).notNull(),
});

export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  permissionKey: varchar("permissionKey", { length: 120 }).notNull(),
  allowed: int("allowed").notNull().default(1),
});

export const expenditures = mysqlTable("expenditures", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  expenditureDate: date("expenditureDate").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  responsiblePerson: varchar("responsiblePerson", { length: 160 }).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  audience: mysqlEnum("audience", ["parents", "staff", "learners", "all"]).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const nexusAiTransactions = mysqlTable("nexus_ai_transactions", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  userId: int("userId").notNull(),
  documentType: varchar("documentType", { length: 80 }).notNull(),
  documentTitle: varchar("documentTitle", { length: 255 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 40 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  mpesaReceipt: varchar("mpesaReceipt", { length: 80 }),
  status: mysqlEnum("status", ["pending", "paid", "failed", "cancelled"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
});
export const reportCards = mysqlTable("report_cards", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  learnerId: int("learnerId").notNull(),
  academicYear: int("academicYear").notNull(),
  term: varchar("term", { length: 40 }).notNull(),
  assessmentType: mysqlEnum("assessmentType", ["mid_term", "end_term"]).notNull().default("end_term"),
  status: mysqlEnum("status", ["draft", "generated", "reviewed", "approved", "published"]).notNull().default("draft"),
  classTeacherComment: text("classTeacherComment"),
  headTeacherComment: text("headTeacherComment"),
  generatedByUserId: int("generatedByUserId"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ reportCardPeriodUnique: uniqueIndex("report_card_period_unique").on(table.learnerId, table.academicYear, table.term, table.assessmentType) }));
export const commentBank = mysqlTable("report_card_comment_bank", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  role: mysqlEnum("role", ["class_teacher", "principal"]).notNull(),
  category: mysqlEnum("category", ["BE", "AE", "ME", "EE"]).notNull(),
  position: int("position").notNull(),
  text: text("text").notNull(),
  active: int("active").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ commentUnique: uniqueIndex("comment_bank_role_category_position").on(table.role, table.category, table.position) }));
export const nexusFeedback = mysqlTable("nexus_feedback", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const academicYears = mysqlTable("academic_years", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), year: int("year").notNull().unique(), startsOn: date("startsOn").notNull(), endsOn: date("endsOn").notNull(), rolloverOn: date("rolloverOn"), isCurrent: int("isCurrent").notNull().default(0), status: mysqlEnum("status", ["planned", "active", "closed"]).notNull().default("planned"), createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const academicTerms = mysqlTable("academic_terms", { id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), academicYearId: int("academicYearId").notNull(), name: varchar("name", { length: 40 }).notNull(), startsOn: date("startsOn").notNull(), endsOn: date("endsOn").notNull(), isActive: int("isActive").notNull().default(0) }, table => ({ termUnique: uniqueIndex("academic_term_unique").on(table.academicYearId, table.name) }));
export const learnerEnrolments = mysqlTable("learner_enrolments", { id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), learnerId: int("learnerId").notNull(), academicYearId: int("academicYearId").notNull(), gradeId: int("gradeId").notNull(), className: varchar("className", { length: 80 }), status: mysqlEnum("status", ["active", "completed", "repeating", "transferred", "withdrawn", "pending_action"]).notNull().default("active"), source: varchar("source", { length: 40 }).notNull().default("manual"), createdAt: timestamp("createdAt").defaultNow().notNull() }, table => ({ enrolmentUnique: uniqueIndex("learner_year_enrolment_unique").on(table.learnerId, table.academicYearId) }));
export const rolloverRuns = mysqlTable("rollover_runs", { id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), fromAcademicYearId: int("fromAcademicYearId").notNull(), toAcademicYearId: int("toAcademicYearId").notNull(), status: mysqlEnum("status", ["preview", "approved", "reversed", "failed"]).notNull().default("preview"), actorUserId: int("actorUserId").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), approvedAt: timestamp("approvedAt"), reason: varchar("reason", { length: 255 }) });
export const rolloverItems = mysqlTable("rollover_items", { id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), runId: int("runId").notNull(), learnerId: int("learnerId").notNull(), fromGradeId: int("fromGradeId").notNull(), toGradeId: int("toGradeId"), status: mysqlEnum("status", ["ready", "pending_action", "approved", "excluded", "reversed"]).notNull().default("ready"), reason: varchar("reason", { length: 255 }), createdAt: timestamp("createdAt").defaultNow().notNull() });
export type Learner = typeof learners.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type Mark = typeof marks.$inferSelect;
export type Payment = typeof payments.$inferSelect;

export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  role: varchar("role", { length: 40 }).notNull(),
  permissionKey: varchar("permissionKey", { length: 120 }).notNull(),
  allowed: int("allowed").notNull().default(1),
}, table => ({ rolePermissionUnique: uniqueIndex("role_permission_unique").on(table.role, table.permissionKey) }));

export const staffClockings = mysqlTable("staff_clockings", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  schoolId: int("schoolId"),
  userId: int("userId").notNull(),
  clockDate: date("clockDate").notNull(),
  clockedAt: timestamp("clockedAt").defaultNow().notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  distanceMeters: decimal("distanceMeters", { precision: 10, scale: 2 }).notNull(),
}, table => ({ staffClockingDailyUnique: uniqueIndex("staff_clocking_daily_unique").on(table.userId, table.clockDate) }));

export const libraryCategories = mysqlTable("library_categories", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), name: varchar("name", { length: 120 }).notNull().unique(), active: int("active").notNull().default(1),
});
export const libraryBooks = mysqlTable("library_books", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), isbn: varchar("isbn", { length: 40 }), title: varchar("title", { length: 200 }).notNull(), author: varchar("author", { length: 160 }), publisher: varchar("publisher", { length: 160 }), pubYear: int("pubYear"), subject: varchar("subject", { length: 120 }), categoryId: int("categoryId"), deletedAt: timestamp("deletedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const libraryCopies = mysqlTable("library_copies", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), bookId: int("bookId").notNull(), accessionNo: varchar("accessionNo", { length: 80 }).notNull().unique(), barcode: varchar("barcode", { length: 80 }).notNull().unique(), status: mysqlEnum("status", ["available", "borrowed", "lost", "damaged", "withdrawn"]).notNull().default("available"), location: varchar("location", { length: 120 }), condition: varchar("condition", { length: 40 }).notNull().default("good"), acquiredOn: date("acquiredOn"), cost: decimal("cost", { precision: 12, scale: 2 }),
});
export const libraryLoans = mysqlTable("library_loans", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  schoolId: int("schoolId"), copyId: int("copyId").notNull(), learnerId: int("learnerId"), staffUserId: int("staffUserId"), loanedOn: date("loanedOn").notNull(), dueDate: date("dueDate").notNull(), returnedOn: date("returnedOn"), renewedCount: int("renewedCount").notNull().default(0), issuedByUserId: int("issuedByUserId").notNull(),
});
export const libraryReservations = mysqlTable("library_reservations", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), bookId: int("bookId").notNull(), learnerId: int("learnerId"), staffUserId: int("staffUserId"), status: mysqlEnum("status", ["waiting", "ready", "fulfilled", "cancelled"]).notNull().default("waiting"), createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const libraryFines = mysqlTable("library_fines", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), loanId: bigint("loanId", { mode: "number" }).notNull(), amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), paid: decimal("paid", { precision: 12, scale: 2 }).notNull().default("0"), reason: varchar("reason", { length: 255 }), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const resourceCategories = mysqlTable("resource_categories", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), slug: varchar("slug", { length: 64 }).notNull().unique(), name: varchar("name", { length: 120 }).notNull(), description: text("description").notNull(), icon: varchar("icon", { length: 64 }).notNull(), displayOrder: int("displayOrder").notNull().default(0), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ orderIdx: index("resource_categories_order_idx").on(table.displayOrder) }));
export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), categoryId: int("categoryId").notNull(), title: varchar("title", { length: 160 }).notNull(), url: varchar("url", { length: 2048 }).notNull(), description: text("description").notNull(), icon: varchar("icon", { length: 64 }).notNull(), grade: varchar("grade", { length: 80 }), subject: varchar("subject", { length: 120 }), learningArea: varchar("learningArea", { length: 160 }), mediaType: varchar("mediaType", { length: 80 }), allowHttp: boolean("allowHttp").notNull().default(false), isActive: boolean("isActive").notNull().default(false), displayOrder: int("displayOrder").notNull().default(0), createdBy: int("createdBy"), updatedBy: int("updatedBy"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ categoryOrderIdx: index("resources_category_order_idx").on(table.categoryId, table.displayOrder), activeIdx: index("resources_active_idx").on(table.isActive) }));
export const resourceRoleVisibility = mysqlTable("resource_role_visibility", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), resourceId: int("resourceId").notNull(), role: varchar("role", { length: 64 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ resourceRoleIdx: index("resource_role_visibility_resource_role_idx").on(table.resourceId, table.role) }));
export const resourceAuditLogs = mysqlTable("resource_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId"), actorUserId: int("actorUserId").notNull(), action: varchar("action", { length: 64 }).notNull(), resourceId: int("resourceId"), targetLabel: varchar("targetLabel", { length: 200 }).notNull(), beforeJson: text("beforeJson"), afterJson: text("afterJson"), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ auditCreatedIdx: index("resource_audit_created_idx").on(table.createdAt) }));
export type ResourceCategory = typeof resourceCategories.$inferSelect;
export type Resource = typeof resources.$inferSelect;
// Extracted Drizzle table declarations from the validated NEXUS host schema.

export const payrollRules = mysqlTable("payroll_rules", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  effectiveFrom: date("effectiveFrom").notNull(),
  rulesJson: longtext("rulesJson").notNull(),
  sourceNotes: varchar("sourceNotes", { length: 600 }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ rulesEffectiveUnique: uniqueIndex("payroll_rules_school_effective_unique").on(table.schoolId, table.effectiveFrom) }));

export const payrollCompensation = mysqlTable("payroll_compensation", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  staffProfileId: int("staffProfileId").notNull(),
  effectiveFrom: date("effectiveFrom").notNull(),
  effectiveTo: date("effectiveTo"),
  basicSalary: decimal("basicSalary", { precision: 12, scale: 2 }).notNull(),
  earningsJson: longtext("earningsJson").notNull(),
  deductionsJson: longtext("deductionsJson").notNull(),
  resident: int("resident").notNull().default(1),
  additionalPension: decimal("additionalPension", { precision: 12, scale: 2 }).notNull().default("0"),
  postRetirementMedical: decimal("postRetirementMedical", { precision: 12, scale: 2 }).notNull().default("0"),
  mortgageInterest: decimal("mortgageInterest", { precision: 12, scale: 2 }).notNull().default("0"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ staffCompEffectiveUnique: uniqueIndex("payroll_comp_school_staff_effective_unique").on(table.schoolId, table.staffProfileId, table.effectiveFrom) }));

export const payrollAdjustments = mysqlTable("payroll_adjustments", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  staffProfileId: int("staffProfileId").notNull(),
  period: varchar("period", { length: 7 }).notNull(),
  kind: mysqlEnum("kind", ["earning", "deduction"]).notNull(),
  description: varchar("description", { length: 120 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  taxable: int("taxable").notNull().default(1),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  createdByUserId: int("createdByUserId").notNull(),
  approvedByUserId: int("approvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ adjustmentIdx: uniqueIndex("payroll_adjustment_unique").on(table.schoolId, table.staffProfileId, table.period, table.kind, table.description) }));

export const payrollLoans = mysqlTable("payroll_loans", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  staffProfileId: int("staffProfileId").notNull(),
  loanType: mysqlEnum("loanType", ["loan", "advance"]).notNull(),
  description: varchar("description", { length: 160 }).notNull(),
  principalAmount: decimal("principalAmount", { precision: 12, scale: 2 }).notNull(),
  outstandingBalance: decimal("outstandingBalance", { precision: 12, scale: 2 }).notNull(),
  installmentAmount: decimal("installmentAmount", { precision: 12, scale: 2 }).notNull(),
  startPeriod: varchar("startPeriod", { length: 7 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "closed"]).notNull().default("pending"),
  createdByUserId: int("createdByUserId").notNull(),
  approvedByUserId: int("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const payrollLoanRepayments = mysqlTable("payroll_loan_repayments", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  loanId: int("loanId").notNull(),
  runId: int("runId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ runLoanUnique: uniqueIndex("payroll_loan_repayment_school_loan_run_unique").on(table.schoolId, table.loanId, table.runId) }));

export const payrollRuns = mysqlTable("payroll_runs", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  period: varchar("period", { length: 7 }).notNull(),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "recorded", "closed"]).notNull().default("draft"),
  preparedByUserId: int("preparedByUserId").notNull(),
  submittedByUserId: int("submittedByUserId"),
  approvedByUserId: int("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  recordedAt: timestamp("recordedAt"),
  financeExpenditureId: bigint("financeExpenditureId", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
}, table => ({ payrollRunPeriodUnique: uniqueIndex("payroll_run_school_period_unique").on(table.schoolId, table.period) }));

export const payrollItems = mysqlTable("payroll_items", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  runId: int("runId").notNull(),
  staffProfileId: int("staffProfileId").notNull(),
  employeeName: varchar("employeeName", { length: 160 }).notNull(),
  calculationJson: longtext("calculationJson").notNull(),
  gross: decimal("gross", { precision: 12, scale: 2 }).notNull(),
  paye: decimal("paye", { precision: 12, scale: 2 }).notNull(),
  net: decimal("net", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ payrollItemUnique: uniqueIndex("payroll_item_run_staff_unique").on(table.schoolId, table.runId, table.staffProfileId) }));
// Extracted Drizzle table declarations from the validated NEXUS host schema.

export const transportSettings = mysqlTable("transport_settings", {
  schoolId: int("schoolId").primaryKey(),
  enabled: int("enabled").notNull().default(1),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
});

export const transportVehicles = mysqlTable("transport_vehicles", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  registration: varchar("registration", { length: 24 }).notNull(),
  description: varchar("description", { length: 160 }).notNull(),
  capacity: int("capacity").notNull(),
  driverStaffProfileId: int("driverStaffProfileId"),
  assetReference: varchar("assetReference", { length: 80 }),
  insuranceExpiresOn: date("insuranceExpiresOn"),
  inspectionExpiresOn: date("inspectionExpiresOn"),
  odometerKm: decimal("odometerKm", { precision: 11, scale: 1 }).notNull().default("0"),
  status: mysqlEnum("status", ["active", "service", "retired"]).notNull().default("active"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
}, table => ({ registrationUnique: uniqueIndex("transport_vehicle_school_reg_unique").on(table.schoolId, table.registration) }));

export const transportRoutes = mysqlTable("transport_routes", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  vehicleId: int("vehicleId"),
  feeAmount: decimal("feeAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "termly"]).notNull().default("termly"),
  status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
}, table => ({ routeSchoolNameUnique: uniqueIndex("transport_route_school_name_unique").on(table.schoolId, table.name) }));

export const transportAllocations = mysqlTable("transport_allocations", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  learnerId: int("learnerId").notNull(),
  routeId: int("routeId").notNull(),
  stopName: varchar("stopName", { length: 120 }).notNull(),
  authorizedGuardianId: int("authorizedGuardianId"),
  status: mysqlEnum("status", ["active", "paused", "ended"]).notNull().default("active"),
  startsOn: date("startsOn").notNull(),
  endsOn: date("endsOn"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
}, table => ({ learnerSchoolUnique: uniqueIndex("transport_allocation_school_learner_unique").on(table.schoolId, table.learnerId) }));

export const transportCharges = mysqlTable("transport_charges", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  learnerId: int("learnerId").notNull(),
  routeId: int("routeId").notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ chargePeriodUnique: uniqueIndex("transport_charge_school_learner_period_unique").on(table.schoolId, table.learnerId, table.period) }));

export const transportChargePayments = mysqlTable("transport_charge_payments", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  chargeId: int("chargeId").notNull(),
  paymentId: int("paymentId").notNull(),
  reference: varchar("reference", { length: 80 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ paymentLinkUnique: uniqueIndex("transport_charge_payment_unique").on(table.schoolId, table.paymentId), paymentReferenceUnique: uniqueIndex("transport_charge_payment_reference_unique").on(table.schoolId, table.reference) }));

export const transportAttendance = mysqlTable("transport_attendance", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  learnerId: int("learnerId").notNull(),
  routeId: int("routeId").notNull(),
  attendanceDate: date("attendanceDate").notNull(),
  shift: mysqlEnum("shift", ["am", "pm"]).notNull(),
  status: mysqlEnum("status", ["boarded", "absent", "excused"]).notNull(),
  capturedByUserId: int("capturedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ attendanceUnique: uniqueIndex("transport_attendance_school_learner_day_shift_unique").on(table.schoolId, table.learnerId, table.attendanceDate, table.shift) }));

export const transportTrips = mysqlTable("transport_trips", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  routeId: int("routeId"),
  driverStaffProfileId: int("driverStaffProfileId"),
  tripDate: date("tripDate").notNull(),
  shift: mysqlEnum("shift", ["am", "pm", "other"]).notNull(),
  odometerStartKm: decimal("odometerStartKm", { precision: 11, scale: 1 }).notNull(),
  odometerEndKm: decimal("odometerEndKm", { precision: 11, scale: 1 }).notNull(),
  notes: varchar("notes", { length: 500 }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const transportIncidents = mysqlTable("transport_incidents", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  routeId: int("routeId"),
  incidentDate: date("incidentDate").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high"]).notNull().default("medium"),
  category: mysqlEnum("category", ["breakdown", "delay", "safety", "damage", "other"]).notNull(),
  description: varchar("description", { length: 1000 }).notNull(),
  resolution: varchar("resolution", { length: 500 }),
  status: mysqlEnum("status", ["open", "resolved"]).notNull().default("open"),
  reportedByUserId: int("reportedByUserId").notNull(),
  resolvedByUserId: int("resolvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
});

export const transportCosts = mysqlTable("transport_costs", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  costType: mysqlEnum("costType", ["fuel", "maintenance", "repair", "other"]).notNull(),
  costDate: date("costDate").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 36 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  nextDueOn: date("nextDueOn"),
  ledgerExpenditureId: bigint("ledgerExpenditureId", { mode: "number" }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ ledgerRefUnique: uniqueIndex("transport_cost_ledger_ref_unique").on(table.ledgerExpenditureId), requestUnique: uniqueIndex("transport_cost_request_unique").on(table.schoolId, table.idempotencyKey) }));
