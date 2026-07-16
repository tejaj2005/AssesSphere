export interface SchedulingInput {
  entities: Array<{
    id: string;
    name: string;
    type: string;
    lastInspectionDate: string;
    riskScore: number;
    overdueCAPAs: number;
  }>;
  availableInspectors: number;
  planningHorizonDays: number;
}

export interface ScheduleRecommendation {
  entityId: string;
  entityName: string;
  recommendedDate: string;
  priority: number;
  frequency: string;
  rationale: string;
  assignedInspectorSlot: number;
}

export function generateSchedule(input: SchedulingInput): ScheduleRecommendation[] {
  const today = new Date();
  // An invalid/empty lastInspectionDate makes `new Date(...).getTime()` NaN, which propagates
  // into priorityA/B and makes the sort comparator return NaN — Array.prototype.sort has no
  // defined behavior for that, so a genuinely high-risk entity with a bad date could silently
  // land anywhere in the order with no error. Treat an unparsable date as "never inspected"
  // (maximally overdue) instead of letting it corrupt the whole sort.
  const daysSince = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    if (isNaN(t)) return 365;
    return Math.floor((today.getTime() - t) / 86400000);
  };

  const sorted = [...input.entities].sort((a, b) => {
    const priorityA = a.riskScore * 0.6 + (daysSince(a.lastInspectionDate) / 30) * 0.3 + a.overdueCAPAs * 0.1;
    const priorityB = b.riskScore * 0.6 + (daysSince(b.lastInspectionDate) / 30) * 0.3 + b.overdueCAPAs * 0.1;
    return priorityB - priorityA;
  });

  return sorted.map((entity, index) => {
    const daysUntilInspection = Math.max(
      1,
      Math.floor((index / sorted.length) * input.planningHorizonDays)
    );
    const inspectionDate = new Date(today);
    inspectionDate.setDate(inspectionDate.getDate() + daysUntilInspection);

    const frequency = entity.riskScore >= 75
      ? 'Monthly'
      : entity.riskScore >= 50
      ? 'Quarterly'
      : entity.riskScore >= 25
      ? 'Semi-annual'
      : 'Annual';

    return {
      entityId: entity.id,
      entityName: entity.name,
      recommendedDate: inspectionDate.toISOString().split('T')[0],
      priority: index + 1,
      frequency,
      rationale: `Risk score: ${entity.riskScore}/100. ${entity.overdueCAPAs > 0 ? `${entity.overdueCAPAs} overdue CAPA(s). ` : ''}${frequency} inspection recommended.`,
      // `index % 0` (and `% undefined`) is NaN — guard against a caller passing/omitting
      // availableInspectors instead of corrupting every recommendation's slot number.
      assignedInspectorSlot: input.availableInspectors > 0 ? (index % input.availableInspectors) + 1 : 1,
    };
  });
}
