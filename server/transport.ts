import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { canAssignRouteSeat, isValidOdometerTrip, isValidTransportPeriod, periodMatchesCycle } from "../shared/transport";
import {
  auditLogs, expenditures, guardians, learnerGuardians, learners, payments, schoolSettings,
  staffProfiles, transportAllocations, transportAttendance, transportChargePayments,
  transportCharges, transportCosts, transportIncidents, transportRoutes, transportSettings, transportTrips,
  transportVehicles,
} from "../drizzle/schema";
import { requireDb, userCan, writeAudit } from "./smis";

const money = (value: number) => Math.round(value * 100) / 100;
const safeNumber = (value: unknown) => Number(value ?? 0);
const asDate = (value: string | null | undefined) => value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : null;
const dateString = (value: Date | string | null | undefined) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "").slice(0, 10);

async function schoolScope(allowDisabled = false) {
  const db = await requireDb();
  const row = (await db.select({ id: schoolSettings.id }).from(schoolSettings).limit(1))[0];
  if (!row?.id) throw new Error("SCHOOL_SETTINGS_NOT_CONFIGURED");
  const setting = (await db.select({ enabled: transportSettings.enabled }).from(transportSettings).where(eq(transportSettings.schoolId, row.id)).limit(1))[0];
  if (!allowDisabled && setting?.enabled === 0) throw new Error("TRANSPORT_MODULE_DISABLED");
  return { db, schoolId: row.id };
}

async function demand(userId: number, role: string, permission: string) {
  if (!await userCan(userId, role, permission)) throw new Error("FORBIDDEN");
}

