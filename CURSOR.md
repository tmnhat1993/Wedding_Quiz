# Wedding Quiz — Project Context for Cursor

## Tổng quan dự án

Website quiz đám cưới dạng single-page, thuần HTML/CSS/JS tĩnh (không có build tool).
Người dùng quét QR → nhập tên → trả lời 10 câu hỏi có đếm giờ → xem điểm → leaderboard real-time.

**Không dùng framework JS nào** (React, Vue…). Chỉ dùng Bootstrap 5 + Vanilla JS + Firebase SDK qua CDN.

---

## Stack

| Layer     | Công nghệ                                      |
|-----------|------------------------------------------------|
| UI        | Bootstrap 5.3 (CDN) + Bootstrap Icons 1.11     |
| Font      | Google Fonts: Playfair Display + Nunito        |
| Database  | Firebase Firestore (compat SDK v10, CDN)       |
| Hosting   | Bất kỳ static host (Firebase Hosting, GitHub Pages, Netlify…) |
| Build     | **Không có** — mở trực tiếp file HTML          |

---

## Cấu trúc file

```
DamCuoiQuiz/
├── index.html           # Trang chào / nhập tên người chơi
├── quiz.html            # Trang chơi quiz (10 câu + timer)
├── leaderboard.html     # Bảng xếp hạng real-time
├── css/
│   └── style.css        # Toàn bộ CSS — theme màu hồng / vàng gold
└── js/
    ├── firebase-config.js   # Firebase init + db export (global)
    ├── questions.js         # Mảng QUIZ_QUESTIONS — 10 câu hỏi
    ├── quiz.js              # Logic quiz, timer, tính điểm, lưu Firebase
    └── leaderboard.js       # Real-time Firestore listener + render
```

### Thứ tự load script trong HTML

Các file HTML load script theo thứ tự sau (thứ tự này quan trọng):
```html
firebase-app-compat.js  →  firebase-firestore-compat.js
→  firebase-config.js  →  questions.js  →  quiz.js / leaderboard.js
→  bootstrap.bundle.min.js
```
`firebase-config.js` tạo global `db = firebase.firestore()`.
`questions.js` tạo global `QUIZ_QUESTIONS`.
`quiz.js` / `leaderboard.js` phụ thuộc vào cả hai global trên.

---

## CSS — Design System

File duy nhất: `css/style.css`. Tất cả style dùng CSS custom properties:

```css
--pink:       #E8A0B4
--light-pink: #FFF0F3
--rose:       #C4687A   /* màu chủ đạo */
--gold:       #C9A84C   /* màu phụ / accent */
--dark:       #3D2B1F
--text:       #4A3728
```

**Quy tắc đặt tên class:**
- Component page-specific có prefix: `.quiz-*`, `.lb-*` (leaderboard)
- Shared components: `.wedding-card`, `.btn-wedding`, `.wedding-input`, `.option-btn`
- State modifiers: `.correct`, `.wrong`, `.warning`, `.danger`, `.show`, `.current-player`
- Animation helpers: `.fade-in`, `.fade-out`

**Không dùng inline style** trừ width/animation-delay động được set bằng JS.

---

## Firebase

### Cấu hình
Mở `js/firebase-config.js` và thay toàn bộ placeholder bằng config thực từ Firebase Console:
```js
const firebaseConfig = {
    apiKey:            "...",
    authDomain:        "...",
    projectId:         "...",
    storageBucket:     "...",
    messagingSenderId: "...",
    appId:             "..."
};
```

