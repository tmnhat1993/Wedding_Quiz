// Phiên chơi chung: epoch lưu tại Firestore meta/session, bump khi admin reset game.
// Trình duyệt lưu localStorage để không cho chơi lại cùng một epoch.

const WEDDING_QUIZ_PLAYED_KEY = 'weddingQuiz_lastPlayedEpoch';

function fetchQuizRoundEpoch() {
    return db.collection('meta').doc('session')
        .get()
        .then(snap => {
            if (!snap.exists) return 0;
            const e = snap.data().epoch;
            return typeof e === 'number' && !Number.isNaN(e) ? e : 0;
        });
}

function weddingQuizHasPlayedCurrentRound(epoch) {
    return localStorage.getItem(WEDDING_QUIZ_PLAYED_KEY) === String(epoch);
}

function weddingQuizRememberPlayed(epoch) {
    localStorage.setItem(WEDDING_QUIZ_PLAYED_KEY, String(epoch));
}