export async function getTransportWorkspace(userId: number, role: string) {
  await demand(userId, role, "transport.view");
  const { db, schoolId } = await schoolScope(true);
  const [setting, vehicleRows, routeRows, allocationRows, chargeRows, linkRows, attendanceRows, costRows, tripRows, incidentRows] = await Promise.all([
    db.select().from(transportSettings).where(eq(transportSettings.schoolId, schoolId)).limit(1),
    db.select().from(transportVehicles).where(eq(transportVehicles.schoolId, schoolId)).orderBy(transportVehicles.registration),
    db.select().from(transportRoutes).where(eq(transportRoutes.schoolId, schoolId)).orderBy(transportRoutes.name),
    db.select().from(transportAllocations).where(eq(transportAllocations.schoolId, schoolId)).orderBy(desc(transportAllocations.id)),
    db.select().from(transportCharges).where(eq(transportCharges.schoolId, schoolId)).orderBy(desc(transportCharges.id)),
    db.select().from(transportChargePayments).where(eq(transportChargePayments.schoolId, schoolId)),
    db.select().from(transportAttendance).where(eq(transportAttendance.schoolId, schoolId)).orderBy(desc(transportAttendance.attendanceDate), desc(transportAttendance.id)).limit(150),
    db.select().from(transportCosts).where(eq(transportCosts.schoolId, schoolId)).orderBy(desc(transportCosts.costDate), desc(transportCosts.id)).limit(100),
    db.select().from(transportTrips).where(eq(transportTrips.schoolId, schoolId)).orderBy(desc(transportTrips.tripDate), desc(transportTrips.id)).limit(100),
    db.select().from(transportIncidents).where(eq(transportIncidents.schoolId, schoolId)).orderBy(desc(transportIncidents.incidentDate), desc(transportIncidents.id)).limit(100),
  ]);
  const activeLearnerIds = Array.from(new Set(allocationRows.map(row => row.learnerId)));
  const learnerRows = activeLearnerIds.length ? await db.select({ id: learners.id, fullName: learners.fullName, admissionNumber: learners.admissionNumber, guardianName: learners.guardianName, guardianPhone: learners.guardianPhone, status: learners.status }).from(learners).where(inArray(learners.id, activeLearnerIds)) : [];
  const staffIds = Array.from(new Set(vehicleRows.map(row => row.driverStaffProfileId).filter((id): id is number => id !== null)));
  const staffRows = staffIds.length ? await db.select({ id: staffProfiles.id, displayName: staffProfiles.displayName }).from(staffProfiles).where(inArray(staffProfiles.id, staffIds)) : [];
  const learnersById = new Map(learnerRows.map(row => [row.id, row]));
  const staffById = new Map(staffRows.map(row => [row.id, row.displayName]));
  const routeById = new Map(routeRows.map(row => [row.id, row]));
  const paymentTotals = new Map<number, number>();
  for (const link of linkRows) paymentTotals.set(link.chargeId, (paymentTotals.get(link.chargeId) ?? 0) + safeNumber(link.amount));
  const occupancy = new Map<number, number>();
  for (const assignment of allocationRows) if (assignment.status === "active") occupancy.set(assignment.routeId, (occupancy.get(assignment.routeId) ?? 0) + 1);
  const unpaidTotal = chargeRows.reduce((sum, row) => sum + Math.max(0, safeNumber(row.amount) - (paymentTotals.get(row.id) ?? 0)), 0);
  const recentVehicleCosts = money(costRows.reduce((sum, row) => sum + safeNumber(row.amount), 0));
  const enabled = setting[0]?.enabled !== 0;
  if (!enabled) return { enabled: false, vehicles: [], routes: [], allocations: [], charges: [], attendance: [], costs: [], trips: [], incidents: [], metrics: { activeVehicles: 0, activeLearners: 0, openCharges: 0, transportArrears: 0, recentVehicleCosts: 0, reminders: 0, openIncidents: 0 } };
  return {
    enabled,
    vehicles: vehicleRows.map(row => ({ ...row, driverName: row.driverStaffProfileId ? staffById.get(row.driverStaffProfileId) ?? null : null })),
    routes: routeRows.map(row => ({ ...row, occupancy: occupancy.get(row.id) ?? 0, vehicle: row.vehicleId ? vehicleRows.find(vehicle => vehicle.id === row.vehicleId) ?? null : null })),
    allocations: allocationRows.map(row => ({ ...row, learner: learnersById.get(row.learnerId) ?? null, routeName: routeById.get(row.routeId)?.name ?? "Unknown route" })),
    charges: chargeRows.map(row => ({ ...row, learnerName: learnersById.get(row.learnerId)?.fullName ?? null, routeName: routeById.get(row.routeId)?.name ?? "Unknown route", paid: money(paymentTotals.get(row.id) ?? 0), balance: money(Math.max(0, safeNumber(row.amount) - (paymentTotals.get(row.id) ?? 0))) })),
    attendance: attendanceRows.map(row => ({ ...row, learnerName: learnersById.get(row.learnerId)?.fullName ?? null, routeName: routeById.get(row.routeId)?.name ?? "Unknown route" })),
    costs: costRows.map(row => ({ ...row, vehicleRegistration: vehicleRows.find(vehicle => vehicle.id === row.vehicleId)?.registration ?? "Unknown vehicle" })),
    trips: tripRows.map(row => ({ ...row, vehicleRegistration: vehicleRows.find(vehicle => vehicle.id === row.vehicleId)?.registration ?? "Unknown vehicle", routeName: row.routeId ? routeById.get(row.routeId)?.name ?? null : null })),
    incidents: incidentRows.map(row => ({ ...row, vehicleRegistration: vehicleRows.find(vehicle => vehicle.id === row.vehicleId)?.registration ?? "Unknown vehicle", routeName: row.routeId ? routeById.get(row.routeId)?.name ?? null : null })),
    metrics: {
      activeVehicles: vehicleRows.filter(row => row.status === "active").length,
      activeLearners: allocationRows.filter(row => row.status === "active").length,
      openCharges: chargeRows.filter(row => safeNumber(row.amount) > (paymentTotals.get(row.id) ?? 0)).length,
      transportArrears: money(unpaidTotal),
      recentVehicleCosts,
      reminders: vehicleRows.filter(row => row.status !== "retired" && [row.insuranceExpiresOn, row.inspectionExpiresOn].some(value => value && dateString(value) <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))).length + costRows.filter(row => row.nextDueOn && dateString(row.nextDueOn) <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).length,
      openIncidents: incidentRows.filter(row => row.status === "open").length,
    },
  };
}

