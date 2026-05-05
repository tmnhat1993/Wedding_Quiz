// Phiên chơi chung: epoch lưu tại Firestore meta/session, bump khi admin reset game.
// Trình duyệt lưu localStorage để không cho chơi lại cùng một epoch.

const WEDDING_QUIZ_PLAYED_KEY = 'weddingQuiz_lastPlayedEpoch';
const QUIZ_STATUS_PENDING = 'pending';
const QUIZ_STATUS_STARTED = 'started';
const QUIZ_STATUS_ENDED = 'ended';

function fetchQuizRoundEpoch() {
    return db.collection('meta').doc('session')
        .get()
        .then(snap => {
            if (!snap.exists) return 0;
            const e = snap.data().epoch;
            return typeof e === 'number' && !Number.isNaN(e) ? e : 0;
        });
}

function fetchQuizSessionMeta() {
    return db.collection('meta').doc('session')
        .get()
        .then(snap => {
            if (!snap.exists) {
                return {
                    epoch: 0,
                    gameStatus: QUIZ_STATUS_PENDING
                };
            }
            const data = snap.data() || {};
            const epoch = typeof data.epoch === 'number' && !Number.isNaN(data.epoch) ? data.epoch : 0;
            const gameStatus = normalizeQuizGameStatus(data.gameStatus);
            return { epoch, gameStatus };
        });
}

function normalizeQuizGameStatus(status) {
    if (status === QUIZ_STATUS_STARTED || status === QUIZ_STATUS_ENDED) return status;
    return QUIZ_STATUS_PENDING;
}

function onQuizSessionMetaChange(callback) {
    return db.collection('meta').doc('session').onSnapshot(
        snap => {
            const data = snap.exists ? (snap.data() || {}) : {};
            const epoch = typeof data.epoch === 'number' && !Number.isNaN(data.epoch) ? data.epoch : 0;
            const gameStatus = normalizeQuizGameStatus(data.gameStatus);
            callback({ epoch, gameStatus });
        },
        err => {
            console.error('Quiz session listener error:', err);
        }
    );
}

function weddingQuizHasPlayedCurrentRound(epoch) {
    return localStorage.getItem(WEDDING_QUIZ_PLAYED_KEY) === String(epoch);
}

function weddingQuizRememberPlayed(epoch) {
    localStorage.setItem(WEDDING_QUIZ_PLAYED_KEY, String(epoch));
}
