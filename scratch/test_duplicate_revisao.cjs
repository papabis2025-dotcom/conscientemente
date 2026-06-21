const assert = require('assert');

// 1. Helper to generate deterministic review IDs
const getDeterministicReviewId = (subId, topicId, lastSessId, idx) => {
    const cleanSub = subId.replace(/-/g, '').padEnd(32, '0');
    const cleanTopic = (topicId || 'geral').replace(/-/g, '').padEnd(32, '0');
    const cleanSess = lastSessId.replace(/-/g, '').padEnd(32, '0');
    
    const part1 = cleanSub.substring(0, 8);
    const part2 = cleanTopic.substring(8, 12);
    const part3 = cleanSess.substring(12, 16);
    const part4 = `400${idx}`;
    const part5 = cleanSess.substring(16, 28);
    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
};

// 2. Simulation of isRevisaoSession logic
function testIsRevisaoSession(s, allSchedule, useNewLogic = true) {
    if (!useNewLogic) {
        if (!s.activityType) return false;
        const lower = s.activityType.toLowerCase();
        return lower.includes('revisão') || lower.includes('revisao');
    } else {
        const isRevType = s.activityType && (
            s.activityType.toLowerCase().includes('revisão') || 
            s.activityType.toLowerCase().includes('revisao')
        );
        const isRevNotes = s.notes && (
            s.notes.toLowerCase().includes('revisão') || 
            s.notes.toLowerCase().includes('revisao')
        );
        const isRevId = allSchedule.some(sched => 
            sched.id === s.id && 
            sched.activityType && 
            (sched.activityType.toLowerCase().includes('revisão') || 
             sched.activityType.toLowerCase().includes('revisao'))
        );
        const isDeterministic = s.id && s.id.split('-')[3]?.startsWith('400');
        return !!(isRevType || isRevNotes || isRevId || isDeterministic);
    }
}

// 3. Test execution
async function runTests() {
    console.log('--- RUNNING ISREVISAO_SESSION LOGIC VERIFICATION ---');

    const subjectId = 'subj-1234';
    const lastSessId = 'session-study-day9';
    const reviewId = getDeterministicReviewId(subjectId, undefined, lastSessId, 0);

    // Simulated completed review session from DB where activityType is lost/null
    const completedReviewSession = {
        id: reviewId,
        subjectId: subjectId,
        topicId: undefined,
        durationInMinutes: 30,
        date: '2026-06-16T12:00:00.000Z',
        activityType: undefined // Simulate null column in DB
    };

    // Case 1: Old Logic
    const isRevOld = testIsRevisaoSession(completedReviewSession, [], false);
    console.log(`   Old Logic result: ${isRevOld} (expected: false)`);
    assert.strictEqual(isRevOld, false);

    // Case 2: New Logic (deterministic UUID check)
    const isRevNew = testIsRevisaoSession(completedReviewSession, [], true);
    console.log(`   New Logic result: ${isRevNew} (expected: true)`);
    assert.strictEqual(isRevNew, true);

    console.log('\n========================================');
    console.log(' LOGIC VERIFICATION PASSED SUCCESSFULLY! ✅');
    console.log('========================================\n');
}

runTests().catch(e => {
    console.error('Test failed:', e);
    process.exit(1);
});