export async function setTransportEnabled(input: { enabled: boolean }, userId: number, role: string) {
  await demand(userId, role, "transport.manage");
  const { db, schoolId } = await schoolScope(true);
  await db.insert(transportSettings).values({ schoolId, enabled: input.enabled ? 1 : 0, updatedByUserId: userId }).onDuplicateKeyUpdate({ set: { enabled: input.enabled ? 1 : 0, updatedByUserId: userId } });
  await writeAudit(userId, "transport.settings.update", "transport_settings", schoolId, { enabled: input.enabled });
  return { ok: true };
}

export async function saveTransportVehicle(input: {
  vehicleId?: number; registration: string; description: string; capacity: number; driverStaffProfileId?: number | null;
  assetReference?: string | null; insuranceExpiresOn?: string | null; inspectionExpiresOn?: string | null; odometerKm?: number;
}, userId: number, role: string) {
  await demand(userId, role, "transport.manage");
  const registration = input.registration.trim().toUpperCase();
  const description = input.description.trim();
  if (!/^[A-Z0-9 -]{3,24}$/.test(registration) || !description || !Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 80) throw new Error("VEHICLE_INPUT_INVALID");
  if (!Number.isFinite(input.odometerKm ?? 0) || (input.odometerKm ?? 0) < 0) throw new Error("ODOMETER_INVALID");
  const { db, schoolId } = await schoolScope();
  if (input.driverStaffProfileId) {
    const driver = (await db.select({ id: staffProfiles.id }).from(staffProfiles).where(and(eq(staffProfiles.id, input.driverStaffProfileId), eq(staffProfiles.status, "active"))).limit(1))[0];
    if (!driver) throw new Error("ACTIVE_DRIVER_NOT_FOUND");
  }
  const values = {
    schoolId, registration, description, capacity: input.capacity,
    driverStaffProfileId: input.driverStaffProfileId ?? null,
    assetReference: input.assetReference?.trim() || null,
    insuranceExpiresOn: asDate(input.insuranceExpiresOn),
    inspectionExpiresOn: asDate(input.inspectionExpiresOn),
    odometerKm: String(money(input.odometerKm ?? 0)),
  };
  let id: number;
  if (input.vehicleId) {
    const current = (await db.select().from(transportVehicles).where(and(eq(transportVehicles.id, input.vehicleId), eq(transportVehicles.schoolId, schoolId))).limit(1))[0];
    if (!current) throw new Error("VEHICLE_NOT_FOUND");
    await db.update(transportVehicles).set(values).where(and(eq(transportVehicles.id, input.vehicleId), eq(transportVehicles.schoolId, schoolId)));
    id = input.vehicleId;
  } else {
    const row = (await db.insert(transportVehicles).values({ ...values, status: "active", createdByUserId: userId }).$returningId())[0];
    id = row.id;
  }
  await writeAudit(userId, input.vehicleId ? "transport.vehicle.update" : "transport.vehicle.create", "transport_vehicle", id, { registration, capacity: input.capacity, driverStaffProfileId: input.driverStaffProfileId ?? null });
  return { ok: true, id };
}

export async function setTransportVehicleStatus(input: { vehicleId: number; status: "active" | "service" | "retired" }, userId: number, role: string) {
  await demand(userId, role, "transport.manage");
  const { db, schoolId } = await schoolScope();
  await db.update(transportVehicles).set({ status: input.status }).where(and(eq(transportVehicles.id, input.vehicleId), eq(transportVehicles.schoolId, schoolId)));
  await writeAudit(userId, "transport.vehicle.status", "transport_vehicle", input.vehicleId, { status: input.status });
  return { ok: true };
}

