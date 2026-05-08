// Phiên chơi chung: epoch lưu tại Firestore meta/session, bump khi admin reset game.
// Trình duyệt lưu localStorage để không cho chơi lại cùng một epoch.

const WEDDING_QUIZ_PLAYED_KEY = 'weddingQuiz_lastPlayedEpoch';
const WEDDING_QUIZ_PLAYER_TAG_KEY = 'weddingQuiz_playerTagNumber';
const WEDDING_QUIZ_PLAYER_TAG_DOC = 'playerTagCounter';
const WEDDING_QUIZ_PLAYER_TAG_START = 1000;
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

function formatWeddingQuizPlayerTag(tagNumber) {
    return `#${tagNumber}`;
}

function getStoredWeddingQuizPlayerTagNumber() {
    const raw = localStorage.getItem(WEDDING_QUIZ_PLAYER_TAG_KEY);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) return null;
    return n;
}

function getStoredWeddingQuizPlayerTag() {
    const tagNumber = getStoredWeddingQuizPlayerTagNumber();
    return tagNumber ? formatWeddingQuizPlayerTag(tagNumber) : null;
}

function fallbackWeddingQuizPlayerTag() {
    const fallback = (Date.now() % 9000) + 1000;
    localStorage.setItem(WEDDING_QUIZ_PLAYER_TAG_KEY, String(fallback));
    return formatWeddingQuizPlayerTag(fallback);
}

function ensureWeddingQuizPlayerTag() {
    const existingNumber = getStoredWeddingQuizPlayerTagNumber();
    if (existingNumber) {
        return Promise.resolve(formatWeddingQuizPlayerTag(existingNumber));
    }

    const counterRef = db.collection('meta').doc(WEDDING_QUIZ_PLAYER_TAG_DOC);
    return db.runTransaction(tx =>
        tx.get(counterRef).then(snap => {
            const data = snap.exists ? (snap.data() || {}) : {};
            const current = Number.isInteger(data.counter) ? data.counter : WEDDING_QUIZ_PLAYER_TAG_START;
            const next = current + 1;
            tx.set(counterRef, {
                counter: next,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return next;
        })
    )
        .then(nextNumber => {
            localStorage.setItem(WEDDING_QUIZ_PLAYER_TAG_KEY, String(nextNumber));
            return formatWeddingQuizPlayerTag(nextNumber);
        })
        .catch(() => fallbackWeddingQuizPlayerTag());
}
