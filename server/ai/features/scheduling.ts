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

  const sorted = [...input.entities].sort((a, b) => {
    const daysSinceA = Math.floor(
      (today.getTime() - new Date(a.lastInspectionDate).getTime()) / 86400000
    );
    const daysSinceB = Math.floor(
      (today.getTime() - new Date(b.lastInspectionDate).getTime()) / 86400000
    );
    const priorityA = a.riskScore * 0.6 + (daysSinceA / 30) * 0.3 + a.overdueCAPAs * 0.1;
    const priorityB = b.riskScore * 0.6 + (daysSinceB / 30) * 0.3 + b.overdueCAPAs * 0.1;
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
      assignedInspectorSlot: (index % input.availableInspectors) + 1,
    };
  });
}