export async function saveTransportRoute(input: { routeId?: number; name: string; vehicleId?: number | null; feeAmount: number; billingCycle: "monthly" | "termly"; status: "active" | "inactive" }, userId: number, role: string) {
  await demand(userId, role, "transport.manage");
  const { db, schoolId } = await schoolScope();
  const name = input.name.trim();
  if (!name || !Number.isFinite(input.feeAmount) || input.feeAmount < 0 || input.feeAmount > 2_000_000) throw new Error("ROUTE_INPUT_INVALID");
  if (input.vehicleId) {
    const vehicle = (await db.select().from(transportVehicles).where(and(eq(transportVehicles.id, input.vehicleId), eq(transportVehicles.schoolId, schoolId))).limit(1))[0];
    if (!vehicle || vehicle.status !== "active") throw new Error("ACTIVE_VEHICLE_NOT_FOUND");
  }
  const values = { schoolId, name, vehicleId: input.vehicleId ?? null, feeAmount: String(money(input.feeAmount)), billingCycle: input.billingCycle, status: input.status };
  let id: number;
  if (input.routeId) {
    const route = (await db.select({ id: transportRoutes.id }).from(transportRoutes).where(and(eq(transportRoutes.id, input.routeId), eq(transportRoutes.schoolId, schoolId))).limit(1))[0];
    if (!route) throw new Error("ROUTE_NOT_FOUND");
    await db.update(transportRoutes).set(values).where(and(eq(transportRoutes.id, input.routeId), eq(transportRoutes.schoolId, schoolId)));
    id = input.routeId;
  } else {
    const inserted = (await db.insert(transportRoutes).values({ ...values, createdByUserId: userId }).$returningId())[0];
    id = inserted.id;
  }
  await writeAudit(userId, input.routeId ? "transport.route.update" : "transport.route.create", "transport_route", id, { name, vehicleId: input.vehicleId ?? null, feeAmount: input.feeAmount });
  return { ok: true, id };
}

