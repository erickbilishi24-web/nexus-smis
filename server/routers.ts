import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { MANAGE_PERMISSIONS, canCreateAssessments, canViewWholeClassMarklist } from "./access";
import { AdminError, AUDIT_MODULES, adminCatalog, adminOverview, changeAdminAssignment, changeAdminRole, createAdminUser, createSchool, deleteAdminUser, getAdminUser, getPermissionMatrixView, listAdminUsers, listAuditTrail, listMySchoolMemberships, listSchools, getPublicSchoolIdentity, resetAdminPassword, setAccountState, setAdminRoles, setRolePermission, setUserPermissionOverride, switchMySchool, updateAdminUser, updateSchool, setSchoolStatus } from "./administration";
import { correctLockedAssessmentMark, ensureAssessment, getAssessmentEntries, getAssessmentReportCard, getClassMarklist, listAssessmentScopes, listReportLearners, saveAssessmentMarks, setAssessmentFinalState, submitAssessment } from "./assessment";
import { adminResetIamPassword, changeIamPassword, loginWithIam, logoutIam, requestIamPasswordReset, resetIamPassword, safeAuthProfile } from "./iam";
import { listFeedback, submitFeedback } from "./feedback";
import { allocateBoardingBed, checkoutBoarder, createBoardingUnit, getHealthProfile, listBoardingRecords, listHealthRecords, recordBoardingAttendance, recordBoardingMeal, recordHealthEvent, returnBoarder, saveBoardingProfile, saveHealthProfile } from "./healthBoarding";
import { createLeaveOutPass, listLeaveOutPasses, transitionLeaveOutPass, verifyLeaveOutPass } from "./leaveout";
import { createCommentBankEntry, deleteCommentBankEntry, generateAcademicRemark, listCommentBankAdmin, listReportComments, updateCommentBankEntry } from "./commentBank";
import { clockIn, clockOut, getClockingSetup, listTeacherAttendance, saveSchoolLocation } from "./clocking";
import { listMessageGrades, listMessageRecipients, listNexusMessages, previewMessageRecipients, queueNexusMessage } from "./messages";
import { getCurriculumSetup, saveCurriculumSelections, saveEnabledSchoolLevels } from "./curriculum";
import { listNexusAiTransactions } from "./ai-payments";
import { createNexusAiDocument, listNexusAiDocuments } from "./ai-documents";
import { getPayrollWorkspace, getMyPayrollSlips, savePayrollRules, savePayrollCompensation, createPayrollAdjustment, reviewPayrollAdjustment, createPayrollLoan, reviewPayrollLoan, recordPayrollExport, createPayrollDraft, transitionPayrollRun } from "./payroll";
import { getTransportWorkspace, getTransportLearnerOptions, setTransportEnabled, saveTransportVehicle, setTransportVehicleStatus, saveTransportRoute, assignLearnerTransport, setLearnerTransportStatus, billTransportPeriod, recordTransportPayment, saveTransportAttendance, recordTransportTrip, recordTransportCost, recordTransportIncident, resolveTransportIncident } from "./transport";
import { addCounsellingNote, completeLearner, createBehaviourRecord, createCounsellingCase, createFollowUp, getArchiveFinance, listAlumniRecords, listArchiveLearners, listCounsellingCases, listApprovedBehaviour } from "./archives";
import { approveRollover, excludeRolloverItem, listAcademicStructure, listRollover, previewRollover, reverseRollover, saveAcademicTerm, saveAcademicYear } from "./academic";
import { addLibraryBook, batchCheckoutLibraryBooks, checkoutLibraryBook, libraryLookups, libraryOverview, listLibraryBooks, listLibraryBooksPage, listLibraryLoans, listLibraryLoansPage, renewLibraryLoan, returnLibraryBook } from "./library";
import {
  archiveLearner,
  canViewMasterTimetable,
  createCommunication,
  generateTimetable,
  saveEditedTimetable,
  generateAutomaticTimetable,
  getAttendanceRegister,
  getAttendanceRegisterApproval,
  getAttendanceSummary,
  getLastPeopleImport,
  getPersonalTimetable,
  canManageMasterTimetable,
  getDashboardSnapshot,
  getFinanceOverview,
  getIntegratedReportCard,
  getReportCard,
  getSettings,
  getStoreOverview,
  listAlumni,
  listAllocations,
  listAcademicCatalog,
  canManageSchoolLevels,
  saveTeacherAllocation,
  assignClassTeacher,
  changeTeacherAllocationStatus,
  deleteTeacherAllocation,
  listAssessments,
  listAttendance,
  listAuditLogs,
  listCommunications,
  listLearners, listLearnersPage,
  createGradeClass,
  updateGradeClass,
  deleteGradeClass,
  createLearningArea,
  createLearner,
  updateLearner,
  setLearnerStatus,
  previewPeopleImport,
  importPeopleRows,
  undoLastPeopleImport,
  listMarks,
  listStaff, listStaffPage,
  createStaff,
  updateStaff,
  setStaffStatus,
  restoreStaffProfile,
  deleteStaffProfile,
  updateStaffRole,
  listTimetable,
  listTimetablePlans,
  createTimetablePlan,
  archiveTimetablePlan,
  listTimetableVersions, restoreTimetableVersion,
  listTimetableAudit, getTimetableValidationReport,
  listTeacherCodes,
  listTimetableRequirements,
  recordPayment,
  recordStoreMovement,
  saveAttendance,
  saveAttendanceBatch,
  setAttendanceRegisterStatus,
  saveMark,
  saveReportCardComments,
  saveSettings,
  setReportCardStatus,
  updateTeacherCode,
  setTimetableRequirement,
  effectivePermissions,
  userCan,
  writeAudit,
} from "./smis";
import {
  aiFacts,
  createNotification,
  financialSummary,
  getPermissionMatrix,
  listExpenditures,
  listExpendituresPage,
  listGuardians,
  listNotifications,
  recordExpenditure,
  saveGuardian,
  setUserPermission,
} from "./smis-extension";
import { canManageResourceHub, createResource, deleteResource, getAdminDashboard, getPublicCategorySummary, getResourcesForRole, reorderResource, setResourceActive, setResourceManager, setResourceVisibility, updateResource } from "./resourceHub";
const currentUserId = (user: { id: number }) => user.id;
const permissionProcedure = (permission: string) => protectedProcedure.use(async ({ ctx, next }) => {
  const allowed = await userCan(ctx.user.id, ctx.user.role, permission);
  if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: `Missing permission: ${permission}` });
  return next();
});
const superProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!(await userCan(ctx.user.id, ctx.user.role, MANAGE_PERMISSIONS))) {
    await writeAudit(ctx.user.id, "auth.access_denied", "permission", MANAGE_PERMISSIONS, { required: MANAGE_PERMISSIONS });
    throw new TRPCError({ code: "FORBIDDEN", message: "Only a Super Administrator can do this." });
  }
  return next();
});
const adminCall = async <T>(fn: () => Promise<T>) => {
  try { return await fn(); } catch (error) {
    if (!(error instanceof AdminError)) throw error;
    const code = /TAKEN|CONFLICT/.test(error.message) ? "CONFLICT" : /NOT_FOUND/.test(error.message) ? "NOT_FOUND" : /ONLY_SUPER|PROTECTED|^CANNOT_/.test(error.message) ? "FORBIDDEN" : "BAD_REQUEST";
    throw new TRPCError({ code, message: error.message });
  }
};
const roleEnum = z.enum(["super_admin", "admin", "teacher", "senior_teacher", "class_teacher", "deputy_head", "head_teacher", "exam_council", "finance", "other"]);
const assignableRoleEnum = z.enum(["super_admin", "admin", "teacher", "senior_teacher", "class_teacher", "deputy_head", "head_teacher", "exam_council", "finance", "other"]);
const subjectAllocations = z.array(z.object({ gradeId: z.number().int().positive(), subjectId: z.number().int().positive() })).max(40);
const resourceInput = z.object({ categoryId: z.number().int().positive(), title: z.string().trim().min(2).max(160), url: z.string().trim().min(1).max(2048), description: z.string().trim().min(2).max(2000), icon: z.string().trim().max(64).default("globe-2"), grade: z.string().trim().max(80).optional(), subject: z.string().trim().max(120).optional(), learningArea: z.string().trim().max(160).optional(), mediaType: z.string().trim().max(80).optional(), allowHttp: z.boolean().default(false), isActive: z.boolean().default(false), displayOrder: z.number().int().min(0).max(100000).default(0), visibilityRoles: z.array(z.string().trim().min(1).max(64)).max(12).default([]) });
const resourceManagerProcedure = protectedProcedure.use(async ({ ctx, next }) => { if (!canManageResourceHub(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "RESOURCE_HUB_MANAGEMENT_FORBIDDEN" }); return next(); });
const resourceMutation = async <T>(fn: () => Promise<T>) => { try { return await fn(); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "RESOURCE_HUB_SAVE_FAILED" }); } };
const assessmentCreationProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!await canCreateAssessments(ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "ASSESSMENT_CREATION_ADMIN_ONLY" });
  return next();
});
const wholeClassMarklistProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!await canViewWholeClassMarklist(ctx.user.id, ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "WHOLE_CLASS_MARKLIST_FORBIDDEN" });
  return next();
});

const masterTimetableProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!await canManageMasterTimetable(ctx.user.id, ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "MASTER_TIMETABLE_ADMIN_ONLY" });
  return next();
});
const schoolLevelProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!await canManageSchoolLevels(ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Only a Super Administrator can configure school levels." });
  return next();
});
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => safeAuthProfile(ctx.user)),
    schoolIdentity: publicProcedure.input(z.object({ schoolCode: z.string().min(3).max(40) })).query(({ input }) => getPublicSchoolIdentity(input.schoolCode)),
    login: publicProcedure.input(z.object({ identifier: z.string().min(1).max(320), password: z.string().min(1).max(200), schoolCode: z.string().min(3).max(40).optional() })).mutation(async ({ input, ctx }) => {
      try {
        return await loginWithIam(input, ctx.req, ctx.res);
      } catch (error) {
        const code = error instanceof Error ? error.message : "INVALID_CREDENTIALS";
        throw new TRPCError({ code: code === "ACCOUNT_LOCKED" || code === "ACCOUNT_DISABLED" || code === "SCHOOL_NOT_AVAILABLE" || code === "SCHOOL_MEMBERSHIP_REQUIRED" ? "FORBIDDEN" : "UNAUTHORIZED", message: code });
      }
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      await logoutIam(ctx.req, ctx.res);
      return { success: true } as const;
    }),
    changePassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(200) })).mutation(async ({ input, ctx }) => {
      await changeIamPassword(ctx.user.id, input.currentPassword, input.newPassword, ctx.req);
      return { success: true } as const;
    }),
    forgotPassword: publicProcedure.input(z.object({ identifier: z.string().min(1).max(320) })).mutation(({ input, ctx }) => requestIamPasswordReset(input.identifier, ctx.req)),
    resetPassword: publicProcedure.input(z.object({ token: z.string().min(20).max(200), newPassword: z.string().min(10).max(200) })).mutation(({ input, ctx }) => resetIamPassword(input.token, input.newPassword, ctx.req).then(() => ({ success: true }) as const)),
    adminResetPassword: superProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ input, ctx }) => adminResetIamPassword(input.userId, ctx.user.id, ctx.req)),
  }),
  leaveOutVerification: publicProcedure
    .input(z.object({ passNumber: z.string().trim().min(5).max(50) }))
    .query(({ input }) => verifyLeaveOutPass(input.passNumber)),
  resourceHub: router({
    categories: publicProcedure.query(() => getPublicCategorySummary()),
    list: protectedProcedure.query(({ ctx }) => getResourcesForRole(ctx.user.role, ctx.user.schoolId ?? 0)),
    canManage: protectedProcedure.query(({ ctx }) => canManageResourceHub(ctx.user)),
    adminDashboard: resourceManagerProcedure.query(({ ctx }) => getAdminDashboard(ctx.user.schoolId ?? 0)),
    create: resourceManagerProcedure.input(resourceInput).mutation(({ input, ctx }) => resourceMutation(() => createResource(input, ctx.user))),
    update: resourceManagerProcedure.input(resourceInput.extend({ resourceId: z.number().int().positive() })).mutation(({ input, ctx }) => { const { resourceId, ...payload } = input; return resourceMutation(() => updateResource(resourceId, payload, ctx.user)); }),
    setActive: resourceManagerProcedure.input(z.object({ resourceId: z.number().int().positive(), isActive: z.boolean() })).mutation(({ input, ctx }) => resourceMutation(() => setResourceActive(input.resourceId, input.isActive, ctx.user))),
    delete: resourceManagerProcedure.input(z.object({ resourceId: z.number().int().positive() })).mutation(({ input, ctx }) => resourceMutation(() => deleteResource(input.resourceId, ctx.user))),
    reorder: resourceManagerProcedure.input(z.object({ resourceId: z.number().int().positive(), displayOrder: z.number().int().min(0).max(100000) })).mutation(({ input, ctx }) => resourceMutation(() => reorderResource(input.resourceId, input.displayOrder, ctx.user))),
    setVisibility: resourceManagerProcedure.input(z.object({ resourceId: z.number().int().positive(), visibilityRoles: z.array(z.string().trim().min(1).max(64)).max(12) })).mutation(({ input, ctx }) => resourceMutation(() => setResourceVisibility(input.resourceId, input.visibilityRoles, ctx.user))),
    setManager: resourceManagerProcedure.input(z.object({ userId: z.number().int().positive(), resourceHubManage: z.boolean() })).mutation(({ input, ctx }) => resourceMutation(() => setResourceManager(input.userId, input.resourceHubManage, ctx.user))),
  }),
  feedback: router({
    submit: protectedProcedure.input(z.object({ rating: z.number().int().min(1).max(5), message: z.string().trim().min(3).max(4000) })).mutation(({ input, ctx }) => submitFeedback(input, currentUserId(ctx.user))),
    list: protectedProcedure.query(({ ctx }) => listFeedback(ctx.user)),
  }),
  smis: router({
    health: publicProcedure.query(() => ({ ok: true, service: "kenyan-smis", persistence: "mysql-drizzle", modules: ["learners", "attendance", "assessments", "reports", "finance", "store", "timetable", "communication", "alumni", "users", "settings", "audit"] })),
    snapshot: permissionProcedure("dashboard.view").query(({ ctx }) => getDashboardSnapshot(ctx.user.id, ctx.user.role)),
    learners: router({
      list: permissionProcedure("learners.view").input(z.object({ search: z.string().optional() }).optional()).query(({ input, ctx }) => listLearners(input?.search, currentUserId(ctx.user))),
      page: permissionProcedure("learners.view").input(z.object({ search: z.string().optional(), page: z.number().int().min(0).optional(), pageSize: z.number().int().min(10).max(100).optional() })).query(({ input, ctx }) => listLearnersPage(input, currentUserId(ctx.user))),
      create: permissionProcedure("learners.add").input(z.object({ fullName: z.string().min(1).max(160), admissionNumber: z.string().min(1).max(40), guardianName: z.string().max(160).nullable().optional(), guardianIdNumber: z.string().max(40).nullable().optional(), guardianPhone: z.string().max(40).nullable().optional(), gradeId: z.number().int().positive(), status: z.enum(["active", "inactive"]) })).mutation(({ input, ctx }) => createLearner(input, currentUserId(ctx.user))),
      update: permissionProcedure("learners.edit").input(z.object({ learnerId: z.number().int().positive(), fullName: z.string().min(1).max(160), admissionNumber: z.string().min(1).max(40), guardianName: z.string().max(160).nullable().optional(), guardianIdNumber: z.string().max(40).nullable().optional(), guardianPhone: z.string().max(40).nullable().optional(), gradeId: z.number().int().positive(), status: z.enum(["active", "inactive"]) })).mutation(({ input, ctx }) => updateLearner(input, currentUserId(ctx.user))),
      setStatus: permissionProcedure("learners.deactivate").input(z.object({ learnerId: z.number().int().positive(), status: z.enum(["active", "inactive"]) })).mutation(({ input, ctx }) => setLearnerStatus(input, currentUserId(ctx.user))),
      previewImport: permissionProcedure("learners.add").input(z.object({ rows: z.array(z.record(z.string(), z.any())).max(500), rowOffset: z.number().int().min(0).optional(), autoCreateMissingClasses: z.boolean().optional() })).mutation(({ input }) => previewPeopleImport({ kind: "learners", rows: input.rows, rowOffset: input.rowOffset, autoCreateMissingClasses: input.autoCreateMissingClasses })),
      import: permissionProcedure("learners.add").input(z.object({ rows: z.array(z.record(z.string(), z.any())).max(500), autoCreateMissingClasses: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
        if (input.autoCreateMissingClasses && !(await userCan(ctx.user.id, ctx.user.role, "settings.edit"))) throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can create missing classes during import." });
        return importPeopleRows({ kind: "learners", rows: input.rows, autoCreateMissingClasses: input.autoCreateMissingClasses }, currentUserId(ctx.user));
      }),
    }),
    attendance: router({
      list: permissionProcedure("attendance.view").input(z.object({ date: z.string().optional(), session: z.enum(["morning", "afternoon"]).optional() }).optional()).query(({ input, ctx }) => listAttendance(input?.date, currentUserId(ctx.user), input?.session ?? "morning")),
      register: permissionProcedure("attendance.view").input(z.object({ date: z.string().min(10).max(10), session: z.enum(["morning", "afternoon"]).optional() })).query(({ input, ctx }) => getAttendanceRegister(input.date, currentUserId(ctx.user), input.session ?? "morning")),
      save: permissionProcedure("attendance.edit").input(z.object({ learnerId: z.number().int().positive(), status: z.enum(["present", "absent", "late", "excused"]), attendanceDate: z.string(), session: z.enum(["morning", "afternoon"]).optional(), note: z.string().max(255).nullable().optional() })).mutation(({ input, ctx }) => saveAttendance(input, currentUserId(ctx.user))),
      saveBatch: permissionProcedure("attendance.edit").input(z.object({ attendanceDate: z.string().date(), session: z.enum(["morning", "afternoon"]).optional(), entries: z.array(z.object({ learnerId: z.number().int().positive(), status: z.enum(["present", "absent", "late", "excused"]) })).min(1).max(500) })).mutation(({ input, ctx }) => saveAttendanceBatch(input, currentUserId(ctx.user))),
      summary: permissionProcedure("attendance.view").input(z.object({ period: z.enum(["weekly", "monthly", "termly", "yearly"]), gradeLevel: z.number().int().min(7).max(9).optional() })).query(({ input, ctx }) => getAttendanceSummary(input, currentUserId(ctx.user))),
      approval: permissionProcedure("attendance.view").input(z.object({ date: z.string().date(), gradeId: z.number().int().positive() })).query(({ input, ctx }) => getAttendanceRegisterApproval(input.date, input.gradeId, currentUserId(ctx.user))),
      setApproval: permissionProcedure("attendance.edit").input(z.object({ attendanceDate: z.string().date(), gradeId: z.number().int().positive(), action: z.enum(["submit", "approve", "reopen"]) })).mutation(({ input, ctx }) => setAttendanceRegisterStatus(input, currentUserId(ctx.user))),
    }),
    assessments: router({
      creationAccess: protectedProcedure.query(({ ctx }) => canCreateAssessments(ctx.user.id)),
      wholeClassAccess: protectedProcedure.query(({ ctx }) => canViewWholeClassMarklist(ctx.user.id, ctx.user.role)),
      reviewAccess: protectedProcedure.query(({ ctx }) => userCan(ctx.user.id, ctx.user.role, "settings.edit")),
      commentAccess: protectedProcedure.query(({ ctx }) => userCan(ctx.user.id, ctx.user.role, "assessments.edit")),
      list: permissionProcedure("assessments.view").query(({ ctx }) => listAssessments(currentUserId(ctx.user))),
      marks: permissionProcedure("assessments.view").input(z.object({ assessmentId: z.number().int().positive().optional() }).optional()).query(({ input, ctx }) => listMarks(input?.assessmentId, currentUserId(ctx.user))),
      saveMark: permissionProcedure("assessments.edit").input(z.object({ assessmentId: z.number().int().positive(), learnerId: z.number().int().positive(), subjectId: z.number().int().positive(), midTerm: z.number().min(0).max(100), endTerm: z.number().min(0).max(100), teacherRemark: z.string().max(255).nullable().optional() })).mutation(({ input, ctx }) => saveMark(input, currentUserId(ctx.user))),
      scopes: permissionProcedure("assessments.view").query(({ ctx }) => listAssessmentScopes(currentUserId(ctx.user))),
      open: assessmentCreationProcedure.input(z.object({ academicYear: z.number().int().min(2000).max(2100), term: z.string().min(1).max(40), assessmentType: z.enum(["mid_term", "end_term"]), gradeId: z.number().int().positive(), subjectId: z.number().int().positive(), customTitle: z.string().trim().min(2).max(120).optional() })).mutation(({ input, ctx }) => ensureAssessment(input, currentUserId(ctx.user))),
      entries: permissionProcedure("assessments.view").input(z.object({ assessmentId: z.number().int().positive() })).query(({ input, ctx }) => getAssessmentEntries(input.assessmentId, currentUserId(ctx.user))),
      saveRows: permissionProcedure("assessments.edit").input(z.object({ assessmentId: z.number().int().positive(), rows: z.array(z.object({ learnerId: z.number().int().positive(), score: z.number().min(0).max(100).nullable(), teacherRemark: z.string().max(255).nullable().optional() })).max(500) })).mutation(({ input, ctx }) => saveAssessmentMarks(input, currentUserId(ctx.user))),
      submit: permissionProcedure("assessments.edit").input(z.object({ assessmentId: z.number().int().positive() })).mutation(({ input, ctx }) => submitAssessment(input.assessmentId, currentUserId(ctx.user))),
      setFinalState: permissionProcedure("settings.edit").input(z.object({ assessmentId: z.number().int().positive(), status: z.enum(["approved", "locked"]) })).mutation(({ input, ctx }) => setAssessmentFinalState(input, currentUserId(ctx.user))),
      correctLockedMark: permissionProcedure("settings.edit").input(z.object({ assessmentId: z.number().int().positive(), learnerId: z.number().int().positive(), score: z.number().min(0).max(100), reason: z.string().min(10).max(500) })).mutation(({ input, ctx }) => correctLockedAssessmentMark(input, currentUserId(ctx.user))),
      classMarklist: wholeClassMarklistProcedure.input(z.object({ academicYear: z.number().int().min(2000).max(2100), term: z.string().min(1).max(40), assessmentType: z.enum(["mid_term", "end_term", "average"]), gradeId: z.number().int().positive() })).query(({ input, ctx }) => getClassMarklist(input, currentUserId(ctx.user))),
    }),
    finance: router({
      overview: permissionProcedure("finance.view").input(z.object({ learnerId: z.number().int().positive().optional() }).optional()).query(({ input, ctx }) => getFinanceOverview(input?.learnerId, currentUserId(ctx.user))),
      recordPayment: permissionProcedure("finance.edit").input(z.object({ learnerId: z.number().int().positive(), amount: z.number().positive(), paymentMethod: z.enum(["mpesa", "bank", "cash"]), reference: z.string().min(3).max(80) })).mutation(({ input, ctx }) => recordPayment(input, currentUserId(ctx.user))),
      summary: permissionProcedure("finance.view").query(({ ctx }) => financialSummary(currentUserId(ctx.user))),
      expenditures: permissionProcedure("finance.view").query(({ ctx }) => listExpenditures(currentUserId(ctx.user))),
      expendituresPage: permissionProcedure("finance.view").input(z.object({ page: z.number().int().min(0).optional(), pageSize: z.number().int().min(10).max(100).optional() })).query(({ input, ctx }) => listExpendituresPage(input, currentUserId(ctx.user))),
      recordExpenditure: permissionProcedure("finance.edit").input(z.object({ expenditureDate: z.string(), amount: z.number().positive(), category: z.string().min(1).max(120), description: z.string().min(1).max(255), responsiblePerson: z.string().min(1).max(160) })).mutation(({ input, ctx }) => recordExpenditure(input, currentUserId(ctx.user))),
    }),
    people: router({
      catalog: permissionProcedure("assessments.view").query(() => listAcademicCatalog()),
      guardians: permissionProcedure("learners.view").input(z.object({ search: z.string().optional() }).optional()).query(({ input }) => listGuardians(input?.search)),
      addGuardian: permissionProcedure("learners.add").input(z.object({ fullName: z.string().min(1).max(160), phone: z.string().max(40).nullable().optional(), email: z.string().email().nullable().optional(), communicationPreference: z.enum(["sms", "email", "phone"]), learnerId: z.number().int().positive().optional(), relationship: z.string().max(80).optional() })).mutation(({ input, ctx }) => saveGuardian(input, currentUserId(ctx.user))),
      leaveOutPasses: permissionProcedure("learners.view").input(z.object({ status: z.enum(["draft", "pending_approval", "approved", "rejected", "departed", "returned", "cancelled", "expired"]).optional() }).optional()).query(({ input, ctx }) => listLeaveOutPasses(currentUserId(ctx.user), input?.status)),
      createLeaveOutPass: permissionProcedure("learners.edit").input(z.object({ learnerId: z.number().int().positive(), reason: z.string().trim().min(3).max(500), intendedDepartureAt: z.string().datetime(), expectedReturnAt: z.string().datetime().nullable().optional(), destination: z.string().max(255).nullable().optional(), collectorName: z.string().max(160).nullable().optional(), collectorRelationship: z.string().max(80).nullable().optional(), collectorVerification: z.string().max(120).nullable().optional(), guardianVerified: z.boolean().default(false), remarks: z.string().max(2000).nullable().optional() })).mutation(({ input, ctx }) => createLeaveOutPass(input, currentUserId(ctx.user))),
      transitionLeaveOutPass: permissionProcedure("learners.edit").input(z.object({ passId: z.number().int().positive(), action: z.enum(["approve", "reject", "cancel", "depart", "return"]), remarks: z.string().max(2000).nullable().optional() })).mutation(({ input, ctx }) => transitionLeaveOutPass(input, currentUserId(ctx.user))),
    }),
    archives: router({
      list: permissionProcedure("archives.view").input(z.object({ search: z.string().max(160).optional(), year: z.number().int().optional(), status: z.string().max(30).optional() }).optional()).query(({ input }) => listArchiveLearners(input ?? {})),
      alumni: permissionProcedure("archives.view").input(z.object({ year: z.number().int().optional(), search: z.string().max(160).optional() }).optional()).query(({ input }) => listAlumniRecords(input ?? {})),
      finance: permissionProcedure("finance.view").input(z.object({ learnerId: z.number().int().positive() })).query(({ input }) => getArchiveFinance(input.learnerId)),
      exit: permissionProcedure("archives.edit").input(z.object({ learnerId: z.number().int().positive(), status: z.enum(["completed", "graduated", "transferred", "withdrawn", "other"]), effectiveDate: z.string().date(), reason: z.string().trim().min(3).max(255), finalGradeId: z.number().int().positive().optional(), notes: z.string().max(4000).optional(), destination: z.string().max(160).optional() })).mutation(({ input, ctx }) => completeLearner(input, currentUserId(ctx.user))),
      behaviour: permissionProcedure("archives.view").input(z.object({ learnerId: z.number().int().positive() })).query(({ input }) => listApprovedBehaviour(input.learnerId)),
      addBehaviour: permissionProcedure("archives.edit").input(z.object({ learnerId: z.number().int().positive(), category: z.string().min(2).max(80), summary: z.string().min(2).max(500), outcome: z.string().max(500).optional(), isApprovedForReport: z.boolean().optional() })).mutation(({ input, ctx }) => createBehaviourRecord(input, currentUserId(ctx.user))),
    }),
    counselling: router({
      list: permissionProcedure("counselling.view").input(z.object({ includeArchived: z.boolean().optional() }).optional()).query(({ input, ctx }) => listCounsellingCases(input?.includeArchived ?? false, currentUserId(ctx.user))),
      create: permissionProcedure("counselling.submit").input(z.object({ learnerId: z.number().int().positive(), concern: z.string().trim().min(3).max(255), referralSource: z.string().max(80).optional(), assignedCounsellorUserId: z.number().int().positive().optional(), reviewDate: z.string().date().optional() })).mutation(({ input, ctx }) => createCounsellingCase(input, currentUserId(ctx.user))),
      addNote: permissionProcedure("counselling.edit").input(z.object({ caseId: z.number().int().positive(), note: z.string().trim().min(3).max(10000) })).mutation(({ input, ctx }) => addCounsellingNote(input, currentUserId(ctx.user))),
      followUp: permissionProcedure("counselling.edit").input(z.object({ caseId: z.number().int().positive(), scheduledFor: z.string().date(), action: z.string().trim().min(3).max(255) })).mutation(({ input, ctx }) => createFollowUp(input, currentUserId(ctx.user))),
    }),
    notifications: router({
      list: permissionProcedure("communication.edit").query(() => listNotifications()),
      create: permissionProcedure("communication.edit").input(z.object({ audience: z.enum(["parents", "staff", "learners", "all"]), title: z.string().min(1).max(160), body: z.string().min(1), status: z.enum(["draft", "published"]) })).mutation(({ input, ctx }) => createNotification(input, currentUserId(ctx.user))),
    }),
    clocking: router({
      status: protectedProcedure.query(({ ctx }) => getClockingSetup(ctx.user.id)),
      clockIn: permissionProcedure("dashboard.view").input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })).mutation(({ input, ctx }) => clockIn(input, ctx.user.id)),
      clockOut: permissionProcedure("dashboard.view").mutation(({ ctx }) => clockOut(ctx.user.id)),
      teacherAttendance: permissionProcedure("administration.view").input(z.object({ period: z.enum(["daily", "weekly", "monthly", "yearly"]), anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).query(({ input, ctx }) => listTeacherAttendance(input, ctx.user.id)),
      saveLocation: permissionProcedure("settings.edit").input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), radiusMeters: z.number().int().min(25).max(1000) })).mutation(({ input, ctx }) => saveSchoolLocation(input, ctx.user.id, ctx.user.role)),
    }),
    payroll: router({
      workspace: permissionProcedure("payroll.view").query(({ ctx }) => getPayrollWorkspace(ctx.user.id, ctx.user.role)),
      mySlips: protectedProcedure.query(({ ctx }) => getMyPayrollSlips(ctx.user.id)),
      saveRules: permissionProcedure("payroll.rules").input(z.object({ effectiveFrom: z.string().date(), sourceNotes: z.string().max(600).nullable().optional(), rules: z.any() })).mutation(({ input, ctx }) => savePayrollRules(input as any, ctx.user.id, ctx.user.role)),
      saveCompensation: permissionProcedure("payroll.edit").input(z.object({ staffProfileId: z.number().int().positive(), effectiveFrom: z.string().date(), basicSalary: z.number().min(0), earnings: z.array(z.any()).max(30), deductions: z.array(z.any()).max(30), resident: z.boolean(), additionalPension: z.number().min(0), postRetirementMedical: z.number().min(0), mortgageInterest: z.number().min(0) })).mutation(({ input, ctx }) => savePayrollCompensation(input as any, ctx.user.id, ctx.user.role)),
      createAdjustment: permissionProcedure("payroll.edit").input(z.object({ staffProfileId: z.number().int().positive(), period: z.string(), kind: z.enum(["earning", "deduction"]), description: z.string().min(1), amount: z.number().positive(), taxable: z.boolean() })).mutation(({ input, ctx }) => createPayrollAdjustment(input, ctx.user.id, ctx.user.role)),
      reviewAdjustment: permissionProcedure("payroll.approve").input(z.object({ adjustmentId: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(({ input, ctx }) => reviewPayrollAdjustment(input, ctx.user.id, ctx.user.role)),
      createLoan: permissionProcedure("payroll.edit").input(z.object({ staffProfileId: z.number().int().positive(), loanType: z.enum(["loan", "advance"]), description: z.string().min(1), principalAmount: z.number().positive(), installmentAmount: z.number().positive(), startPeriod: z.string() })).mutation(({ input, ctx }) => createPayrollLoan(input, ctx.user.id, ctx.user.role)),
      reviewLoan: permissionProcedure("payroll.approve").input(z.object({ loanId: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(({ input, ctx }) => reviewPayrollLoan(input, ctx.user.id, ctx.user.role)),
      recordExport: permissionProcedure("payroll.view").input(z.object({ kind: z.enum(["payslip", "monthly_summary", "deduction_schedule", "annual_summary"]), period: z.string().optional(), year: z.number().optional() })).mutation(({ input, ctx }) => recordPayrollExport(input, ctx.user.id, ctx.user.role)),
      createDraft: permissionProcedure("payroll.edit").input(z.object({ period: z.string() })).mutation(({ input, ctx }) => createPayrollDraft(input, ctx.user.id, ctx.user.role)),
      transitionRun: protectedProcedure.input(z.object({ runId: z.number().int().positive(), action: z.enum(["submit", "approve", "record_external_payment", "close"]), note: z.string().max(300).optional() })).mutation(({ input, ctx }) => transitionPayrollRun(input, ctx.user.id, ctx.user.role)),
    }),
    transport: router({
      workspace: permissionProcedure("transport.view").query(({ ctx }) => getTransportWorkspace(ctx.user.id, ctx.user.role)),
      learnerOptions: permissionProcedure("transport.manage").query(({ ctx }) => getTransportLearnerOptions(ctx.user.id, ctx.user.role)),
      setEnabled: permissionProcedure("transport.manage").input(z.object({ enabled: z.boolean() })).mutation(({ input, ctx }) => setTransportEnabled(input, ctx.user.id, ctx.user.role)),
      saveVehicle: permissionProcedure("transport.manage").input(z.object({ vehicleId: z.number().optional(), registration: z.string(), description: z.string(), capacity: z.number().int(), driverStaffProfileId: z.number().nullable().optional(), assetReference: z.string().nullable().optional(), insuranceExpiresOn: z.string().nullable().optional(), inspectionExpiresOn: z.string().nullable().optional(), odometerKm: z.number().optional() })).mutation(({ input, ctx }) => saveTransportVehicle(input as any, ctx.user.id, ctx.user.role)),
      setVehicleStatus: permissionProcedure("transport.manage").input(z.object({ vehicleId: z.number().int().positive(), status: z.enum(["active", "service", "retired"]) })).mutation(({ input, ctx }) => setTransportVehicleStatus(input, ctx.user.id, ctx.user.role)),
      saveRoute: permissionProcedure("transport.manage").input(z.object({ routeId: z.number().optional(), name: z.string(), vehicleId: z.number().nullable().optional(), feeAmount: z.number().min(0), billingCycle: z.enum(["monthly", "termly"]), status: z.enum(["active", "inactive"]) })).mutation(({ input, ctx }) => saveTransportRoute(input as any, ctx.user.id, ctx.user.role)),
      assignLearner: permissionProcedure("transport.manage").input(z.object({ learnerId: z.number().int().positive(), routeId: z.number().int().positive(), stopName: z.string(), authorizedGuardianId: z.number().nullable().optional(), startsOn: z.string() })).mutation(({ input, ctx }) => assignLearnerTransport(input, ctx.user.id, ctx.user.role)),
      setAllocationStatus: permissionProcedure("transport.manage").input(z.object({ allocationId: z.number().int().positive(), status: z.enum(["active", "paused", "ended"]) })).mutation(({ input, ctx }) => setLearnerTransportStatus(input, ctx.user.id, ctx.user.role)),
      billPeriod: permissionProcedure("transport.manage").input(z.object({ period: z.string() })).mutation(({ input, ctx }) => billTransportPeriod(input, ctx.user.id, ctx.user.role)),
      recordPayment: permissionProcedure("finance.edit").input(z.object({ chargeId: z.number().int().positive(), amount: z.number().positive(), paymentMethod: z.enum(["mpesa", "bank", "cash"]), reference: z.string().min(3) })).mutation(({ input, ctx }) => recordTransportPayment(input, ctx.user.id, ctx.user.role)),
      saveAttendance: permissionProcedure("transport.edit").input(z.object({ routeId: z.number().int().positive(), attendanceDate: z.string(), shift: z.enum(["am", "pm"]), entries: z.array(z.object({ learnerId: z.number().int().positive(), status: z.enum(["boarded", "absent", "excused"]) })) })).mutation(({ input, ctx }) => saveTransportAttendance(input, ctx.user.id, ctx.user.role)),
      recordTrip: permissionProcedure("transport.edit").input(z.object({ vehicleId: z.number().int().positive(), routeId: z.number().nullable().optional(), driverStaffProfileId: z.number().nullable().optional(), tripDate: z.string(), shift: z.enum(["am", "pm", "other"]), odometerStartKm: z.number(), odometerEndKm: z.number(), notes: z.string().nullable().optional() })).mutation(({ input, ctx }) => recordTransportTrip(input, ctx.user.id, ctx.user.role)),
      recordCost: permissionProcedure("finance.edit").input(z.object({ vehicleId: z.number().int().positive(), costType: z.enum(["fuel", "maintenance", "repair", "other"]), costDate: z.string(), amount: z.number().positive(), description: z.string(), nextDueOn: z.string().nullable().optional(), idempotencyKey: z.string().uuid() })).mutation(({ input, ctx }) => recordTransportCost(input, ctx.user.id, ctx.user.role)),
      recordIncident: permissionProcedure("transport.edit").input(z.object({ vehicleId: z.number().int().positive(), routeId: z.number().nullable().optional(), incidentDate: z.string(), severity: z.enum(["low", "medium", "high"]), category: z.enum(["breakdown", "delay", "safety", "damage", "other"]), description: z.string() })).mutation(({ input, ctx }) => recordTransportIncident(input, ctx.user.id, ctx.user.role)),
      resolveIncident: permissionProcedure("transport.manage").input(z.object({ incidentId: z.number().int().positive(), resolution: z.string() })).mutation(({ input, ctx }) => resolveTransportIncident(input, ctx.user.id, ctx.user.role)),
    }),
    library: router({
      overview: permissionProcedure("library.view").query(({ ctx }) => libraryOverview(ctx.user.id)),
      lookups: permissionProcedure("library.view").query(({ ctx }) => libraryLookups(ctx.user.id)),
      books: permissionProcedure("library.view").input(z.object({ search: z.string().optional() }).optional()).query(({ input, ctx }) => listLibraryBooks(input?.search, ctx.user.id)),
      booksPage: permissionProcedure("library.view").input(z.object({ search: z.string().optional(), page: z.number().int().min(0).optional(), pageSize: z.number().int().min(10).max(100).optional() })).query(({ input, ctx }) => listLibraryBooksPage(input, ctx.user.id)),
      loans: permissionProcedure("library.view").input(z.object({ overdueOnly: z.boolean().optional() }).optional()).query(({ input, ctx }) => listLibraryLoans(input?.overdueOnly ?? false, ctx.user.id)),
      loansPage: permissionProcedure("library.view").input(z.object({ overdueOnly: z.boolean().optional(), page: z.number().int().min(0).optional(), pageSize: z.number().int().min(10).max(100).optional() })).query(({ input, ctx }) => listLibraryLoansPage(input, ctx.user.id)),
      addBook: permissionProcedure("library.create").input(z.object({ title: z.string().min(1).max(200), author: z.string().max(160).nullable().optional(), isbn: z.string().max(40).nullable().optional(), publisher: z.string().max(160).nullable().optional(), pubYear: z.number().int().min(1800).max(2200).nullable().optional(), subject: z.string().max(120).nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), copies: z.number().int().min(1).max(100), location: z.string().max(120).nullable().optional() })).mutation(({ input, ctx }) => addLibraryBook(input, ctx.user.id)),
      checkout: permissionProcedure("library.edit").input(z.object({ copyId: z.number().int().positive(), learnerId: z.number().int().positive().nullable().optional(), staffUserId: z.number().int().positive().nullable().optional(), dueDays: z.number().int().min(1).max(90) })).mutation(({ input, ctx }) => checkoutLibraryBook(input, ctx.user.id)),
      batchCheckout: permissionProcedure("library.edit").input(z.object({ copyIds: z.array(z.number().int().positive()).min(1).max(100), learnerIds: z.array(z.number().int().positive()).min(1).max(100), dueDays: z.number().int().min(1).max(90) })).mutation(({ input, ctx }) => batchCheckoutLibraryBooks(input, ctx.user.id)),
      return: permissionProcedure("library.edit").input(z.object({ loanId: z.number().int().positive() })).mutation(({ input, ctx }) => returnLibraryBook(input.loanId, ctx.user.id)),
      renew: permissionProcedure("library.edit").input(z.object({ loanId: z.number().int().positive() })).mutation(({ input, ctx }) => renewLibraryLoan(input.loanId, ctx.user.id)),
    }),
    healthRecords: router({
      list: permissionProcedure("health.view").query(({ ctx }) => listHealthRecords(ctx.user.id)),
      profile: permissionProcedure("health.view").input(z.object({ learnerId: z.number().int().positive() })).query(({ input, ctx }) => getHealthProfile(input.learnerId, ctx.user.id)),
      saveProfile: permissionProcedure("health.edit").input(z.object({ learnerId: z.number().int().positive(), allergies: z.string().max(2000).nullable().optional(), conditions: z.string().max(2000).nullable().optional(), bloodGroup: z.string().max(12).nullable().optional(), emergencyContactName: z.string().max(160).nullable().optional(), emergencyContactPhone: z.string().max(40).nullable().optional(), providerNotes: z.string().max(2000).nullable().optional() })).mutation(({ input, ctx }) => saveHealthProfile(input, ctx.user.id)),
      recordEvent: permissionProcedure("health.create").input(z.object({ learnerId: z.number().int().positive(), eventType: z.enum(["illness", "injury", "first_aid", "clinic_visit", "referral", "follow_up"]), eventDate: z.string().date(), notes: z.string().min(1).max(4000), medication: z.string().max(255).nullable().optional(), referredTo: z.string().max(255).nullable().optional() })).mutation(({ input, ctx }) => recordHealthEvent(input, ctx.user.id)),
    }),
    boarding: router({
      list: permissionProcedure("boarding.view").query(({ ctx }) => listBoardingRecords(ctx.user.id)),
      saveProfile: permissionProcedure("boarding.edit").input(z.object({ learnerId: z.number().int().positive(), residentialStatus: z.enum(["day_scholar", "full_time_boarder", "weekly_boarder", "scheduled_boarder"]), dietaryRequirements: z.string().max(1000).nullable().optional(), activeFrom: z.string().date() })).mutation(({ input, ctx }) => saveBoardingProfile(input, ctx.user.id)),
      createUnit: permissionProcedure("boarding.create").input(z.object({ name: z.string().min(1).max(120), room: z.string().max(80).nullable().optional(), capacity: z.number().int().min(1).max(500) })).mutation(({ input, ctx }) => createBoardingUnit(input, ctx.user.id)),
      allocateBed: permissionProcedure("boarding.edit").input(z.object({ learnerId: z.number().int().positive(), unitId: z.number().int().positive(), allocatedFrom: z.string().date() })).mutation(({ input, ctx }) => allocateBoardingBed(input, ctx.user.id)),
      attendance: permissionProcedure("boarding.edit").input(z.object({ learnerId: z.number().int().positive(), attendanceDate: z.string().date(), status: z.enum(["present", "absent", "late", "excused"]), notes: z.string().max(500).nullable().optional() })).mutation(({ input, ctx }) => recordBoardingAttendance(input, ctx.user.id)),
      meal: permissionProcedure("boarding.edit").input(z.object({ learnerId: z.number().int().positive(), mealDate: z.string().date(), mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]), status: z.enum(["served", "skipped", "excused"]), notes: z.string().max(500).nullable().optional() })).mutation(({ input, ctx }) => recordBoardingMeal(input, ctx.user.id)),
      checkout: permissionProcedure("boarding.edit").input(z.object({ learnerId: z.number().int().positive(), checkoutAt: z.string().datetime(), expectedReturnAt: z.string().datetime().nullable().optional(), destination: z.string().max(255).nullable().optional(), reason: z.string().min(1).max(500), notes: z.string().max(500).nullable().optional() })).mutation(({ input, ctx }) => checkoutBoarder(input, ctx.user.id)),
      return: permissionProcedure("boarding.edit").input(z.object({ checkoutId: z.number().int().positive() })).mutation(({ input, ctx }) => returnBoarder(input.checkoutId, ctx.user.id)),
    }),
    store: router({
      overview: permissionProcedure("store.view").query(() => getStoreOverview()),
      recordMovement: permissionProcedure("store.edit").input(z.object({ itemId: z.number().int().positive(), movementType: z.enum(["received", "issued", "adjustment"]), quantity: z.number().positive(), reference: z.string().max(120).nullable().optional() })).mutation(({ input, ctx }) => recordStoreMovement(input, currentUserId(ctx.user))),
    }),
    timetable: router({
      access: protectedProcedure.query(async ({ ctx }) => {
        const canManageMaster = await canManageMasterTimetable(ctx.user.id, ctx.user.role);
        const canViewPersonal = canManageMaster || await userCan(ctx.user.id, ctx.user.role, "timetable.view");
        const canViewMaster = await canViewMasterTimetable(ctx.user.id, ctx.user.role);
        return { canManageMaster, canViewPersonal, canViewMaster };
      }),
      personal: permissionProcedure("timetable.view").query(({ ctx }) => getPersonalTimetable(currentUserId(ctx.user))),
      list: masterTimetableProcedure.query(({ ctx }) => listTimetable(currentUserId(ctx.user))),
      plans: masterTimetableProcedure.query(({ ctx }) => listTimetablePlans(currentUserId(ctx.user))),
      addPlan: masterTimetableProcedure.input(z.object({ name: z.string().min(1).max(120), section: z.string().min(1).max(60), academicYear: z.number().int().min(2000).max(2100), term: z.string().max(40).nullable().optional(), description: z.string().max(500).nullable().optional() })).mutation(({ input, ctx }) => createTimetablePlan(input, currentUserId(ctx.user))),
      archivePlan: masterTimetableProcedure.input(z.object({ planId: z.number().int().positive() })).mutation(({ input, ctx }) => archiveTimetablePlan(input.planId, currentUserId(ctx.user))),
      versions: masterTimetableProcedure.query(({ ctx }) => listTimetableVersions(currentUserId(ctx.user))),
      restoreVersion: masterTimetableProcedure.input(z.object({ versionId: z.number().int().positive() })).mutation(({ input, ctx }) => restoreTimetableVersion(input.versionId, currentUserId(ctx.user))),
      masterList: protectedProcedure.use(async ({ ctx, next }) => {
        if (!await canViewMasterTimetable(ctx.user.id, ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "MASTER_TIMETABLE_SCOPE_FORBIDDEN" });
        return next();
      }).query(({ ctx }) => listTimetable(currentUserId(ctx.user))),
      audit: masterTimetableProcedure.input(z.object({ academicYear: z.number().int().min(2000).max(2100).optional() }).optional()).query(({ input, ctx }) => listTimetableAudit(input?.academicYear, currentUserId(ctx.user))),
      validationReport: masterTimetableProcedure.input(z.object({ academicYear: z.number().int().min(2000).max(2100).optional() }).optional()).query(({ input, ctx }) => getTimetableValidationReport(input?.academicYear, currentUserId(ctx.user))),
      teacherCodes: masterTimetableProcedure.query(({ ctx }) => listTeacherCodes(currentUserId(ctx.user))),
      updateTeacherCode: masterTimetableProcedure.input(z.object({ staffProfileId: z.number().int().positive(), teacherCode: z.number().int().min(1).max(999) })).mutation(({ input, ctx }) => updateTeacherCode(input, currentUserId(ctx.user))),
      generate: masterTimetableProcedure.input(z.object({ entries: z.array(z.object({ gradeId: z.number().int().positive(), subjectId: z.number().int().positive(), teacherUserId: z.number().int().positive(), dayOfWeek: z.number().int().min(1).max(7), period: z.number().int().positive(), room: z.string().max(80).nullable().optional(), isForcePlaced: z.boolean().optional() })) })).mutation(({ input, ctx }) => generateTimetable(input.entries, currentUserId(ctx.user))),
      saveEdited: masterTimetableProcedure.input(z.object({ entries: z.array(z.object({ gradeId: z.number().int().positive(), subjectId: z.number().int().positive(), teacherUserId: z.number().int().positive(), dayOfWeek: z.number().int().min(1).max(7), period: z.number().int().positive(), room: z.string().max(80).nullable().optional(), isForcePlaced: z.boolean().optional() })) })).mutation(({ input, ctx }) => saveEditedTimetable(input.entries, currentUserId(ctx.user))),
      requirements: masterTimetableProcedure.input(z.object({ academicYear: z.number().int().optional() }).optional()).query(({ input }) => listTimetableRequirements(input?.academicYear)),
      setRequirement: masterTimetableProcedure.input(z.object({ gradeId: z.number().int().positive(), subjectId: z.number().int().positive(), academicYear: z.number().int().min(2000).max(2100), periodsPerWeek: z.number().int().min(0).max(40) })).mutation(({ input, ctx }) => setTimetableRequirement(input, currentUserId(ctx.user))),
      assignClassTeacher: permissionProcedure("allocations.create").input(z.object({ teacherUserId: z.number().int().positive(), gradeId: z.number().int().positive(), academicYear: z.number().int().min(2000).max(2100), term: z.string().min(2).max(40) })).mutation(({ input, ctx }) => assignClassTeacher(input, currentUserId(ctx.user))),
      generateAutomatic: masterTimetableProcedure.input(z.object({ academicYear: z.number().int().min(2000).max(2100).optional(), regenerate: z.boolean(), forcePlace: z.boolean().optional(), days: z.number().int().min(1).max(7).optional(), periodsPerDay: z.number().int().min(1).max(12).optional(), classLessonTotals: z.array(z.object({ gradeId: z.number().int().positive(), totalLessonsPerWeek: z.number().int().min(0).max(200) })).optional() })).mutation(({ input, ctx }) => generateAutomaticTimetable(input, currentUserId(ctx.user))),
    }),
    communication: router({
      list: permissionProcedure("communication.edit").query(() => listCommunications()),
      create: permissionProcedure("communication.edit").input(z.object({ audience: z.enum(["parents", "staff", "learners", "all"]), channel: z.enum(["sms", "notice", "email"]), subject: z.string().min(1).max(160), body: z.string().min(1).max(5000) })).mutation(({ input, ctx }) => createCommunication(input, currentUserId(ctx.user))),
    }),
    messages: router({
      grades: permissionProcedure("communication.edit").query(() => listMessageGrades()),
      recipients: permissionProcedure("communication.edit").input(z.object({ kind: z.enum(["guardian", "learner", "staff", "guardian_grade"]), search: z.string().optional(), gradeId: z.number().int().positive().optional() })).query(({ input }) => listMessageRecipients(input.kind, input.search, input.gradeId)),
      preview: permissionProcedure("communication.edit").input(z.object({ kind: z.enum(["guardian", "learner", "staff", "grade", "guardian_grade"]), ids: z.array(z.number().int().positive()).default([]), gradeId: z.number().int().positive().optional() })).query(({ input }) => previewMessageRecipients(input.kind, input.ids, input.gradeId)),
      history: permissionProcedure("communication.edit").query(() => listNexusMessages()),
      queue: permissionProcedure("communication.edit").input(z.object({ category: z.string().max(80).default("announcement"), channel: z.enum(["sms", "email", "in_app", "whatsapp"]), body: z.string().min(1).max(5000), kind: z.enum(["guardian", "learner", "staff", "grade", "guardian_grade"]), ids: z.array(z.number().int().positive()).default([]), gradeId: z.number().int().positive().optional() })).mutation(({ input, ctx }) => queueNexusMessage(input, currentUserId(ctx.user))),
    }),
    alumni: router({
      list: permissionProcedure("alumni.edit").query(({ ctx }) => listAlumni(currentUserId(ctx.user))),
      archive: permissionProcedure("alumni.edit").input(z.object({ learnerId: z.number().int().positive(), completionYear: z.number().int().min(2000).max(2100), destination: z.string().max(160).nullable().optional() })).mutation(({ input, ctx }) => archiveLearner(input, currentUserId(ctx.user))),
    }),
    administration: router({
      overview: permissionProcedure("administration.view").query(({ ctx }) => adminOverview(ctx.user.id)),
      catalog: permissionProcedure("administration.view").query(({ ctx }) => adminCatalog(ctx.user.id)),
      schools: permissionProcedure("administration.view").query(({ ctx }) => listSchools(ctx.user)),
      createSchool: superProcedure.input(z.object({ schoolCode: z.string().min(3).max(40), schoolName: z.string().min(2).max(200), status: z.enum(["active", "pending_activation"]) })).mutation(({ input, ctx }) => adminCall(() => createSchool(input, ctx.user, ctx.req))),
      updateSchool: superProcedure.input(z.object({ schoolId: z.number().int().positive(), schoolName: z.string().min(2).max(200) })).mutation(({ input, ctx }) => adminCall(() => updateSchool(input, ctx.user, ctx.req))),
      setSchoolStatus: superProcedure.input(z.object({ schoolId: z.number().int().positive(), status: z.enum(["active", "suspended", "archived"]) })).mutation(({ input, ctx }) => adminCall(() => setSchoolStatus(input, ctx.user, ctx.req))),
      memberships: protectedProcedure.query(({ ctx }) => listMySchoolMemberships(ctx.user.id)),
      switchSchool: protectedProcedure.input(z.object({ schoolId: z.number().int().positive() })).mutation(({ input, ctx }) => adminCall(() => switchMySchool(input, ctx.user.id, ctx.req))),
      list: permissionProcedure("administration.view").input(z.object({ search: z.string().max(100).optional(), role: z.string().optional(), status: z.enum(["active", "suspended", "locked", "pending"]).optional() }).optional()).query(({ input, ctx }) => listAdminUsers(input ?? {}, ctx.user.id)),
      get: permissionProcedure("administration.view").input(z.object({ userId: z.number().int().positive() })).query(({ input, ctx }) => adminCall(() => getAdminUser(input.userId, ctx.user.id))),
      create: permissionProcedure("administration.create").input(z.object({ schoolId: z.number().int().positive().nullable().optional(), fullName: z.string().min(2).max(160), username: z.string().min(3).max(60), staffId: z.string().min(1).max(40), role: roleEnum, department: z.string().max(120).nullable().optional(), email: z.string().email().max(320).nullable().optional().or(z.literal("")), phone: z.string().max(40).nullable().optional(), classGradeId: z.number().int().positive().nullable().optional(), subjectAllocations: subjectAllocations.optional(), status: z.enum(["active", "pending_activation", "disabled"]), password: z.string().min(10).max(200).nullable().optional() })).mutation(({ input, ctx }) => adminCall(() => createAdminUser(input, ctx.user, ctx.req))),
      update: superProcedure.input(z.object({ userId: z.number().int().positive(), fullName: z.string().min(2).max(160), username: z.string().min(3).max(60), staffId: z.string().min(1).max(40), department: z.string().max(120).nullable().optional(), email: z.string().email().max(320).nullable().optional().or(z.literal("")), phone: z.string().max(40).nullable().optional(), password: z.string().min(10).max(200).nullable().optional() })).mutation(({ input, ctx }) => adminCall(() => updateAdminUser(input, ctx.user, ctx.req))),
      changeRole: permissionProcedure("administration.edit").input(z.object({ userId: z.number().int().positive(), role: roleEnum })).mutation(({ input, ctx }) => adminCall(() => changeAdminRole(input, ctx.user, ctx.req))),
      setRoles: permissionProcedure("administration.edit").input(z.object({ userId: z.number().int().positive(), roles: z.array(assignableRoleEnum).min(1).max(10) })).mutation(({ input, ctx }) => adminCall(() => setAdminRoles(input, ctx.user, ctx.req))),
      changeAssignment: permissionProcedure("administration.edit").input(z.object({ userId: z.number().int().positive(), classGradeId: z.number().int().positive().nullable().optional(), subjectAllocations })).mutation(({ input, ctx }) => adminCall(() => changeAdminAssignment(input, ctx.user, ctx.req))),
      setState: permissionProcedure("administration.edit").input(z.object({ userId: z.number().int().positive(), action: z.enum(["activate", "suspend", "deactivate", "lock", "unlock"]), reason: z.string().max(255).optional() })).mutation(({ input, ctx }) => adminCall(() => setAccountState(input, ctx.user, ctx.req))),
      deleteUser: superProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ input, ctx }) => adminCall(() => deleteAdminUser(input, ctx.user, ctx.req))),
      resetPassword: superProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ input, ctx }) => adminCall(() => resetAdminPassword(input, ctx.user, ctx.req))),
      matrix: permissionProcedure("administration.view").input(z.object({ role: z.string().optional(), userId: z.number().int().positive().optional() })).query(({ input }) => getPermissionMatrixView(input)),
      setRolePermission: superProcedure.input(z.object({ role: z.string(), permissionKey: z.string(), allowed: z.boolean() })).mutation(({ input, ctx }) => adminCall(() => setRolePermission(input, ctx.user, ctx.req))),
      setUserPermission: superProcedure.input(z.object({ userId: z.number().int().positive(), permissionKey: z.string(), allowed: z.boolean().nullable() })).mutation(({ input, ctx }) => adminCall(() => setUserPermissionOverride(input, ctx.user, ctx.req))),
      auditModules: permissionProcedure("administration.view").query(() => AUDIT_MODULES),
      audit: permissionProcedure("administration.view").input(z.object({ userId: z.number().int().positive().optional(), actorUserId: z.number().int().positive().optional(), action: z.string().max(80).optional(), module: z.string().max(40).optional(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), limit: z.number().int().min(1).max(200).optional(), offset: z.number().int().min(0).optional() }).optional()).query(({ input }) => listAuditTrail(input ?? {})),
    }),
    users: router({
      list: permissionProcedure("users.edit").input(z.object({ search: z.string().optional() }).optional()).query(({ input, ctx }) => listStaff(input?.search, currentUserId(ctx.user))),
      page: permissionProcedure("users.edit").input(z.object({ search: z.string().optional(), page: z.number().int().min(0).optional(), pageSize: z.number().int().min(10).max(100).optional() })).query(({ input, ctx }) => listStaffPage(input, currentUserId(ctx.user))),
      lastImport: permissionProcedure("users.edit").query(() => getLastPeopleImport()),
      undoLastImport: permissionProcedure("users.edit").mutation(({ ctx }) => undoLastPeopleImport(currentUserId(ctx.user))),
      createStaff: permissionProcedure("users.edit").input(z.object({ displayName: z.string().min(1).max(160), title: z.string().max(30).nullable().optional(), designation: z.string().max(120).nullable().optional(), phone: z.string().max(40).nullable().optional(), email: z.string().email().nullable().optional(), teacherCode: z.number().int().min(1).max(999).nullable().optional(), assignedGradeId: z.number().int().positive().nullable().optional(), role: z.enum(["admin", "teacher", "class_teacher", "finance", "nurse", "boarding_master"]), status: z.enum(["active", "inactive"]) })).mutation(({ input, ctx }) => createStaff(input, currentUserId(ctx.user))),
      updateStaff: permissionProcedure("users.edit").input(z.object({ staffProfileId: z.number().int().positive(), displayName: z.string().min(1).max(160), title: z.string().max(30).nullable().optional(), designation: z.string().max(120).nullable().optional(), phone: z.string().max(40).nullable().optional(), email: z.string().email().nullable().optional(), teacherCode: z.number().int().min(1).max(999).nullable().optional(), assignedGradeId: z.number().int().positive().nullable().optional(), role: z.enum(["super_admin", "admin", "teacher", "class_teacher", "senior_teacher", "deputy_head", "head_teacher", "exam_council", "nurse", "boarding_master", "finance", "storekeeper", "other"]), status: z.enum(["active", "inactive"]) })).mutation(({ input, ctx }) => updateStaff(input, currentUserId(ctx.user))),
      setStaffStatus: permissionProcedure("users.edit").input(z.object({ staffProfileId: z.number().int().positive(), status: z.enum(["active", "inactive"]) })).mutation(({ input, ctx }) => setStaffStatus(input, currentUserId(ctx.user))),
      restoreStaffProfile: protectedProcedure.input(z.object({ staffProfileId: z.number().int().positive() })).mutation(({ input, ctx }) => restoreStaffProfile(input, currentUserId(ctx.user))),
      deleteStaffProfile: permissionProcedure("users.edit").input(z.object({ staffProfileId: z.number().int().positive() })).mutation(({ input, ctx }) => deleteStaffProfile(input, currentUserId(ctx.user))),
      previewImport: permissionProcedure("users.edit").input(z.object({ rows: z.array(z.record(z.string(), z.any())).max(500), rowOffset: z.number().int().min(0).optional() })).mutation(({ input }) => previewPeopleImport({ kind: "staff", rows: input.rows, rowOffset: input.rowOffset })),
      import: permissionProcedure("users.edit").input(z.object({ rows: z.array(z.record(z.string(), z.any())).max(500) })).mutation(({ input, ctx }) => importPeopleRows({ kind: "staff", rows: input.rows }, currentUserId(ctx.user))),
      updateStaffRole: permissionProcedure("users.edit").input(z.object({ staffProfileId: z.number().int().positive(), role: z.enum(["admin", "teacher", "class_teacher", "finance", "nurse", "boarding_master"]) })).mutation(({ input, ctx }) => updateStaffRole(input, currentUserId(ctx.user))),
      permissions: permissionProcedure("users.edit").input(z.object({ userId: z.number().int().positive().optional() }).optional()).query(({ input, ctx }) => input?.userId ? getPermissionMatrix(input.userId) : getPermissionMatrix(ctx.user.id)),
      setPermission: permissionProcedure("users.edit").input(z.object({ userId: z.number().int().positive(), permissionKey: z.string(), allowed: z.boolean() })).mutation(({ input, ctx }) => setUserPermission(input, currentUserId(ctx.user))),
      effectivePermissions: protectedProcedure.query(({ ctx }) => effectivePermissions(ctx.user.id, ctx.user.role)),
    }),
    allocations: router({
      catalog: permissionProcedure("allocations.view").query(() => listAcademicCatalog()),
      list: permissionProcedure("allocations.view").input(z.object({ academicYear: z.number().int().optional(), term: z.string().max(40).optional(), status: z.enum(["active", "inactive", "replaced"]).optional() }).optional()).query(({ input, ctx }) => listAllocations(input, currentUserId(ctx.user))),
      create: permissionProcedure("allocations.create").input(z.object({ teacherUserId: z.number().int().positive(), gradeId: z.number().int().positive(), subjectId: z.number().int().min(0), academicYear: z.number().int().min(2000).max(2100), term: z.string().min(2).max(40), allocationType: z.enum(["class_teacher", "learning_area", "co_teacher", "substitute", "activity"]), startsOn: z.string().date().nullable().optional(), endsOn: z.string().date().nullable().optional() })).mutation(({ input, ctx }) => saveTeacherAllocation(input, currentUserId(ctx.user))),
      changeStatus: permissionProcedure("allocations.deactivate").input(z.object({ allocationId: z.number().int().positive(), status: z.enum(["active", "inactive", "replaced"]), replacedByUserId: z.number().int().positive().nullable().optional() })).mutation(({ input, ctx }) => changeTeacherAllocationStatus(input, currentUserId(ctx.user))),
      delete: permissionProcedure("allocations.deactivate").input(z.object({ allocationId: z.number().int().positive() })).mutation(({ input, ctx }) => deleteTeacherAllocation(input.allocationId, currentUserId(ctx.user))),
    }),
    settings: router({
      get: permissionProcedure("dashboard.view").query(() => getSettings()),
      createGrade: permissionProcedure("settings.edit").input(z.object({ name: z.string().min(1).max(80), stream: z.string().max(80).nullable().optional() })).mutation(({ input, ctx }) => createGradeClass(input, currentUserId(ctx.user))),
      updateGrade: permissionProcedure("settings.edit").input(z.object({ id: z.number().int().positive(), name: z.string().min(1).max(80), stream: z.string().max(80).nullable().optional() })).mutation(({ input, ctx }) => updateGradeClass(input, currentUserId(ctx.user))),
      deleteGrade: permissionProcedure("settings.edit").input(z.object({ id: z.number().int().positive() })).mutation(({ input, ctx }) => deleteGradeClass(input.id, currentUserId(ctx.user))),
      createSubject: permissionProcedure("settings.edit").input(z.object({ name: z.string().min(1).max(120), code: z.string().min(1).max(30) })).mutation(({ input, ctx }) => createLearningArea(input, currentUserId(ctx.user))),
      curriculum: permissionProcedure("settings.edit").query(() => getCurriculumSetup()),
      canManageSchoolLevels: protectedProcedure.query(({ ctx }) => canManageSchoolLevels(currentUserId(ctx.user))),
      saveCurriculum: permissionProcedure("settings.edit").input(z.object({ selections: z.array(z.object({ level: z.string().max(40), grade: z.string().max(40), pathway: z.string().max(100).nullable().optional(), area: z.string().max(160), offered: z.boolean() })) })).mutation(({ input, ctx }) => saveCurriculumSelections(input, currentUserId(ctx.user))),
      saveSchoolLevels: schoolLevelProcedure.input(z.object({ levels: z.array(z.enum(["ECDE", "Lower Primary", "Upper Primary", "Junior School", "Senior School"])) })).mutation(({ input, ctx }) => saveEnabledSchoolLevels(input.levels, currentUserId(ctx.user))),
      update: adminProcedure.input(z.object({ schoolName: z.string().min(1).max(200), motto: z.string().max(255).nullable().optional(), currentTerm: z.string().min(1).max(40), academicYear: z.number().int().min(2000).max(2100), includeFeesOnReportCard: z.boolean(), showPercentagesOnReportCard: z.boolean().optional(), subjectShortNames: z.record(z.string().trim().min(1).max(30), z.string().trim().max(24)).optional(), themePrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), themeAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), themeSurfaceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), themeMode: z.enum(["light", "dark", "system"]).optional() })).mutation(({ input, ctx }) => saveSettings(input, currentUserId(ctx.user))),
    }),
    academic: router({
      structure: adminProcedure.query(() => listAcademicStructure()),
      saveYear: adminProcedure.input(z.object({ year: z.number().int().min(2000).max(2100), startsOn: z.string().date(), endsOn: z.string().date(), rolloverOn: z.string().date().nullable().optional(), isCurrent: z.boolean() })).mutation(({ input }) => saveAcademicYear(input)),
      saveTerm: adminProcedure.input(z.object({ academicYearId: z.number().int().positive(), name: z.enum(["Term 1", "Term 2", "Term 3"]), startsOn: z.string().date(), endsOn: z.string().date(), isActive: z.boolean() })).mutation(({ input }) => saveAcademicTerm(input)),
      previewRollover: adminProcedure.input(z.object({ fromYear: z.number().int(), toYear: z.number().int() })).mutation(({ input, ctx }) => previewRollover(input, currentUserId(ctx.user))),
      items: adminProcedure.input(z.object({ runId: z.number().int().positive() })).query(({ input }) => listRollover(input.runId)),
      excludeRolloverItem: adminProcedure.input(z.object({ runId: z.number().int().positive(), itemId: z.number().int().positive(), reason: z.string().max(255).optional() })).mutation(({ input, ctx }) => excludeRolloverItem(input, currentUserId(ctx.user))),
      approveRollover: adminProcedure.input(z.object({ runId: z.number().int().positive() })).mutation(({ input, ctx }) => approveRollover(input.runId, currentUserId(ctx.user))),
      reverseRollover: adminProcedure.input(z.object({ runId: z.number().int().positive() })).mutation(({ input, ctx }) => reverseRollover(input.runId, currentUserId(ctx.user))),
    }),
    reports: router({
      learners: permissionProcedure("reports.view").query(({ ctx }) => listReportLearners(currentUserId(ctx.user))),
      reportCard: permissionProcedure("reports.view").input(z.object({ learnerId: z.number().int().positive(), academicYear: z.number().int().min(2000).max(2100), term: z.string().min(1).max(40), assessmentType: z.enum(["mid_term", "end_term"]) })).query(({ input, ctx }) => getAssessmentReportCard(input, currentUserId(ctx.user))),
      commentBank: protectedProcedure.input(z.object({ category: z.enum(["BE", "AE", "ME", "EE"]), role: z.enum(["class_teacher", "principal"]).optional() })).query(({ input, ctx }) => listReportComments({ ...input, userId: currentUserId(ctx.user) })),
      commentBankAdmin: permissionProcedure("settings.edit").query(({ ctx }) => listCommentBankAdmin(currentUserId(ctx.user))),
      createCommentBankEntry: permissionProcedure("settings.edit").input(z.object({ role: z.enum(["class_teacher", "principal"]), category: z.enum(["BE", "AE", "ME", "EE"]), text: z.string().min(10).max(1000) })).mutation(({ input, ctx }) => createCommentBankEntry({ ...input, userId: currentUserId(ctx.user) })),
      updateCommentBankEntry: permissionProcedure("settings.edit").input(z.object({ id: z.number().int().positive(), text: z.string().min(10).max(1000).optional(), active: z.boolean().optional() })).mutation(({ input, ctx }) => updateCommentBankEntry({ ...input, userId: currentUserId(ctx.user) })),
      deleteCommentBankEntry: permissionProcedure("settings.edit").input(z.object({ id: z.number().int().positive() })).mutation(({ input, ctx }) => deleteCommentBankEntry({ ...input, userId: currentUserId(ctx.user) })),
      generateAcademicRemark: permissionProcedure("assessments.edit").input(z.object({ learnerId: z.number().int().positive(), academicYear: z.number().int().min(2000).max(2100), term: z.string().min(1).max(40), assessmentType: z.enum(["mid_term", "end_term"]) })).mutation(({ input, ctx }) => generateAcademicRemark({ ...input, userId: currentUserId(ctx.user) })),
      saveReportCardComments: permissionProcedure("assessments.edit").input(z.object({ learnerId: z.number().int().positive(), academicYear: z.number().int(), term: z.string().max(40), assessmentType: z.enum(["mid_term", "end_term"]).default("end_term"), classTeacherComment: z.string().max(1000).nullable().optional(), headTeacherComment: z.string().max(1000).nullable().optional() })).mutation(({ input, ctx }) => saveReportCardComments(input, currentUserId(ctx.user))),
      setReportCardStatus: adminProcedure.input(z.object({ learnerId: z.number().int().positive(), academicYear: z.number().int(), term: z.string().max(40), assessmentType: z.enum(["mid_term", "end_term"]).default("end_term"), status: z.enum(["draft", "generated", "reviewed", "approved", "published"]) })).mutation(({ input, ctx }) => setReportCardStatus(input, currentUserId(ctx.user))),
    }),
    audit: router({
      list: adminProcedure.query(() => listAuditLogs()),
    }),
    ai: router({
      ask: permissionProcedure("ai.access").input(z.object({ question: z.string().min(1).max(500) })).query(({ input, ctx }) => aiFacts(input.question, ctx.user.id, ctx.user.role)),
      transactions: permissionProcedure("ai.access").query(({ ctx }) => listNexusAiTransactions(ctx.user.id)),
      documents: permissionProcedure("ai.access").query(({ ctx }) => listNexusAiDocuments(ctx.user.id)),
      saveDocument: permissionProcedure("ai.access").input(z.object({ documentType: z.string().trim().min(1).max(80), title: z.string().trim().min(1).max(255), grade: z.string().trim().min(1).max(80), subject: z.string().trim().min(1).max(120), term: z.string().trim().min(1).max(40), topic: z.string().trim().min(1).max(255), body: z.string().min(1).max(50000) })).mutation(({ input, ctx }) => createNexusAiDocument(input, ctx.user.id)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
