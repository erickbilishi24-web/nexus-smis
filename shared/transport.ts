export type TransportBillingCycle = "monthly" | "termly";

export function isValidTransportPeriod(period: string) {
  return /^\d{4}-(?:(?:0[1-9]|1[0-2])|T[1-3])$/.test(period);
}

export function periodMatchesCycle(period: string, cycle: TransportBillingCycle) {
  return cycle === "monthly" ? /^\d{4}-(0[1-9]|1[0-2])$/.test(period) : /^\d{4}-T[1-3]$/.test(period);
}

export function canAssignRouteSeat(capacity: number, occupied: number) {
  return Number.isInteger(capacity) && capacity > 0 && Number.isInteger(occupied) && occupied >= 0 && occupied < capacity;
}

export function isValidOdometerTrip(startKm: number, endKm: number) {
  return Number.isFinite(startKm) && Number.isFinite(endKm) && startKm >= 0 && endKm >= startKm;
}
