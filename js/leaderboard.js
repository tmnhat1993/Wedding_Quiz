// ════════════════════════════════════════════════════════
//  LEADERBOARD LOGIC
// ════════════════════════════════════════════════════════

const currentPlayerName = sessionStorage.getItem('playerName') || '';
let   unsubscribe       = null;

function initLeaderboard() {
    listenToScores();
}

// ── Real-time listener ─────────────────────────────────
function listenToScores() {
    document.getElementById('loadingEl').style.display = 'block';

    unsubscribe = db.collection('scores')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            document.getElementById('loadingEl').style.display = 'none';

            const all = snapshot.docs.map(d => d.data());
            const best = getBestPerPlayer(all);
            renderLeaderboard(best);
        }, err => {
            document.getElementById('loadingEl').style.display = 'none';
            console.error('Leaderboard error:', err);
            document.getElementById('listEl').innerHTML =
                '<div class="lb-empty">⚠️ Không thể tải bảng xếp hạng.<br>Kiểm tra cấu hình Firebase.</div>';
        });
}

// ── Keep best score per player name ───────────────────
function getBestPerPlayer(all) {
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

    return Object.values(map).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.totalTime || 999) - (b.totalTime || 999);
    });
}

// ── Render ─────────────────────────────────────────────
const RANK_ICONS = ['🥇', '🥈', '🥉'];

function renderLeaderboard(sorted) {
    const listEl = document.getElementById('listEl');
    const total  = document.getElementById('totalPlayers');

    total.textContent = `${sorted.length} người chơi`;

    if (sorted.length === 0) {
        listEl.innerHTML =
            '<div class="lb-empty">Chưa có ai chơi.<br>Hãy là người đầu tiên! 🎉</div>';
        return;
    }

    listEl.innerHTML = '';

    sorted.slice(0, 20).forEach((player, i) => {
        const rank    = i + 1;
        const isMe    = currentPlayerName &&
                        player.name.trim().toLowerCase() === currentPlayerName.trim().toLowerCase();
        const badgeTxt = rank <= 3 ? RANK_ICONS[rank - 1] : rank;
        const timeStr  = player.totalTime != null ? formatTime(player.totalTime) : '—';

        const item = document.createElement('div');
        item.className = `lb-item rank-${rank}${isMe ? ' current-player' : ''}`;
        item.style.animationDelay = (i * 0.05) + 's';
        item.innerHTML = `
            <div class="rank-badge">${badgeTxt}</div>
            <div class="lb-name">${escapeHtml(player.name)}${isMe ? ' <span style="font-size:0.75rem;color:var(--rose)">(bạn)</span>' : ''}</div>
            <div class="lb-score">${player.score} <span style="font-size:0.75rem;font-weight:400">điểm</span></div>
            <div class="lb-time">${timeStr}</div>
        `;
        listEl.appendChild(item);
    });
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${String(sec).padStart(2,'0')}s` : `${s}s`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