export async function assignLearnerTransport(input: { learnerId: number; routeId: number; stopName: string; authorizedGuardianId?: number | null; startsOn: string }, userId: number, role: string) {
  await demand(userId, role, "transport.manage");
  const { db, schoolId } = await schoolScope();
  const learner = (await db.select({ id: learners.id, status: learners.status }).from(learners).where(eq(learners.id, input.learnerId)).limit(1))[0];
  const route = (await db.select().from(transportRoutes).where(and(eq(transportRoutes.id, input.routeId), eq(transportRoutes.schoolId, schoolId))).limit(1))[0];
  if (!learner || learner.status !== "active") throw new Error("ACTIVE_LEARNER_NOT_FOUND");
  if (!route || route.status !== "active" || !route.vehicleId) throw new Error("ACTIVE_ROUTE_VEHICLE_REQUIRED");
  const vehicle = (await db.select().from(transportVehicles).where(and(eq(transportVehicles.id, route.vehicleId), eq(transportVehicles.schoolId, schoolId))).limit(1))[0];
  if (!vehicle || vehicle.status !== "active") throw new Error("ACTIVE_VEHICLE_REQUIRED");
  if (input.authorizedGuardianId) {
    const guardian = (await db.select({ id: guardians.id }).from(learnerGuardians).innerJoin(guardians, eq(guardians.id, learnerGuardians.guardianId)).where(and(eq(learnerGuardians.learnerId, input.learnerId), eq(guardians.id, input.authorizedGuardianId))).limit(1))[0];
    if (!guardian) throw new Error("GUARDIAN_NOT_LINKED_TO_LEARNER");
  }
  const values = { schoolId, learnerId: input.learnerId, routeId: input.routeId, stopName: input.stopName.trim(), authorizedGuardianId: input.authorizedGuardianId ?? null, startsOn: asDate(input.startsOn)!, endsOn: null, status: "active" as const };
  if (!values.stopName) throw new Error("STOP_REQUIRED");
  const id = await db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM transport_routes WHERE id = ${input.routeId} AND schoolId = ${schoolId} FOR UPDATE`);
    const existing = (await tx.select().from(transportAllocations).where(and(eq(transportAllocations.schoolId, schoolId), eq(transportAllocations.learnerId, input.learnerId))).limit(1))[0];
    const occupied = await tx.select({ id: transportAllocations.id }).from(transportAllocations).where(and(eq(transportAllocations.schoolId, schoolId), eq(transportAllocations.routeId, input.routeId), eq(transportAllocations.status, "active")));
    if ((!existing || existing.status !== "active" || existing.routeId !== input.routeId) && !canAssignRouteSeat(vehicle.capacity, occupied.length)) throw new Error("ROUTE_CAPACITY_REACHED");
    let allocationId: number;
    if (existing) {
      await tx.update(transportAllocations).set(values).where(and(eq(transportAllocations.id, existing.id), eq(transportAllocations.schoolId, schoolId)));
      allocationId = existing.id;
    } else {
      allocationId = (await tx.insert(transportAllocations).values({ ...values, createdByUserId: userId }).$returningId())[0].id;
    }
    await tx.insert(auditLogs).values({ userId, action: "transport.learner.assign", entityType: "transport_allocation", entityId: String(allocationId), metadata: JSON.stringify({ learnerId: input.learnerId, routeId: input.routeId, authorizedGuardianId: input.authorizedGuardianId ?? null }) });
    return allocationId;
  });
  return { ok: true, id };
}

export async function setLearnerTransportStatus(input: { allocationId: number; status: "active" | "paused" | "ended" }, userId: number, role: string) {
  await demand(userId, role, "transport.manage");
  const { db, schoolId } = await schoolScope();
  await db.update(transportAllocations).set({ status: input.status, endsOn: input.status === "ended" ? asDate(new Date().toISOString().slice(0, 10)) : null }).where(and(eq(transportAllocations.id, input.allocationId), eq(transportAllocations.schoolId, schoolId)));
  await writeAudit(userId, `transport.learner.${input.status}`, "transport_allocation", input.allocationId, {});
  return { ok: true };
}

export async function billTransportPeriod(input: { period: string }, userId: number, role: string) {
  await demand(userId, role, "transport.manage");
  if (!isValidTransportPeriod(input.period)) throw new Error("PERIOD_INVALID");
  const { db, schoolId } = await schoolScope();
  const active = await db.select().from(transportAllocations).where(and(eq(transportAllocations.schoolId, schoolId), eq(transportAllocations.status, "active")));
  const routes = await db.select().from(transportRoutes).where(and(eq(transportRoutes.schoolId, schoolId), eq(transportRoutes.status, "active")));
  const byRoute = new Map(routes.map(route => [route.id, route]));
  let created = 0;
  for (const allocation of active) {
    const route = byRoute.get(allocation.routeId);
    if (!route || safeNumber(route.feeAmount) <= 0) continue;
    if (!periodMatchesCycle(input.period, route.billingCycle)) continue;
    const existing = (await db.select({ id: transportCharges.id }).from(transportCharges).where(and(eq(transportCharges.schoolId, schoolId), eq(transportCharges.learnerId, allocation.learnerId), eq(transportCharges.period, input.period))).limit(1))[0];
    if (existing) continue;
    await db.insert(transportCharges).values({ schoolId, learnerId: allocation.learnerId, routeId: route.id, period: input.period, amount: route.feeAmount, createdByUserId: userId });
    created += 1;
  }
  await writeAudit(userId, "transport.period.bill", "transport_charge_period", input.period, { created });
  return { ok: true, period: input.period, created };
}

export async function recordTransportPayment(input: { chargeId: number; amount: number; paymentMethod: "mpesa" | "bank" | "cash"; reference: string }, userId: number, role: string) {
  await demand(userId, role, "finance.edit");
  const amount = money(input.amount);
  const reference = input.reference.trim();
  if (!Number.isFinite(amount) || amount <= 0 || reference.length < 3 || reference.length > 80) throw new Error("PAYMENT_INPUT_INVALID");
  const { db, schoolId } = await schoolScope();
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM transport_charges WHERE id = ${input.chargeId} AND schoolId = ${schoolId} FOR UPDATE`);
    const charge = (await tx.select().from(transportCharges).where(and(eq(transportCharges.id, input.chargeId), eq(transportCharges.schoolId, schoolId))).limit(1))[0];
    if (!charge) throw new Error("TRANSPORT_CHARGE_NOT_FOUND");
    const previous = (await tx.select().from(transportChargePayments).where(and(eq(transportChargePayments.schoolId, schoolId), eq(transportChargePayments.reference, reference))).limit(1))[0];
    if (previous) {
      if (previous.chargeId !== charge.id || safeNumber(previous.amount) !== amount) throw new Error("PAYMENT_REFERENCE_ALREADY_USED");
      return { ok: true, paymentId: previous.paymentId, idempotent: true };
    }
    const priorLinks = await tx.select().from(transportChargePayments).where(and(eq(transportChargePayments.chargeId, charge.id), eq(transportChargePayments.schoolId, schoolId)));
    const paid = priorLinks.reduce((sum, row) => sum + safeNumber(row.amount), 0);
    if (amount > safeNumber(charge.amount) - paid + 0.001) throw new Error("PAYMENT_EXCEEDS_CHARGE_BALANCE");
    const paymentId = (await tx.insert(payments).values({ learnerId: charge.learnerId, amount: String(amount), paymentMethod: input.paymentMethod, reference }).$returningId())[0].id;
    await tx.insert(transportChargePayments).values({ schoolId, chargeId: charge.id, paymentId: Number(paymentId), reference, amount: String(amount) });
    await tx.insert(auditLogs).values({ userId, action: "transport.charge.payment", entityType: "transport_charge", entityId: String(charge.id), metadata: JSON.stringify({ paymentId: Number(paymentId), amount, reference }) });
    return { ok: true, paymentId: Number(paymentId) };
  });
}

