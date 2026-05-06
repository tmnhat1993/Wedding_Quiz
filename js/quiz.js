// ════════════════════════════════════════════════════════
//  QUIZ LOGIC
// ════════════════════════════════════════════════════════

const TIME_PER_QUESTION = 30;
const POINTS_BASE       = 1000; // điểm cố định nếu trả lời đúng
const POINTS_SPEED_MAX  = 1000; // bonus tốc độ tối đa (trả lời ngay = +1000, chậm dần về 0)
// Tổng tối đa: (1000 + 1000) × 10 = 20,000 điểm

let state = {
    playerName:       '',
    roundEpoch:       0,
    currentIndex:     0,
    score:            0,
    totalTime:        0,
    correctCount:     0,
    answers:          [],
    timerInterval:    null,
    timeRemaining:    TIME_PER_QUESTION,
    questionStartMs:  0,
    pendingSelection: null,
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
    state.timeRemaining     = TIME_PER_QUESTION;

    const q = QUIZ_QUESTIONS[index];

    const nextBtn = document.getElementById('nextQuestionBtn');
    if (nextBtn) {
        nextBtn.disabled = true;
        const isLast = index === QUIZ_QUESTIONS.length - 1;
        nextBtn.innerHTML = isLast
            ? '<i class="bi bi-check-circle me-2"></i>Hoàn thành'
            : '<i class="bi bi-arrow-right-circle me-2"></i>Câu tiếp theo';
    }

    // Progress
    const pct = (index / QUIZ_QUESTIONS.length) * 100;
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('questionCounter').textContent =
        `Câu ${index + 1} / ${QUIZ_QUESTIONS.length}`;

    // Render options
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

    // Question text with fade-in
    const qEl = document.getElementById('questionText');
    qEl.classList.remove('fade-in');
    void qEl.offsetWidth;
    qEl.textContent = q.question;
    qEl.classList.add('fade-in');

    // Start timer
    startTimer();
}

// ── Timer ──────────────────────────────────────────────
function startTimer() {
    clearInterval(state.timerInterval);
    state.questionStartMs = Date.now();
    updateTimerDisplay();

    state.timerInterval = setInterval(() => {
        state.timeRemaining = Math.max(
            0,
            TIME_PER_QUESTION - Math.round((Date.now() - state.questionStartMs) / 1000)
        );
        updateTimerDisplay();
        if (state.timeRemaining <= 0) {
            clearInterval(state.timerInterval);
            if (!state.answered) handleTimeout();
        }
    }, 250);
}

function updateTimerDisplay() {
    const t   = state.timeRemaining;
    const pct = (t / TIME_PER_QUESTION) * 100;

    const numEl  = document.getElementById('timerNumber');
    const barEl  = document.getElementById('timerBar');

    numEl.textContent = t;
    numEl.className   = 'timer-number' +
        (t <= 5 ? ' danger' : t <= 10 ? ' warning' : '');

    barEl.style.width = pct + '%';
    barEl.className   = 'timer-bar-fill' +
        (t <= 5 ? ' danger' : t <= 10 ? ' warning' : '');
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

    const timeTaken = Math.min(
        TIME_PER_QUESTION,
        Math.round((Date.now() - state.questionStartMs) / 1000)
    );
    const selectedIndex = state.pendingSelection;
    const timeRemainingForBonus = state.timeRemaining;

    pushAnswerRecord(selectedIndex, timeTaken, timeRemainingForBonus);

    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;
    });
    const nextBtn = document.getElementById('nextQuestionBtn');
    if (nextBtn) nextBtn.disabled = true;

    hideFeedback();
    showQuestion(state.currentIndex + 1);
}

function pushAnswerRecord(selectedIndex, timeTaken, timeRemainingForBonus) {
    state.totalTime += timeTaken;

    const q = QUIZ_QUESTIONS[state.currentIndex];
    const isCorrect = selectedIndex === q.correct;
    let points = 0;

    if (isCorrect) {
        const speedBonus = Math.round((timeRemainingForBonus / TIME_PER_QUESTION) * POINTS_SPEED_MAX);
        points = POINTS_BASE + speedBonus;
        state.score += points;
        state.correctCount += 1;
    }

    state.answers.push({
        questionId: q.id,
        selected: selectedIndex,
        correct: q.correct,
        isCorrect,
        timeTaken,
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

    const timeTaken = TIME_PER_QUESTION;

    if (hadSelection) {
        pushAnswerRecord(selectedIndex, timeTaken, 0);
    } else {
        state.totalTime += timeTaken;
        state.answers.push({
            questionId: q.id,
            selected: -1,
            correct: q.correct,
            isCorrect: false,
            timeTaken: TIME_PER_QUESTION,
            points: 0
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

// ── Feedback toast (không tiết lộ đúng/sai cho khách) ──
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
    const data = {
        name:           state.playerName,
        score:          state.score,
        totalTime:      state.totalTime,
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

