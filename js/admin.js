let adminDocs = [];
let resetModal = null;
let sessionUnsub = null;
let currentSessionMeta = { epoch: 0, gameStatus: QUIZ_STATUS_PENDING };

function initAdminPanel() {
    const modalEl = document.getElementById('confirmResetModal');
    resetModal = new bootstrap.Modal(modalEl);

    document.getElementById('startGameBtn').addEventListener('click', () => setGameStatus(QUIZ_STATUS_STARTED));
    document.getElementById('endGameBtn').addEventListener('click', () => setGameStatus(QUIZ_STATUS_ENDED));
    document.getElementById('resetGameBtn').addEventListener('click', () => resetModal.show());
    document.getElementById('confirmResetBtn').addEventListener('click', resetGame);

    sessionUnsub = onQuizSessionMetaChange(meta => {
        currentSessionMeta = meta;
        renderGameStatus(meta.gameStatus, meta.epoch);
    });

    loadPlayers();
}

function loadPlayers() {
    showLoading(true);

    db.collection('scores')
        .orderBy('timestamp', 'desc')
        .get()
        .then(snapshot => {
            adminDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderPlayers(adminDocs);
            showLoading(false);
        })
        .catch(err => {
            console.error('Admin load error:', err);
            showLoading(false);
            document.getElementById('adminStats').textContent =
                'Khong the tai du lieu. Kiem tra quyen Firestore.';
            document.getElementById('adminEmpty').style.display = 'block';
            document.getElementById('adminEmpty').textContent =
                'Khong the tai danh sach. Vui long kiem tra cau hinh Firebase.';
        });
}

function renderPlayers(players) {
    const tbody = document.getElementById('playersTbody');
    const stats = document.getElementById('adminStats');
    const empty = document.getElementById('adminEmpty');
    const table = document.getElementById('playersTable');

    stats.textContent = `Tong luot choi: ${players.length} · Epoch: ${currentSessionMeta.epoch}`;
    tbody.innerHTML = '';

    if (players.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    table.style.display = 'table';

    players.forEach(player => {
        const tr = document.createElement('tr');
        const answersSummary = formatAnswersSummary(player.answers);
        const timeStr = player.totalTime != null ? `${player.totalTime}s` : '—';
        const correctStr = player.correctAnswers != null ? `${player.correctAnswers}/10` : '—';
        const scoreStr = Number(player.score || 0).toLocaleString();
        const playedAt = formatTimestamp(player.timestamp);

        tr.innerHTML = `
            <td><strong>${escapeHtml(player.name || 'Khong ro')}</strong></td>
            <td>${scoreStr}</td>
            <td>${correctStr}</td>
            <td>${timeStr}</td>
            <td style="max-width:360px;font-size:0.82rem;color:#666;">${escapeHtml(answersSummary)}</td>
            <td style="white-space:nowrap;">${playedAt}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" data-id="${player.id}">
                    <i class="bi bi-x-circle me-1"></i>Xoa
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', () => deletePlayer(btn.dataset.id));
    });
}

function renderGameStatus(status, epoch) {
    const statusEl = document.getElementById('adminGameStatus');
    const startBtn = document.getElementById('startGameBtn');
    const endBtn = document.getElementById('endGameBtn');

    if (status === QUIZ_STATUS_STARTED) {
        statusEl.textContent = `Trạng thái: ĐANG MỞ GAME (epoch ${epoch})`;
        startBtn.style.display = 'none';
        endBtn.style.display = 'inline-block';
        return;
    }

    if (status === QUIZ_STATUS_ENDED) {
        statusEl.textContent = `Trạng thái: ĐÃ KẾT THÚC (epoch ${epoch})`;
        startBtn.style.display = 'none';
        endBtn.style.display = 'none';
        return;
    }

    statusEl.textContent = `Trạng thái: CHƯA BẮT ĐẦU (epoch ${epoch})`;
    startBtn.style.display = 'inline-block';
    endBtn.style.display = 'none';
}

function setGameStatus(nextStatus) {
    const statusText = nextStatus === QUIZ_STATUS_STARTED ? 'mở game' : 'kết thúc game';
    db.collection('meta').doc('session').set(
        { gameStatus: nextStatus },
        { merge: true }
    )
        .catch(err => {
            console.error('Set game status error:', err);
            alert(`Khong the ${statusText}. Hay kiem tra Firestore Rules.`);
        });
}

function deletePlayer(docId) {
    if (!docId) return;
    db.collection('scores').doc(docId).delete()
        .then(() => {
            adminDocs = adminDocs.filter(item => item.id !== docId);
            renderPlayers(adminDocs);
        })
        .catch(err => {
            console.error('Delete player error:', err);
            alert('Khong the xoa nguoi choi. Hay kiem tra Firestore Rules.');
        });
}

function resetGame() {
    const confirmBtn = document.getElementById('confirmResetBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Dang xoa...';

    db.collection('scores')
        .get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            const metaRef = db.collection('meta').doc('session');
            batch.set(metaRef, {
                epoch: firebase.firestore.FieldValue.increment(1),
                gameStatus: QUIZ_STATUS_PENDING
            }, { merge: true });
            return batch.commit();
        })
        .then(() => {
            adminDocs = [];
            renderPlayers(adminDocs);
            resetModal.hide();
        })
        .catch(err => {
            console.error('Reset game error:', err);
            alert('Khong the reset game. Hay kiem tra Firestore Rules.');
        })
        .finally(() => {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Xoa tat ca';
        });
}

function formatAnswersSummary(answers) {
    if (!Array.isArray(answers) || answers.length === 0) return 'Khong co du lieu';
    return answers.map(item => {
        const qId = item.questionId != null ? `Q${item.questionId}` : 'Q?';
        const picked = item.selected != null ? item.selected + 1 : '-';
        const right = item.correct != null ? item.correct + 1 : '-';
        const mark = item.isCorrect ? 'dung' : 'sai';
        return `${qId}:${picked}/${right}(${mark})`;
    }).join(' | ');
}

function formatTimestamp(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '—';
    return timestamp.toDate().toLocaleString('vi-VN');
}

function showLoading(isLoading) {
    document.getElementById('adminLoading').style.display = isLoading ? 'block' : 'none';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