### Firestore Security Rules
Paste vào Firebase Console → Firestore → Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{scoreId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

### Schema Firestore

**Collection:** `scores`

```js
{
  name:           string,      // tên người chơi
  score:          number,      // tổng điểm (0–150)
  totalTime:      number,      // tổng giây đã dùng
  correctAnswers: number,      // số câu đúng (0–10)
  timestamp:      Timestamp,   // firebase.firestore.FieldValue.serverTimestamp()
  answers: [
    {
      questionId: number,
      selected:   number,   // index đáp án chọn, -1 nếu hết giờ
      correct:    number,   // index đáp án đúng
      isCorrect:  boolean,
      timeTaken:  number,   // giây
      points:     number    // điểm kiếm được cho câu này
    }
  ]
}
```

---

## Logic Quiz (`js/quiz.js`)

### State object
```js
let state = {
    playerName, currentIndex, score, totalTime,
    correctCount, answers, timerInterval,
    timeRemaining, questionStartMs, answered
}
```

### Tính điểm
```
đúng = 1000 điểm base (luôn được nếu đúng)
     + Math.round((timeRemaining / 30) * 1000) điểm speed bonus
     → tối đa 2000 điểm/câu, tối đa 20,000 điểm tổng
     → trả lời ngay: 2000 | trả lời lúc còn 15s: 1500 | lúc còn 1s: ~1033
sai / hết giờ = 0 điểm
```

### Flow
```
initQuiz()
  └─ showQuestion(index)
       ├─ render options → option-btn elements
       ├─ startTimer() → setInterval 250ms
       │    └─ handleTimeout() nếu hết giờ
       └─ selectAnswer(i) khi click
            ├─ tính điểm
            ├─ highlight correct/wrong
            ├─ showFeedback() toast
            └─ setTimeout 2200ms → showQuestion(index+1)
                                   hoặc endQuiz() nếu xong
endQuiz()
  └─ hiện #resultScreen
  ├─ saveScore() → db.collection('scores').add(data)
  └─ listenResultLeaderboard() → real-time listener, cập nhật #resultLbList + #myRankBox
```

### Naming / conventions trong quiz.js
- Dùng `state.*` cho tất cả mutable state, không dùng biến global rời rạc.
- `state.lbUnsubscribe` lưu hàm unsubscribe Firestore listener; gọi trước khi navigate.
- Timer dùng `Date.now()` để tính `timeTaken` chính xác, không đếm bằng tick.
- Transition: fade-in class trên `#questionText`, reset bằng `void el.offsetWidth`.
- `makeLbRow()` và `escapeHtml()` định nghĩa trong quiz.js (không import từ leaderboard.js).

### Result screen (sau khi quiz kết thúc)
Hiển thị ngay trên trang quiz.html (không redirect):
1. Grade emoji + tên danh hiệu
2. Điểm lớn (toLocaleString)
3. Stats: câu đúng / thời gian
4. **`#myRankBox`** — badge "Bạn đang xếp hạng #N" (ẩn cho đến khi có data)
5. **`#resultLbList`** — top 10 + separator `···` + hàng của người chơi nếu ngoài top 10
6. Nút: 🏠 Trang chủ (`href="index.html"`) + 🔄 Chơi lại (`playAgain()`)

CSS liên quan: `.my-rank-box`, `.my-rank-num`, `.result-lb-title`, `.result-lb-list`, `.lb-separator`

---

## Logic Leaderboard (`js/leaderboard.js`)

- `db.collection('scores').orderBy('timestamp','desc').onSnapshot(...)` — real-time
- Client-side dedup: `getBestPerPlayer()` giữ điểm cao nhất per tên (lowercase)
- Sort: score DESC → totalTime ASC
- Hiển thị top 20
- Highlight người chơi hiện tại (so sánh `sessionStorage.getItem('playerName')`)
- `escapeHtml()` để tránh XSS khi render tên người chơi

---

## Câu hỏi (`js/questions.js`)

Mảng `QUIZ_QUESTIONS`, mỗi phần tử:
```js
{
  id:          number,    // 1–10
  question:    string,
  options:     string[4], // luôn đúng 4 đáp án
  correct:     number,    // index 0–3
  explanation: string     // hiện trong feedback toast sau khi trả lời
}
```

**Để tùy chỉnh:** chỉ cần sửa nội dung trong `js/questions.js`. Không cần động đến file nào khác.

---

## Những chỗ cần tùy chỉnh trước khi deploy

1. **Tên cặp đôi** — xuất hiện ở 3 nơi:
   - `index.html` dòng `<h1 class="wedding-title">Nguyễn Văn A</h1>` (2 dòng)
   - `leaderboard.html` dòng `💍 Nguyễn Văn A &amp; Trần Thị B · 05.06.2026`

2. **Ngày cưới** — `index.html` thẻ `<p class="wedding-date">`

3. **10 câu hỏi** — `js/questions.js` (câu hỏi, đáp án, `correct` index, `explanation`)

4. **Firebase config** — `js/firebase-config.js`

---

## Những việc chưa làm / có thể thêm

- [x] Result screen nhúng leaderboard real-time + hiển thị rank cá nhân
- [x] Nút Trang chủ trên result screen
- [ ] **QR Code tích hợp**: thêm trang `admin.html` tự sinh QR từ URL deploy
- [ ] **Ảnh câu hỏi**: thêm field `image` vào question schema và `<img>` trong quiz.html
- [ ] **Âm thanh**: SFX đúng/sai/tick timer (Web Audio API hoặc `<audio>`)
- [ ] **Admin panel**: xem tất cả lượt chơi, reset leaderboard
- [ ] **Đếm ngược bắt đầu** (3-2-1) trước khi quiz bắt đầu
- [ ] **Share kết quả**: nút share điểm lên mạng xã hội (Web Share API)
- [ ] **Ngăn chơi lại nhiều lần**: lưu flag trong localStorage
- [ ] **Firebase Hosting**: thêm `firebase.json` để deploy

---

## Lưu ý kỹ thuật

- **Không có module bundler**: tất cả JS chạy trong global scope. Hàm trong `quiz.js` được gọi từ `onclick` attribute trong HTML.
- **sessionStorage**: dùng để truyền `playerName` giữa các trang (key: `'playerName'`). Key `'lastScoreId'` lưu Firestore doc ID sau khi submit.
- **Firebase SDK**: dùng **compat** (không phải modular), nên syntax là `firebase.firestore()` chứ không phải `import { getFirestore }`.
- **Responsive**: đã test layout trên mobile (col-12) và desktop (col-lg-5). Breakpoint chính: 576px.
- **Không có server**: website hoàn toàn tĩnh, không cần backend.
