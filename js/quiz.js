// ════════════════════════════════════════════════════════
//  QUIZ LOGIC
// ════════════════════════════════════════════════════════

const TIME_PER_QUESTION = 30;
const POINTS_BASE       = 1000; // điểm cố định nếu trả lời đúng
const POINTS_SPEED_MAX  = 1000; // bonus tốc độ tối đa (trả lời ngay = +1000, chậm dần về 0)
// Tổng tối đa: (1000 + 1000) × 10 = 20,000 điểm

let state = {
    playerName:      '',
    roundEpoch:      0,
    currentIndex:    0,
    score:           0,
    totalTime:       0,
    correctCount:    0,
    answers:         [],
    timerInterval:   null,
    timeRemaining:   TIME_PER_QUESTION,
    questionStartMs: 0,
    answered:        false
};

// ── Init ───────────────────────────────────────────────
function initQuiz() {
    state.playerName = sessionStorage.getItem('playerName');
    if (!state.playerName) {
        window.location.href = 'index.html';
        return;
    }

    function beginOrRedirect() {
        if (weddingQuizHasPlayedCurrentRound(state.roundEpoch)) {
            window.location.href = 'index.html';
            return;
        }
        document.getElementById('playerNameDisplay').textContent = state.playerName;
        showQuestion(0);
    }

    const rawEpoch = sessionStorage.getItem('quizRoundEpoch');
    if (rawEpoch !== null && rawEpoch !== '') {
        state.roundEpoch = Number(rawEpoch);
        beginOrRedirect();
        return;
    }

    fetchQuizRoundEpoch()
        .then(epoch => {
            sessionStorage.setItem('quizRoundEpoch', String(epoch));
            state.roundEpoch = epoch;
            beginOrRedirect();
        })
        .catch(() => {
            window.location.href = 'index.html';
        });
}

// ── Show question ──────────────────────────────────────
function showQuestion(index) {
    if (index >= QUIZ_QUESTIONS.length) {
        endQuiz();
        return;
    }

    state.currentIndex  = index;
    state.answered      = false;
    state.timeRemaining = TIME_PER_QUESTION;

    const q = QUIZ_QUESTIONS[index];

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

// ── Select answer ──────────────────────────────────────
function selectAnswer(selectedIndex) {
    if (state.answered) return;
    state.answered = true;
    clearInterval(state.timerInterval);

    const timeTaken = Math.min(
        TIME_PER_QUESTION,
        Math.round((Date.now() - state.questionStartMs) / 1000)
    );
    state.totalTime += timeTaken;

    const q         = QUIZ_QUESTIONS[state.currentIndex];
    const isCorrect = selectedIndex === q.correct;
    let   points    = 0;

    if (isCorrect) {
        const speedBonus = Math.round((state.timeRemaining / TIME_PER_QUESTION) * POINTS_SPEED_MAX);
        points = POINTS_BASE + speedBonus;
        state.score        += points;
        state.correctCount += 1;
    }

    state.answers.push({
        questionId: q.id,
        selected:   selectedIndex,
        correct:    q.correct,
        isCorrect,
        timeTaken,
        points
    });

    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
    });

    showStepFeedback(false);

    setTimeout(() => {
        hideFeedback();
        showQuestion(state.currentIndex + 1);
    }, 2200);
}

// ── Timeout ────────────────────────────────────────────
function handleTimeout() {
    if (state.answered) return;
    state.answered = true;

    state.totalTime += TIME_PER_QUESTION;

    const q = QUIZ_QUESTIONS[state.currentIndex];
    state.answers.push({
        questionId: q.id,
        selected:   -1,
        correct:    q.correct,
        isCorrect:  false,
        timeTaken:  TIME_PER_QUESTION,
        points:     0
    });

    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
    });

    showStepFeedback(true);

    setTimeout(() => {
        hideFeedback();
        showQuestion(state.currentIndex + 1);
    }, 2200);
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

