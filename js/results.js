let resultState = {
    currentIndex: 0,
    votesByQuestion: {},
    revealedVotesByQuestion: {},
    highlightedAnswersByQuestion: {}
};

function initResultsPage() {
    document.getElementById('showVotesBtn').addEventListener('click', toggleVoteChart);
    document.getElementById('showAnswerBtn').addEventListener('click', highlightCorrectAnswer);
    document.getElementById('nextResultBtn').addEventListener('click', nextQuestionResult);
    document.getElementById('goLeaderboardBtn').addEventListener('click', () => {
        window.location.href = 'leaderboard.html';
    });

    fetchVotesData().then(() => {
        renderResultQuestion(0);
    });
}

function fetchVotesData() {
    return db.collection('scores')
        .get()
        .then(snapshot => {
            const votes = {};

            QUIZ_QUESTIONS.forEach(q => {
                votes[q.id] = new Array(q.options.length).fill(0);
            });

            snapshot.docs.forEach(doc => {
                const data = doc.data() || {};
                const answers = Array.isArray(data.answers) ? data.answers : [];

                answers.forEach(item => {
                    if (!item || !votes[item.questionId]) return;
                    if (typeof item.selected !== 'number') return;
                    if (item.selected < 0 || item.selected >= votes[item.questionId].length) return;
                    votes[item.questionId][item.selected] += 1;
                });
            });

            resultState.votesByQuestion = votes;
        })
        .catch(err => {
            console.error('Load vote data error:', err);
            resultState.votesByQuestion = {};
        });
}

function renderResultQuestion(index) {
    if (index < 0 || index >= QUIZ_QUESTIONS.length) return;

    resultState.currentIndex = index;
    const q = QUIZ_QUESTIONS[index];

    document.getElementById('resultQuestionCounter').textContent = `Câu ${index + 1} / ${QUIZ_QUESTIONS.length}`;
    document.getElementById('resultProgressBar').style.width = ((index + 1) / QUIZ_QUESTIONS.length) * 100 + '%';
    document.getElementById('resultQuestionText').textContent = q.question;
    renderAnswerStatsRows(false);

    const isLast = index === QUIZ_QUESTIONS.length - 1;
    document.getElementById('nextResultBtn').style.display = isLast ? 'none' : 'block';
    document.getElementById('goLeaderboardBtn').style.display = isLast ? 'block' : 'none';
}

function toggleVoteChart() {
    renderAnswerStatsRows(true);
}

function renderAnswerStatsRows(withAnimation) {
    const panel = document.getElementById('resultRowsContainer');
    const q = QUIZ_QUESTIONS[resultState.currentIndex];
    const questionId = q.id;
    const counts = resultState.votesByQuestion[q.id] || new Array(q.options.length).fill(0);
    const totalVotes = counts.reduce((sum, value) => sum + value, 0);
    const shouldAnimateReveal = withAnimation;

    if (shouldAnimateReveal) {
        resultState.revealedVotesByQuestion[questionId] = true;
    }
    const isRevealed = resultState.revealedVotesByQuestion[questionId] === true;

    panel.innerHTML = '';
    const chart = document.createElement('div');
    chart.className = 'answer-stats-grid';

    q.options.forEach((option, idx) => {
        const value = counts[idx] || 0;
        const percent = totalVotes > 0 ? Math.round((value / totalVotes) * 100) : 0;
        const startAtZero = !isRevealed || shouldAnimateReveal;
        const initialWidth = startAtZero ? 0 : percent;
        const initialCount = startAtZero ? 0 : value;
        const initialPercent = startAtZero ? 0 : percent;
        const row = document.createElement('div');
        row.className = 'answer-stats-row';
        row.innerHTML = `
            <div class="option-btn result-option result-row-option" data-option-index="${idx}">
                <span class="option-letter">${String.fromCharCode(65 + idx)}</span>${escapeHtml(option)}
            </div>
            <div class="vote-chart-panel result-row-stats">
                <div class="vote-chart-bar-wrap">
                    <div class="vote-chart-bar" data-percent="${percent}" style="width:${initialWidth}%;"></div>
                </div>
                <div class="vote-chart-value" data-count="${value}" data-percent="${percent}">${initialCount} người (${initialPercent}%)</div>
            </div>
        `;
        chart.appendChild(row);
    });
    panel.appendChild(chart);

    if (resultState.highlightedAnswersByQuestion[questionId] === true) {
        applyCorrectAnswerHighlight(questionId);
    }

    if (!shouldAnimateReveal) return;

    requestAnimationFrame(() => {
        panel.querySelectorAll('.vote-chart-bar').forEach(barEl => {
            barEl.style.width = `${Number(barEl.dataset.percent || 0)}%`;
        });
    });

    animateVoteValues(panel);
}

function animateVoteValues(panel) {
    const valueEls = panel.querySelectorAll('.vote-chart-value');
    const durationMs = 700;
    const startedAt = performance.now();

    function tick(now) {
        const t = Math.min(1, (now - startedAt) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);

        valueEls.forEach(el => {
            const targetCount = Number(el.dataset.count || 0);
            const targetPercent = Number(el.dataset.percent || 0);
            const currentCount = Math.round(targetCount * eased);
            const currentPercent = Math.round(targetPercent * eased);
            el.textContent = `${currentCount} người (${currentPercent}%)`;
        });

        if (t < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

function highlightCorrectAnswer() {
    const q = QUIZ_QUESTIONS[resultState.currentIndex];
    resultState.highlightedAnswersByQuestion[q.id] = true;
    applyCorrectAnswerHighlight(q.id);
}

function applyCorrectAnswerHighlight(questionId) {
    const q = QUIZ_QUESTIONS.find(item => item.id === questionId);
    if (!q) return;
    document.querySelectorAll('.result-row-option').forEach(el => {
        const optionIndex = Number(el.dataset.optionIndex);
        el.classList.toggle('correct', optionIndex === q.correct);
    });
}

function nextQuestionResult() {
    renderResultQuestion(resultState.currentIndex + 1);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