export async function saveTransportAttendance(input: { routeId: number; attendanceDate: string; shift: "am" | "pm"; entries: Array<{ learnerId: number; status: "boarded" | "absent" | "excused" }> }, userId: number, role: string) {
  await demand(userId, role, "transport.edit");
  if (input.entries.length < 1 || input.entries.length > 120 || new Set(input.entries.map(row => row.learnerId)).size !== input.entries.length) throw new Error("ATTENDANCE_BATCH_INVALID");
  const { db, schoolId } = await schoolScope();
  const allocations = await db.select().from(transportAllocations).where(and(eq(transportAllocations.schoolId, schoolId), eq(transportAllocations.routeId, input.routeId), eq(transportAllocations.status, "active")));
  const allocated = new Set(allocations.map(row => row.learnerId));
  if (input.entries.some(row => !allocated.has(row.learnerId))) throw new Error("LEARNER_NOT_ON_ROUTE");
  await db.transaction(async tx => {
    for (const entry of input.entries) {
      await tx.insert(transportAttendance).values({ schoolId, learnerId: entry.learnerId, routeId: input.routeId, attendanceDate: asDate(input.attendanceDate)!, shift: input.shift, status: entry.status, capturedByUserId: userId }).onDuplicateKeyUpdate({ set: { routeId: input.routeId, status: entry.status, capturedByUserId: userId } });
    }
    await tx.insert(auditLogs).values({ userId, action: "transport.attendance.save", entityType: "transport_attendance", entityId: input.attendanceDate, metadata: JSON.stringify({ routeId: input.routeId, shift: input.shift, count: input.entries.length }) });
  });
  return { ok: true, count: input.entries.length };
}

