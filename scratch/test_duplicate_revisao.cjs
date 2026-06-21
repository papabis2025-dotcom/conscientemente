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

// 2. Simulation of syncPlannedReviewsDb with both old and new logic
function runSyncSimulation(allSess, allSchedule, allConcursos, useOldLogic = false) {
    let customReviewDays = [7, 30, 90, 15, 45];
    const expectedReviews = [];

    allConcursos.forEach(concurso => {
        (concurso.subjects || []).forEach(subject => {
            const topicsList = [{ id: 'geral', title: 'Geral / Outros' }, ...(subject.topics || [])];
            topicsList.forEach(topic => {
                const isSimuladoSession = (s) => s.isSimulado || s.activityType === 'Simulado';
                
                const isRevisaoSession = (s) => {
                    if (useOldLogic) {
                        if (!s.activityType) return false;
                        const lower = s.activityType.toLowerCase();
                        return lower.includes('revisão') || lower.includes('revisao');
                    } else {
                        // Our robust/new logic
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
                        return !!(isRevType || isRevNotes || isRevId);
                    }
                };

                const topicSessions = allSess.filter(s =>
                    s.subjectId === subject.id &&
                    (topic.id === 'geral' ? !s.topicId : s.topicId === topic.id) &&
                    !isSimuladoSession(s) &&
                    !isRevisaoSession(s)
                );

                if (topicSessions.length > 0) {
                    const sorted = [...topicSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    const latestSession = sorted[0];
                    const lastDate = new Date(latestSession.date);

                    customReviewDays.forEach((days, idx) => {
                        const plannedDate = new Date(lastDate);
                        plannedDate.setDate(plannedDate.getDate() + days);

                        const dateStr = plannedDate.toISOString().split('T')[0];
                        const reviewId = getDeterministicReviewId(subject.id, topic.id === 'geral' ? undefined : topic.id, latestSession.id, idx);

                        expectedReviews.push({
                            id: reviewId,
                            date: dateStr,
                            subjectId: subject.id,
                            topicId: topic.id === 'geral' ? undefined : topic.id,
                            activityType: 'Revisão',
                            notes: `[groupId:rev_${subject.id}_${dateStr}] Revisão automática (${days}d)`,
                            durationInMinutes: 30,
                            questionsDone: 10,
                            questionsCorrect: 8,
                            status: 'planejado'
                        });
                    });
                }
            });
        });
    });

    const expectedIds = new Set(expectedReviews.map(r => r.id));

    const reviewsToDelete = allSchedule.filter(s => 
        s.activityType === 'Revisão' && 
        s.status === 'planejado' && 
        !expectedIds.has(s.id)
    );

    const currentIds = new Set(allSchedule.map(s => s.id));
    const reviewsToCreate = expectedReviews.filter(r => !currentIds.has(r.id));
    
    let filtered = allSchedule.filter(s => !reviewsToDelete.some(rd => rd.id === s.id));
    const combined = [...filtered, ...reviewsToCreate];
    return { combined, reviewsToCreate, reviewsToDelete };
}

// 3. Test execution
async function runTests() {
    console.log('--- STARTING SIMULATION TESTS FOR REVISÃO DUPLICATION ---');

    const subjectId = 'subj-1234';
    const topicId = 'geral';
    const concurso = {
        id: 'conc-1',
        name: 'Concurso Teste',
        subjects: [{ id: subjectId, name: 'Subject Test', topics: [] }]
    };
    const concursos = [concurso];

    // Initial state: User does a regular study session (not a review)
    const initialSession = {
        id: 'session-study-1',
        subjectId: subjectId,
        topicId: undefined,
        durationInMinutes: 60,
        date: '2026-06-20T12:00:00.000Z',
        activityType: 'Questões'
    };

    // First Sync (Generates planned reviews)
    console.log('\n1. Running initial sync (regular study registered)...');
    const step1 = runSyncSimulation([initialSession], [], concursos);
    console.log(`   Generated expected planned reviews: ${step1.reviewsToCreate.length}`);
    const plannedReview = step1.reviewsToCreate[0];
    console.log(`   Planned Review ID: ${plannedReview.id}, Date: ${plannedReview.date}`);

    // State is updated with the planned reviews
    let scheduledStudies = [...step1.combined];
    let sessions = [initialSession];

    // Simulate user toggling status to realizado
    // A new session is created with the same ID as the planned review
    const completedReviewSession = {
        id: plannedReview.id,
        subjectId: plannedReview.subjectId,
        topicId: plannedReview.topicId,
        durationInMinutes: plannedReview.durationInMinutes,
        date: new Date(`${plannedReview.date}T12:00:00`).toISOString(),
        activityType: plannedReview.activityType // 'Revisão'
    };
    
    // Status in schedule changes to realizado
    scheduledStudies = scheduledStudies.map(s => s.id === plannedReview.id ? { ...s, status: 'realizado' } : s);
    sessions = [...sessions, completedReviewSession];

    console.log('\n2. Simulating sync after completing the review...');

    // Scenario A: Using the OLD logic (where s.activityType is undefined/null in DB or state)
    // We simulate s.activityType being undefined to show the bug
    const completedReviewSessionWithoutType = { ...completedReviewSession, activityType: undefined };
    const step2Old = runSyncSimulation([initialSession, completedReviewSessionWithoutType], scheduledStudies, concursos, true);
    
    console.log('\n--- Scenario A (OLD LOGIC + activityType lost):');
    console.log(`   Expected reviews to create: ${step2Old.reviewsToCreate.length}`);
    const duplicatesOld = step2Old.reviewsToCreate.filter(r => r.id !== plannedReview.id);
    console.log(`   New planned reviews generated (duplicates): ${duplicatesOld.length}`);
    if (duplicatesOld.length > 0) {
        console.log(`   ❌ Bug Reproduced! Duplicate review ID generated: ${duplicatesOld[0].id}`);
    }

    // Scenario B: Using our robust NEW logic
    // Even if activityType is lost/undefined, it checks matching ID from allSchedule
    const step2New = runSyncSimulation([initialSession, completedReviewSessionWithoutType], scheduledStudies, concursos, false);
    
    console.log('\n--- Scenario B (NEW/ROBUST LOGIC + activityType lost):');
    console.log(`   Expected reviews to create: ${step2New.reviewsToCreate.length}`);
    const duplicatesNew = step2New.reviewsToCreate.filter(r => r.id !== plannedReview.id);
    console.log(`   New planned reviews generated (duplicates): ${duplicatesNew.length}`);
    
    assert.strictEqual(duplicatesNew.length, 0, 'Should not create any duplicate planned reviews');
    console.log('   ✅ Fix Verified! No duplicate reviews generated.');

    console.log('\n========================================');
    console.log(' ALL SIMULATION TESTS PASSED SUCCESSFULLY! ✅');
    console.log('========================================\n');
}

runTests().catch(e => {
    console.error('Test failed:', e);
    process.exit(1);
});
