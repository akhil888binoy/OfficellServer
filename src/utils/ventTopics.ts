export const VENT_TOPICS = ['Leadership', 'Coworkers', 'Pay', 'Workload', 'Careers', 'HR', 'Remote', 'Layoffs', 'Harassment', 'Ethics'] as const;
export const isVentTopic = (value: unknown): value is typeof VENT_TOPICS[number] => typeof value === 'string' && (VENT_TOPICS as readonly string[]).includes(value);
