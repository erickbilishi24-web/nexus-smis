import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  archiveLearner,
  createCommunication,
  generateTimetable,
  getDashboardSnapshot,
  getFinanceOverview,
  getReportCard,
  getSettings,
  getStoreOverview,
  listAlumni,
  listAllocations,
  listAssessments,
  listAttendance,
  listAuditLogs,
  listCommunications,
  listLearners,
  listMarks,
  listStaff,
  listTimetable,
  recordPayment,
  recordStoreMovement,
  saveAttendance,
  saveMark,
  saveSettings,
} from "./smis";

const currentUserId = (user: { id: number }) => user.id;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  smis: router({
    health: publicProcedure.query(() => ({ ok: true, service: "kenyan-smis", persistence: "mysql-drizzle", modules: ["learners", "attendance", "assessments", "reports", "finance", "store", "timetable", "communication", "alumni", "users", "settings", "audit"] })),
    snapshot: publicProcedure.query(() => getDashboardSnapshot()),
    learners: router({
      list: publicProcedure.input(z.object({ search: z.string().optional() }).optional()).query(({ input }) => listLearners(input?.search)),
    }),
    attendance: router({
      list: publicProcedure.input(z.object({ date: z.string().optional() }).optional()).query(({ input }) => listAttendance(input?.date)),
      save: protectedProcedure.input(z.object({ learnerId: z.number().int().positive(), status: z.enum(["present", "absent", "late", "excused"]), attendanceDate: z.string(), note: z.string().max(255).nullable().optional() })).mutation(({ input, ctx }) => saveAttendance(input, currentUserId(ctx.user))),
    }),
    assessments: router({
      list: publicProcedure.query(() => listAssessments()),
      marks: publicProcedure.input(z.object({ assessmentId: z.number().int().positive().optional() }).optional()).query(({ input }) => listMarks(input?.assessmentId)),
      saveMark: protectedProcedure.input(z.object({ assessmentId: z.number().int().positive(), learnerId: z.number().int().positive(), subjectId: z.number().int().positive(), midTerm: z.number().min(0).max(100), endTerm: z.number().min(0).max(100), teacherRemark: z.string().max(255).nullable().optional() })).mutation(({ input, ctx }) => saveMark(input, currentUserId(ctx.user))),
    }),
    finance: router({
      overview: publicProcedure.input(z.object({ learnerId: z.number().int().positive().optional() }).optional()).query(({ input }) => getFinanceOverview(input?.learnerId)),
      recordPayment: protectedProcedure.input(z.object({ learnerId: z.number().int().positive(), amount: z.number().positive(), paymentMethod: z.enum(["mpesa", "bank", "cash"]), reference: z.string().min(3).max(80) })).mutation(({ input, ctx }) => recordPayment(input, currentUserId(ctx.user))),
    }),
    store: router({
      overview: publicProcedure.query(() => getStoreOverview()),
      recordMovement: protectedProcedure.input(z.object({ itemId: z.number().int().positive(), movementType: z.enum(["received", "issued", "adjustment"]), quantity: z.number().positive(), reference: z.string().max(120).nullable().optional() })).mutation(({ input, ctx }) => recordStoreMovement(input, currentUserId(ctx.user))),
    }),
    timetable: router({
      list: publicProcedure.query(() => listTimetable()),
      generate: protectedProcedure.input(z.object({ entries: z.array(z.object({ gradeId: z.number().int().positive(), subjectId: z.number().int().positive(), teacherUserId: z.number().int().positive(), dayOfWeek: z.number().int().min(1).max(7), period: z.number().int().positive(), room: z.string().max(80).nullable().optional() })) })).mutation(({ input, ctx }) => generateTimetable(input.entries, currentUserId(ctx.user))),
    }),
    communication: router({
      list: publicProcedure.query(() => listCommunications()),
      create: protectedProcedure.input(z.object({ audience: z.enum(["parents", "staff", "learners", "all"]), channel: z.enum(["sms", "notice", "email"]), subject: z.string().min(1).max(160), body: z.string().min(1) })).mutation(({ input, ctx }) => createCommunication(input, currentUserId(ctx.user))),
    }),
    alumni: router({
      list: publicProcedure.query(() => listAlumni()),
      archive: protectedProcedure.input(z.object({ learnerId: z.number().int().positive(), completionYear: z.number().int().min(2000).max(2100), destination: z.string().max(160).nullable().optional() })).mutation(({ input, ctx }) => archiveLearner(input, currentUserId(ctx.user))),
    }),
    users: router({
      list: protectedProcedure.query(() => listStaff()),
    }),
    allocations: router({
      list: protectedProcedure.query(() => listAllocations()),
    }),
    settings: router({
      get: publicProcedure.query(() => getSettings()),
      update: adminProcedure.input(z.object({ schoolName: z.string().min(1).max(200), motto: z.string().max(255).nullable().optional(), currentTerm: z.string().min(1).max(40), academicYear: z.number().int().min(2000).max(2100), includeFeesOnReportCard: z.boolean() })).mutation(({ input, ctx }) => saveSettings(input, currentUserId(ctx.user))),
    }),
    reports: router({
      reportCard: protectedProcedure.input(z.object({ learnerId: z.number().int().positive() })).query(({ input }) => getReportCard(input.learnerId)),
    }),
    audit: router({
      list: adminProcedure.query(() => listAuditLogs()),
    }),
  }),
});

export type AppRouter = typeof appRouter;
