/*global chrome, gsStorage, gsSession, getFixture, assertTrue, FIXTURE_CURRENT_SESSIONS */
var testSuites = typeof testSuites === 'undefined' ? [] : testSuites;
testSuites.push(
  (function() {
    'use strict';

    const tests = [
      // Test trim currentSessions
      async () => {
        // Simulate adding 10 older sessions in DB_CURRENT_SESSIONS
        for (let i = 10; i > 0; i--) {
          const oldSession = await getFixture(FIXTURE_CURRENT_SESSIONS, 'currentSession1');
          delete oldSession.id;
          oldSession.sessionId = i + '';
          const previousDateInMs = Date.now() - 1000 * 60 * 60 * i;
          oldSession.date = new Date(previousDateInMs).toISOString();
          await gsStorage.updateSession(oldSession);
        }

        // Add a current session
        const currentSessionId = gsSession.getSessionId();
        const session1 = await getFixture(FIXTURE_CURRENT_SESSIONS, 'currentSession1');
        delete session1.id;
        session1.sessionId = currentSessionId;
        session1.date = new Date().toISOString();
        await gsStorage.updateSession(session1);

        const currentSessionsBefore = await gsStorage.fetchCurrentSessions();
        const areCurrentSessionsBeforeValid =
          currentSessionsBefore.length === 11;

        const lastSessionBefore = await gsStorage.fetchLastSession();
        const isLastSessionBeforeValid = lastSessionBefore.sessionId === '1';

        await gsStorage.trimDbItems();

        // Ensure current session still exists
        const currentSession = await gsStorage.fetchSessionBySessionId(
          currentSessionId
        );
        const isCurrentSessionValid = currentSession !== null;

        // Ensure correct DB_CURRENT_SESSIONS items were trimmed
        const currentSessionsAfter = await gsStorage.fetchCurrentSessions();
        const areCurrentSessionsAfterValid = currentSessionsAfter.length === 5;

        // Ensure fetchLastSession returns correct session
        const lastSessionAfter = await gsStorage.fetchLastSession();
        const isLastSessionAfterValid = lastSessionAfter.sessionId === '1';

        return assertTrue(
          areCurrentSessionsBeforeValid &&
            isLastSessionBeforeValid &&
            isCurrentSessionValid &&
            areCurrentSessionsAfterValid &&
            isLastSessionAfterValid
        );
      },
    ];

    return {
      name: 'Trim Db Items',
      tests,
    };
  })()
);