export async function recordTransportTrip(input: { vehicleId: number; routeId?: number | null; driverStaffProfileId?: number | null; tripDate: string; shift: "am" | "pm" | "other"; odometerStartKm: number; odometerEndKm: number; notes?: string | null }, userId: number, role: string) {
  await demand(userId, role, "transport.edit");
  if (!isValidOdometerTrip(input.odometerStartKm, input.odometerEndKm)) throw new Error("ODOMETER_RANGE_INVALID");
  const { db, schoolId } = await schoolScope();
  const vehicle = (await db.select().from(transportVehicles).where(and(eq(transportVehicles.id, input.vehicleId), eq(transportVehicles.schoolId, schoolId))).limit(1))[0];
  if (!vehicle || vehicle.status !== "active") throw new Error("ACTIVE_VEHICLE_REQUIRED");
  const driverId = input.driverStaffProfileId ?? vehicle.driverStaffProfileId;
  if (driverId) {
    const driver = (await db.select({ id: staffProfiles.id }).from(staffProfiles).where(and(eq(staffProfiles.id, driverId), eq(staffProfiles.status, "active"))).limit(1))[0];
    if (!driver) throw new Error("ACTIVE_DRIVER_NOT_FOUND");
  }
  if (input.routeId && !(await db.select({ id: transportRoutes.id }).from(transportRoutes).where(and(eq(transportRoutes.id, input.routeId), eq(transportRoutes.schoolId, schoolId))).limit(1))[0]) throw new Error("ROUTE_NOT_FOUND");
  const id = (await db.insert(transportTrips).values({ schoolId, vehicleId: input.vehicleId, routeId: input.routeId ?? null, driverStaffProfileId: driverId ?? null, tripDate: asDate(input.tripDate)!, shift: input.shift, odometerStartKm: String(input.odometerStartKm), odometerEndKm: String(input.odometerEndKm), notes: input.notes?.trim().slice(0, 500) || null, createdByUserId: userId }).$returningId())[0].id;
  await db.update(transportVehicles).set({ odometerKm: String(input.odometerEndKm) }).where(and(eq(transportVehicles.id, input.vehicleId), eq(transportVehicles.schoolId, schoolId)));
  await writeAudit(userId, "transport.trip.record", "transport_trip", id, { vehicleId: input.vehicleId, routeId: input.routeId ?? null, distanceKm: money(input.odometerEndKm - input.odometerStartKm) });
  return { ok: true, id };
}

export async function recordTransportCost(input: { vehicleId: number; costType: "fuel" | "maintenance" | "repair" | "other"; costDate: string; amount: number; description: string; nextDueOn?: string | null; idempotencyKey: string }, userId: number, role: string) {
  await demand(userId, role, "finance.edit");
  const amount = money(input.amount);
  const description = input.description.trim();
  if (amount <= 0 || amount > 50_000_000 || !description || !/^[0-9a-f-]{36}$/i.test(input.idempotencyKey)) throw new Error("COST_INPUT_INVALID");
  const { db, schoolId } = await schoolScope();
  const previous = (await db.select().from(transportCosts).where(and(eq(transportCosts.schoolId, schoolId), eq(transportCosts.idempotencyKey, input.idempotencyKey))).limit(1))[0];
  if (previous) {
    if (previous.vehicleId !== input.vehicleId || previous.costType !== input.costType || dateString(previous.costDate) !== input.costDate || safeNumber(previous.amount) !== amount || previous.description !== description || dateString(previous.nextDueOn) !== String(input.nextDueOn ?? "")) throw new Error("COST_REQUEST_KEY_REUSED");
    return { ok: true, id: previous.id, expenditureId: previous.ledgerExpenditureId, idempotent: true };
  }
  const vehicle = (await db.select().from(transportVehicles).where(and(eq(transportVehicles.id, input.vehicleId), eq(transportVehicles.schoolId, schoolId))).limit(1))[0];
  if (!vehicle) throw new Error("VEHICLE_NOT_FOUND");
  return db.transaction(async tx => {
    const expenditureId = (await tx.insert(expenditures).values({ expenditureDate: asDate(input.costDate)!, amount: String(amount), category: `Transport — ${input.costType}`, description: `${vehicle.registration}: ${description}`.slice(0, 255), responsiblePerson: "NEXUS Transport Register", createdByUserId: userId }).$returningId())[0].id;
    const costId = (await tx.insert(transportCosts).values({ schoolId, vehicleId: input.vehicleId, costType: input.costType, costDate: asDate(input.costDate)!, amount: String(amount), idempotencyKey: input.idempotencyKey, description, nextDueOn: asDate(input.nextDueOn), ledgerExpenditureId: Number(expenditureId), createdByUserId: userId }).$returningId())[0].id;
    await tx.insert(auditLogs).values({ userId, action: "transport.cost.record", entityType: "transport_cost", entityId: String(costId), metadata: JSON.stringify({ expenditureId: Number(expenditureId), vehicleId: input.vehicleId, amount, costType: input.costType }) });
    return { ok: true, id: costId, expenditureId: Number(expenditureId) };
  });
}

