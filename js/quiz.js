// ════════════════════════════════════════════════════════
//  QUIZ LOGIC
// ════════════════════════════════════════════════════════

const TIME_PER_QUESTION_SEC = 10;
const TIME_PER_QUESTION_MS  = TIME_PER_QUESTION_SEC * 1000;
// Đúng: điểm cao, phần thưởng tốc độ tính theo ms còn lại (phân hóa fine-grained)
const CORRECT_BASE     = 4000;
const CORRECT_SPEED_MAX = 6000; // max ~10k/câu đúng
const WRONG_POINTS     = 18;    // sai: cực thấp so với đúng (max ~180 nếu sai hết)

let state = {
    playerName:        '',
    roundEpoch:        0,
    currentIndex:      0,
    score:             0,
    totalTimeMs:       0,
    correctCount:      0,
    answers:           [],
    timerInterval:     null,
    questionStartMs:   0,
    pendingSelection:  null,
    questionCommitted: false
};

// ── Init ───────────────────────────────────────────────
function initQuiz() {
    bindNextQuestionButton();

    const savedName = sessionStorage.getItem('playerName');
    state.playerName = savedName || 'bạn';

    function beginOrRedirect(gameStatus) {
        const isEnded = gameStatus === QUIZ_STATUS_ENDED;
        if (isEnded || weddingQuizHasPlayedCurrentRound(state.roundEpoch)) {
            showFinalScreenOnly();
            return;
        }
        if (!savedName) {
            window.location.href = 'index.html';
            return;
        }
        document.getElementById('playerNameDisplay').textContent = state.playerName;
        showQuestion(0);
    }

    const rawEpoch = sessionStorage.getItem('quizRoundEpoch');
    const rawStatus = sessionStorage.getItem('quizGameStatus');
    if (rawEpoch !== null && rawEpoch !== '' && rawStatus) {
        state.roundEpoch = Number(rawEpoch);
        beginOrRedirect(normalizeQuizGameStatus(rawStatus));
        return;
    }

    fetchQuizSessionMeta()
        .then(meta => {
            sessionStorage.setItem('quizRoundEpoch', String(meta.epoch));
            sessionStorage.setItem('quizGameStatus', meta.gameStatus);
            state.roundEpoch = meta.epoch;
            beginOrRedirect(meta.gameStatus);
        })
        .catch(() => {
            window.location.href = 'index.html';
        });
}

function bindNextQuestionButton() {
    const btn = document.getElementById('nextQuestionBtn');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', confirmAnswerAndNext);
}

function showFinalScreenOnly() {
    clearInterval(state.timerInterval);
    document.getElementById('quizInProgress').style.display = 'none';
    const result = document.getElementById('resultScreen');
    result.style.display = 'block';
    const nameEl = document.getElementById('resultName');
    if (nameEl) nameEl.textContent = state.playerName;
}

// ── Show question ──────────────────────────────────────
function showQuestion(index) {
    if (index >= QUIZ_QUESTIONS.length) {
        endQuiz();
        return;
    }

    state.currentIndex      = index;
    state.pendingSelection  = null;
    state.questionCommitted = false;

    const q = QUIZ_QUESTIONS[index];

    const nextBtn = document.getElementById('nextQuestionBtn');
    if (nextBtn) {
        nextBtn.disabled = true;
        const isLast = index === QUIZ_QUESTIONS.length - 1;
        nextBtn.innerHTML = isLast
            ? '<i class="bi bi-check-circle me-2"></i>Hoàn thành'
            : '<i class="bi bi-arrow-right-circle me-2"></i>Câu tiếp theo';
    }

    const pct = (index / QUIZ_QUESTIONS.length) * 100;
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('questionCounter').textContent =
        `Câu ${index + 1} / ${QUIZ_QUESTIONS.length}`;

    const wrap = document.getElementById('optionsContainer');
    wrap.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML =
            `<span class="option-letter">${String.fromCharCode(65 + i)}</span>${opt}`;
        btn.addEventListener('click', () => selectAnswer(i));
        wrap.appendChild(btn);
    });

    const qEl = document.getElementById('questionText');
    qEl.classList.remove('fade-in');
    void qEl.offsetWidth;
    qEl.textContent = q.question;
    qEl.classList.add('fade-in');

    startTimer();
}

// ── Timer (đếm theo ms → hiển thị 1 số thập phân) ───────
function startTimer() {
    clearInterval(state.timerInterval);
    state.questionStartMs = Date.now();
    updateTimerDisplay();

    state.timerInterval = setInterval(() => {
        const elapsed = Date.now() - state.questionStartMs;
        const remainingMs = Math.max(0, TIME_PER_QUESTION_MS - elapsed);
        updateTimerDisplay(remainingMs);
        if (remainingMs <= 0) {
            clearInterval(state.timerInterval);
            if (!state.questionCommitted) {
                handleTimeout();
            }
        }
    }, 50);
}

function updateTimerDisplay(remainingMs) {
    const rem = remainingMs != null
        ? remainingMs
        : Math.max(0, TIME_PER_QUESTION_MS - (Date.now() - state.questionStartMs));
    const tSec = rem / 1000;
    const pct = (rem / TIME_PER_QUESTION_MS) * 100;

    const numEl  = document.getElementById('timerNumber');
    const barEl  = document.getElementById('timerBar');

    numEl.textContent = tSec.toFixed(1);
    numEl.className   = 'timer-number' +
        (tSec <= 3 ? ' danger' : tSec <= 6 ? ' warning' : '');

    barEl.style.width = pct + '%';
    barEl.className   = 'timer-bar-fill' +
        (tSec <= 3 ? ' danger' : tSec <= 6 ? ' warning' : '');
}

