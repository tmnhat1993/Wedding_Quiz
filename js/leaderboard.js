// ════════════════════════════════════════════════════════
//  LEADERBOARD LOGIC
// ════════════════════════════════════════════════════════

const currentPlayerName = sessionStorage.getItem('playerName') || '';
const currentPlayerTag  = sessionStorage.getItem('playerTag') || '';
const POLL_INTERVAL_MS  = 15000;
const LEADERBOARD_TOP_N = 10;
let   pollTimer         = null;

function initLeaderboard() {
    fetchScores();
    pollTimer = setInterval(fetchScores, POLL_INTERVAL_MS);
}

function fetchScores() {
    db.collection('scores')
        .orderBy('timestamp', 'desc')
        .get()
        .then(snapshot => {
            const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const best = getBestPerPlayer(all);
            renderLeaderboard(best);
        })
        .catch(err => {
            console.error('Leaderboard error:', err);
            const msg =
                '<div class="lb-empty">⚠️ Không thể tải bảng xếp hạng.<br>Kiểm tra cấu hình Firebase.</div>';
            const listEl = document.getElementById('listEl');
            if (listEl) listEl.innerHTML = msg;
        });
}

// ── Keep best score per player (by tag if available) ─
function getBestPerPlayer(all) {
    const map = {};
    all.forEach(s => {
        const key = s.playerTag || (s.name ? s.name.trim().toLowerCase() : `doc:${s.id}`);
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

    const shown = sorted.slice(0, LEADERBOARD_TOP_N);
    total.textContent = `Top ${LEADERBOARD_TOP_N} · ${sorted.length} người tham gia`;

    if (sorted.length === 0) {
        listEl.innerHTML =
            '<div class="lb-empty">Chưa có ai chơi.<br>Hãy là người đầu tiên! 🎉</div>';
        return;
    }

    listEl.innerHTML = '';

    shown.forEach((player, i) => {
        const rank    = i + 1;
        const hasName = typeof player.name === 'string' && player.name.trim() !== '';
        const playerName = hasName ? player.name.trim() : 'Người chơi';
        const playerTag = formatPlayerTag(player);
        const isMe = currentPlayerTag
            ? playerTag === currentPlayerTag
            : (currentPlayerName &&
                playerName.toLowerCase() === currentPlayerName.trim().toLowerCase());
        const badgeTxt = rank <= 3 ? RANK_ICONS[rank - 1] : rank;
        const timeStr  = player.totalTime != null ? formatTimeSeconds(player.totalTime) : '—';

        const item = document.createElement('div');
        item.className = `lb-item rank-${rank}${isMe ? ' current-player' : ''}`;
        item.style.animationDelay = (i * 0.05) + 's';
        item.innerHTML = `
            <div class="rank-badge">${badgeTxt}</div>
            <div class="lb-name">${escapeHtml(playerName)} <span class="lb-player-tag">${escapeHtml(playerTag)}</span>${isMe ? ' <span class="lb-you-tag">(bạn)</span>' : ''}</div>
            <div class="lb-score">${formatScoreDisplay(player.score)} <span class="lb-unit">điểm</span></div>
            <div class="lb-time">${timeStr}</div>
        `;
        listEl.appendChild(item);
    });
}

function formatPlayerTag(player) {
    if (player.playerTag) return player.playerTag;
    if (!player.id) return '#----';
    return `#${String(player.id).slice(0, 4).toUpperCase()}`;
}

function formatTimeSeconds(s) {
    if (s == null || Number.isNaN(s)) return '—';
    const m = Math.floor(s / 60);
    const sec = s - m * 60;
    if (m > 0) {
        return `${m}m ${String(Math.floor(sec)).padStart(2, '0')}s`;
    }
    return `${sec.toFixed(2)}s`;
}

function formatScoreDisplay(score) {
    if (score == null) return '0';
    const n = Number(score);
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