export async function getTransportLearnerOptions(userId: number, role: string) {
  await demand(userId, role, "transport.manage");
  const { db } = await schoolScope();
  const learnerRows = await db.select({ id: learners.id, fullName: learners.fullName, admissionNumber: learners.admissionNumber, guardianName: learners.guardianName }).from(learners).where(eq(learners.status, "active")).orderBy(learners.fullName);
  const guardianRows = learnerRows.length ? await db.select({ learnerId: learnerGuardians.learnerId, id: guardians.id, fullName: guardians.fullName, phone: guardians.phone }).from(learnerGuardians).innerJoin(guardians, eq(guardians.id, learnerGuardians.guardianId)).where(inArray(learnerGuardians.learnerId, learnerRows.map(row => row.id))) : [];
  const activeStaff = await db.select({ id: staffProfiles.id, displayName: staffProfiles.displayName, role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.status, "active")).orderBy(staffProfiles.displayName);
  return {
    learners: learnerRows.map(learner => ({ ...learner, guardians: guardianRows.filter(guardian => guardian.learnerId === learner.id).map(({ learnerId: _learnerId, ...guardian }) => guardian) })),
    staff: activeStaff,
  };
}


export async function recordTransportIncident(input: { vehicleId: number; routeId?: number | null; incidentDate: string; severity: "low" | "medium" | "high"; category: "breakdown" | "delay" | "safety" | "damage" | "other"; description: string }, userId: number, role: string) {
  await demand(userId, role, "transport.edit");
  const description = input.description.trim();
  if (!description || description.length > 1000) throw new Error("INCIDENT_DESCRIPTION_REQUIRED");
  const { db, schoolId } = await schoolScope();
  const vehicle = (await db.select({ id: transportVehicles.id }).from(transportVehicles).where(and(eq(transportVehicles.id, input.vehicleId), eq(transportVehicles.schoolId, schoolId))).limit(1))[0];
  if (!vehicle) throw new Error("VEHICLE_NOT_FOUND");
  if (input.routeId && !(await db.select({ id: transportRoutes.id }).from(transportRoutes).where(and(eq(transportRoutes.id, input.routeId), eq(transportRoutes.schoolId, schoolId))).limit(1))[0]) throw new Error("ROUTE_NOT_FOUND");
  const id = (await db.insert(transportIncidents).values({ schoolId, vehicleId: input.vehicleId, routeId: input.routeId ?? null, incidentDate: asDate(input.incidentDate)!, severity: input.severity, category: input.category, description, status: "open", reportedByUserId: userId }).$returningId())[0].id;
  await writeAudit(userId, "transport.incident.create", "transport_incident", id, { vehicleId: input.vehicleId, severity: input.severity, category: input.category });
  return { ok: true, id };
}

export async function resolveTransportIncident(input: { incidentId: number; resolution: string }, userId: number, role: string) {
  await demand(userId, role, "transport.manage");
  const resolution = input.resolution.trim();
  if (!resolution || resolution.length > 500) throw new Error("INCIDENT_RESOLUTION_REQUIRED");
  const { db, schoolId } = await schoolScope();
  const incident = (await db.select({ id: transportIncidents.id, status: transportIncidents.status }).from(transportIncidents).where(and(eq(transportIncidents.id, input.incidentId), eq(transportIncidents.schoolId, schoolId))).limit(1))[0];
  if (!incident) throw new Error("INCIDENT_NOT_FOUND");
  if (incident.status === "resolved") throw new Error("INCIDENT_ALREADY_RESOLVED");
  await db.update(transportIncidents).set({ status: "resolved", resolution, resolvedByUserId: userId }).where(and(eq(transportIncidents.id, input.incidentId), eq(transportIncidents.schoolId, schoolId)));
  await writeAudit(userId, "transport.incident.resolve", "transport_incident", input.incidentId, { resolution });
  return { ok: true };
}