// ── Select answer (chỉ chọn / đổi ý, chưa chốt điểm) ───
function selectAnswer(selectedIndex) {
    if (state.questionCommitted) return;

    state.pendingSelection = selectedIndex;
    document.querySelectorAll('.option-btn').forEach((btn, i) => {
        btn.classList.toggle('selected', i === selectedIndex);
    });

    const nextBtn = document.getElementById('nextQuestionBtn');
    if (nextBtn) nextBtn.disabled = false;
}

function confirmAnswerAndNext() {
    if (state.questionCommitted || state.pendingSelection === null) return;

    state.questionCommitted = true;
    clearInterval(state.timerInterval);

    const elapsedMs = Math.min(
        TIME_PER_QUESTION_MS,
        Date.now() - state.questionStartMs
    );
    const remainingMs = Math.max(0, TIME_PER_QUESTION_MS - elapsedMs);
    const selectedIndex = state.pendingSelection;

    pushAnswerRecord(selectedIndex, elapsedMs, remainingMs);

    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;
    });
    const nextBtn = document.getElementById('nextQuestionBtn');
    if (nextBtn) nextBtn.disabled = true;

    hideFeedback();
    showQuestion(state.currentIndex + 1);
}

/**
 * remainingMs dùng cho bonus tốc độ (đúng). Sai / không chọn: không dùng bonus.
 */
function pushAnswerRecord(selectedIndex, elapsedMs, remainingMsForBonus) {
    state.totalTimeMs += elapsedMs;

    const q = QUIZ_QUESTIONS[state.currentIndex];
    const timeTakenSec = Math.round(elapsedMs) / 1000;

    const isNoAnswer = selectedIndex < 0;
    const isCorrect  = !isNoAnswer && selectedIndex === q.correct;

    let points = 0;
    if (isNoAnswer) {
        points = 0;
    } else if (isCorrect) {
        points = CORRECT_BASE + Math.floor(
            CORRECT_SPEED_MAX * remainingMsForBonus / TIME_PER_QUESTION_MS
        );
        state.correctCount += 1;
    } else {
        points = WRONG_POINTS;
    }

    state.score += points;

    state.answers.push({
        questionId: q.id,
        selected:   selectedIndex,
        correct:    q.correct,
        isCorrect,
        timeTaken:  timeTakenSec,
        points
    });
}

// ── Timeout ────────────────────────────────────────────
function handleTimeout() {
    if (state.questionCommitted) return;
    state.questionCommitted = true;
    clearInterval(state.timerInterval);

    const q = QUIZ_QUESTIONS[state.currentIndex];
    const hadSelection = state.pendingSelection !== null;
    const selectedIndex = hadSelection ? state.pendingSelection : -1;

    const elapsedMs = TIME_PER_QUESTION_MS;
    const remainingMs = 0;

    if (hadSelection) {
        pushAnswerRecord(selectedIndex, elapsedMs, remainingMs);
    } else {
        state.totalTimeMs += elapsedMs;
        state.answers.push({
            questionId: q.id,
            selected:   -1,
            correct:    q.correct,
            isCorrect:  false,
            timeTaken:  TIME_PER_QUESTION_SEC,
            points:     0
        });
    }

    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;
    });
    const nextBtn = document.getElementById('nextQuestionBtn');
    if (nextBtn) nextBtn.disabled = true;

    showStepFeedback(!hadSelection);

    setTimeout(() => {
        hideFeedback();
        showQuestion(state.currentIndex + 1);
    }, hadSelection ? 1200 : 1800);
}

// ── Feedback toast ─────────────────────────────────────
function showStepFeedback(isTimeout) {
    const toast = document.getElementById('feedbackToast');
    const icon  = isTimeout ? '⏰' : '💒';
    const title = isTimeout ? 'Hết thời gian câu này' : 'Cảm ơn bạn!';
    const text  = isTimeout
        ? 'Chúng ta chuyển sang câu hỏi tiếp theo.'
        : 'Chúng tôi đã ghi nhận câu trả lời của bạn.';

    toast.className = 'feedback-toast neutral-fb';
    toast.innerHTML = `
        <div class="feedback-icon">${icon}</div>
        <div class="feedback-title">${title}</div>
        <div class="feedback-text">${text}</div>
    `;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });
}

function hideFeedback() {
    document.getElementById('feedbackToast').classList.remove('show');
}

// ── End quiz ───────────────────────────────────────────
function endQuiz() {
    clearInterval(state.timerInterval);

    document.getElementById('quizInProgress').style.display = 'none';
    const result = document.getElementById('resultScreen');
    result.style.display = 'block';

    const nameEl = document.getElementById('resultName');
    if (nameEl) nameEl.textContent = state.playerName;

    weddingQuizRememberPlayed(state.roundEpoch);
    saveScore();
}

// ── Save to Firebase ───────────────────────────────────
function saveScore() {
    const totalTimeSec = state.totalTimeMs / 1000;
    const data = {
        name:           state.playerName,
        score:          state.score,
        totalTime:      Math.round(totalTimeSec * 1000) / 1000,
        correctAnswers: state.correctCount,
        answers:        state.answers,
        timestamp:      firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('scores').add(data)
        .then(docRef => {
            sessionStorage.setItem('lastScoreId', docRef.id);
        })
        .catch(err => console.error('Firebase save error:', err));
}
