export type TimetableDraftEntry = {
  sourceId?: number;
  gradeId: number;
  subjectId: number;
  teacherUserId: number;
  dayOfWeek: number;
  period: number;
  room: string | null;
  isForcePlaced: boolean;
};

export function swapTimetableDraftEntries(
  current: Record<string, TimetableDraftEntry>,
  sourceKey: string,
  targetKey: string,
  targetGradeId: number,
  targetDay: number,
  targetPeriod: number,
): Record<string, TimetableDraftEntry> {
  if (sourceKey === targetKey || !current[sourceKey]) return current;
  const source = current[sourceKey];
  const target = current[targetKey];
  const next = { ...current };
  delete next[sourceKey];
  delete next[targetKey];
  next[targetKey] = { ...source, gradeId: targetGradeId, dayOfWeek: targetDay, period: targetPeriod };
  if (target) next[sourceKey] = { ...target, dayOfWeek: source.dayOfWeek, period: source.period };
  return next;
}
