// ════════════════════════════════════════════════════════
//  QUIZ LOGIC
// ════════════════════════════════════════════════════════

const TIME_PER_QUESTION = 30;
const POINTS_BASE       = 1000; // điểm cố định nếu trả lời đúng
const POINTS_SPEED_MAX  = 1000; // bonus tốc độ tối đa (trả lời ngay = +1000, chậm dần về 0)
// Tổng tối đa: (1000 + 1000) × 10 = 20,000 điểm

let state = {
    playerName:      '',
    currentIndex:    0,
    score:           0,
    totalTime:       0,
    correctCount:    0,
    answers:         [],
    timerInterval:   null,
    timeRemaining:   TIME_PER_QUESTION,
    questionStartMs: 0,
    answered:        false,
    lbUnsubscribe:   null
};

// ── Init ───────────────────────────────────────────────
function initQuiz() {
    state.playerName = sessionStorage.getItem('playerName');
    if (!state.playerName) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('playerNameDisplay').textContent = state.playerName;
    showQuestion(0);
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

    // Highlight options
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correct)                    btn.classList.add('correct');
        if (i === selectedIndex && !isCorrect)  btn.classList.add('wrong');
    });

    document.getElementById('scoreDisplay').textContent = state.score;

    showFeedback(isCorrect, q.explanation, points, false);

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
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correct) btn.classList.add('correct');
    });

    showFeedback(false, q.explanation, 0, true);

    setTimeout(() => {
        hideFeedback();
        showQuestion(state.currentIndex + 1);
    }, 2200);
}

// ── Feedback toast ─────────────────────────────────────
function showFeedback(isCorrect, explanation, points, isTimeout) {
    const toast = document.getElementById('feedbackToast');

    let icon, title, cls;
    if (isTimeout) {
        icon  = '⏰';
        title = 'Hết giờ rồi!';
        cls   = 'timeout-fb';
    } else if (isCorrect) {
        icon  = '🎉';
        title = `+${points} điểm! Chính xác!`;
        cls   = 'correct-fb';
    } else {
        icon  = '😅';
        title = 'Chưa đúng rồi!';
        cls   = 'wrong-fb';
    }

    toast.className      = `feedback-toast ${cls}`;
    toast.innerHTML      = `
        <div class="feedback-icon">${icon}</div>
        <div class="feedback-title">${title}</div>
        <div class="feedback-text">${explanation}</div>
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

    const grade = getGrade(state.score);

    document.getElementById('quizInProgress').style.display = 'none';
    const result = document.getElementById('resultScreen');
    result.style.display = 'block';

    document.getElementById('resultGrade').textContent        = grade.label;
    document.getElementById('resultGradeEmoji').textContent   = grade.emoji;
    document.getElementById('resultScore').textContent        = Number(state.score).toLocaleString();
    document.getElementById('resultCorrect').textContent      = state.correctCount;
    document.getElementById('resultTime').textContent         = formatTime(state.totalTime);

    saveScore();
    listenResultLeaderboard();
}

function getGrade(score) {
    if (score >= 16000) return { emoji: '🏆', label: 'Thiên tài tình yêu!' };
    if (score >= 11000) return { emoji: '💕', label: 'Người thân thương!' };
    if (score >=  6000) return { emoji: '🌸', label: 'Khách quý yêu mến!' };
    return                    { emoji: '😊', label: 'Người mới quen!' };
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
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

// ── Inline leaderboard on result screen ───────────────
function listenResultLeaderboard() {
    const RANK_ICONS = ['🥇', '🥈', '🥉'];

    state.lbUnsubscribe = db.collection('scores')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            const all = snapshot.docs.map(d => d.data());

            // Best score per player name
            const map = {};
            all.forEach(s => {
                const key = s.name ? s.name.trim().toLowerCase() : '?';
                const cur = map[key];
                if (!cur ||
                    s.score > cur.score ||
                    (s.score === cur.score && s.totalTime < cur.totalTime)) {
                    map[key] = s;
                }
            });

            const sorted = Object.values(map).sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return (a.totalTime || 999) - (b.totalTime || 999);
            });

            const myKey  = state.playerName.trim().toLowerCase();
            const myRank = sorted.findIndex(p => p.name.trim().toLowerCase() === myKey) + 1;

            // Show rank badge
            if (myRank > 0) {
                document.getElementById('myRankBox').style.display = 'block';
                document.getElementById('myRankNum').textContent   = '#' + myRank;
            }

            // Render list
            const listEl = document.getElementById('resultLbList');
            listEl.innerHTML = '';

            if (sorted.length === 0) {
                listEl.innerHTML = '<div class="text-center text-muted py-3" style="font-size:0.85rem;">Chưa có dữ liệu</div>';
                return;
            }

            sorted.slice(0, 10).forEach((player, i) => {
                const rank = i + 1;
                const isMe = player.name.trim().toLowerCase() === myKey;
                listEl.appendChild(makeLbRow(player, rank, isMe, RANK_ICONS));
            });

            // Show current player below separator if outside top 10
            if (myRank > 10) {
                const sep = document.createElement('div');
                sep.className   = 'lb-separator';
                sep.textContent = '···';
                listEl.appendChild(sep);
                listEl.appendChild(makeLbRow(sorted[myRank - 1], myRank, true, RANK_ICONS));
            }
        }, err => {
            console.error('Leaderboard error:', err);
            document.getElementById('resultLbList').innerHTML =
                '<div class="text-center text-muted py-3" style="font-size:0.85rem;">⚠️ Không tải được dữ liệu</div>';
        });
}

function makeLbRow(player, rank, isMe, icons) {
    const item     = document.createElement('div');
    item.className = `lb-item rank-${rank}${isMe ? ' current-player' : ''}`;
    const badge    = rank <= 3 ? icons[rank - 1] : rank;
    const timeStr  = player.totalTime != null ? formatTime(player.totalTime) : '—';
    item.innerHTML = `
        <div class="rank-badge">${badge}</div>
        <div class="lb-name">${escapeHtml(player.name)}${isMe ? ' <span style="font-size:0.7rem;color:var(--rose)">(bạn)</span>' : ''}</div>
        <div class="lb-score">${Number(player.score).toLocaleString()}</div>
        <div class="lb-time">${timeStr}</div>
    `;
    return item;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function playAgain() {
    if (state.lbUnsubscribe) state.lbUnsubscribe();
    window.location.href = 'index.html';
}
