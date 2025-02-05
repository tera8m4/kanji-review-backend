export function calculateSrsInterval(stage: number): number {
    const baseHour = 4;
    const intervals = [
        0,          // 0: Immediately
        baseHour * 60 * 60 * 1000,          // 1: 4 hours
        baseHour * 2 * 60 * 60 * 1000,      // 2: 8 hours
        24 * 60 * 60 * 1000,                // 3: 1 day
        2 * 24 * 60 * 60 * 1000,            // 4: 2 days
        7 * 24 * 60 * 60 * 1000,            // 5: 1 week (Guru)
        2 * 7 * 24 * 60 * 60 * 1000,        // 6: 2 weeks
        1 * 30 * 24 * 60 * 60 * 1000,       // 7: 1 month
        4 * 30 * 24 * 60 * 60 * 1000,       // 8: 4 months
    ];

    return stage >= intervals.length
        ? intervals[intervals.length - 1]
        : intervals[stage];
}

export function calculateStsNextStage(stage: number, incorrectStreak: number, isCorrect: boolean): number {
    if (isCorrect) {
        return stage + 1;
    }

    const incorrectAdjustmentCount = Math.ceil(incorrectStreak / 2);
    const srsPenaltyFactor = stage >= 5 ? 2 : 1;
    const adjustment = incorrectAdjustmentCount * srsPenaltyFactor;
    return Math.max(0, stage - adjustment);
}