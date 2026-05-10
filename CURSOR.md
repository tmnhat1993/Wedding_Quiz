# Wedding Quiz — Project Context for Cursor

## Tổng quan dự án

Website quiz đám cưới thuần HTML/CSS/JS tĩnh (không có build tool). Khách quét QR → nhập tên → trả lời 10 câu có đếm giờ → màn hình cảm ơn (không hiển thị điểm / đúng sai / xếp hạng); dữ liệu vẫn lưu Firestore cho MC. Trang **leaderboard** và **admin** dùng URL trực tiếp (không có link trên `index.html`).

**Không dùng framework JS** — Bootstrap 5 + Vanilla JS + Firebase compat SDK qua CDN.

---

## Stack

| Layer     | Công nghệ                                      |
|-----------|------------------------------------------------|
| UI        | Bootstrap 5.3 (CDN) + Bootstrap Icons 1.11   |
| Font      | Google Fonts: Playfair Display + Nunito      |
| Database  | Firebase Firestore (compat SDK v10, CDN)      |
| Hosting   | Static host (Firebase Hosting, GitHub Pages…) |
| Build     | **Không có** — mở trực tiếp file HTML        |
| Rules     | `firestore.rules` + `firebase.json` (deploy CLI) |

---

## Cấu trúc file

```
DamCuoiQuiz/
├── index.html              # Chào / nhập tên (Firebase + quiz-session)
├── quiz.html               # 10 câu + timer + màn cảm ơn
├── leaderboard.html        # Bảng xếp hạng (poll định kỳ)
├── admin.html              # Quản trị: danh sách, xóa từng người, reset game
├── firebase.json           # Trỏ tới firestore.rules
├── firestore.rules         # Rules Firestore (deploy lên Console hoặc CLI)
├── css/
│   └── style.css
└── js/
    ├── firebase-config.js  # init Firebase + global db
    ├── quiz-session.js     # epoch phiên chơi + localStorage (chặn chơi lại)
    ├── questions.js        # QUIZ_QUESTIONS
    ├── quiz.js             # Logic quiz + saveScore
    ├── leaderboard.js      # get + poll, dedup theo tên
    └── admin.js            # Danh sách scores, reset + bump epoch
```

### Thứ tự load script (chuẩn)

```
firebase-app-compat.js → firebase-firestore-compat.js
→ firebase-config.js → quiz-session.js (index & quiz) → questions.js → quiz.js
→ leaderboard: firebase-config.js → leaderboard.js
→ admin: firebase-config.js → admin.js
→ bootstrap.bundle.min.js
```

---

## CSS — Design System

File: `css/style.css`. Custom properties: `--pink`, `--light-pink`, `--rose`, `--gold`, `--dark`, `--text`.

**Prefix:** `.quiz-*`, `.lb-*`, `.lb-total-players` (số người chơi leaderboard).

---

## Firebase

### Cấu hình

`js/firebase-config.js` — thay `firebaseConfig` bằng project thật. Comment trong file nhắc phải **publish** rules đúng với `firestore.rules`.

### Firestore Security Rules

**Không dùng** bản cũ chỉ `create` trên `scores` và cấm `delete`. Cần:

- `scores`: `read`, `create`, `delete` (admin xóa / reset); `update` tùy chính sách.
- `meta/{docId}`: `read` cho khách; `create`, `update` để bump `epoch` khi reset.

Nội dung chuẩn nằm trong **`firestore.rules`** ở root repo — dán vào Console → Firestore → Rules hoặc:

`firebase deploy --only firestore:rules`

### Collections / schema

**`scores`** — mỗi lượt chơi một document:

```js
{
  name: string,
  score: number,           // tối đa 20_000 (10 câu × 2000)
  totalTime: number,       // giây
  correctAnswers: number,  // 0–10
  timestamp: Timestamp,
  answers: [ { questionId, selected, correct, isCorrect, timeTaken, points } ]
}
```

**`meta/session`** — một document (vd. id `session`):

```js
{ epoch: number }  // tăng khi admin bấm Reset game (FieldValue.increment)
```

Dùng chung với `localStorage` key `weddingQuiz_lastPlayedEpoch` (trong `quiz-session.js`) để **cùng một phiên** không cho chơi lại trên cùng trình duyệt; sau khi admin reset (epoch mới), có thể chơi lại.

---

## Logic Quiz (`js/quiz.js`)

### State

`playerName`, `roundEpoch`, `currentIndex`, `score`, `totalTime`, `correctCount`, `answers`, timer fields.

### Tính điểm (lưu server, không show khách)

Đúng: 1000 + speed bonus tối đa 1000 mỗi câu → tối đa **20.000** tổng.

### Trải nghiệm khách

- Không tô xanh/đỏ đáp án; toast trung tính (không tiết lộ đúng/sai).
- Header quiz: nhãn **Quiz**, không hiển thị điểm chạy.
- **Kết thúc:** chỉ lời cảm ơn + chờ kết quả chương trình; **không** nút về trang chủ trên màn đó.
- `saveScore()` + `weddingQuizRememberPlayed(state.roundEpoch)` sau khi hiện kết quả.

### Index + session

`index.html` gọi `fetchQuizRoundEpoch()`, set `sessionStorage.quizRoundEpoch`, khóa form nếu đã chơi phiên hiện tại. `quiz.js` redirect về index nếu đã chơi hoặc không có tên.

---

## Leaderboard (`js/leaderboard.js`)

- `get()` một lần khi load trang (không `onSnapshot`, không auto-refresh); ban tổ chức reload tay khi cần cập nhật.
- **Không** spinner / chữ “Đang tải” / “Cập nhật tự động” / “Lần tải”.
- `getBestPerPlayer()` → sort điểm giảm, thời gian tăng; top **20**.
- `#totalPlayers`: căn giữa, **font-size 18px** (class `.lb-total-players`).

---

## Admin (`admin.html` + `js/admin.js`)

- Liệt kê `scores`, xóa từng dòng, **Reset game**: xóa hết `scores` + **increment** `meta/session.epoch` trong cùng batch.
- Cần rules cho phép `delete` trên `scores` và ghi `meta`.

---

## Câu hỏi (`js/questions.js`)

Chỉnh nội dung tại đây; `explanation` không còn hiện cho khách trên toast nhưng vẫn có thể giữ trong data.

---

## Tùy chỉnh trước khi deploy

1. Tên cặp đôi / ngày cưới — `index.html`, `quiz.html`, `leaderboard.html`, `admin.html` (hiện tại ngày **10.05.2026**).
2. `js/questions.js`
3. `js/firebase-config.js`
4. Publish **`firestore.rules`**

---

## Việc có thể làm thêm

- [ ] QR / short link trên admin
- [ ] ảnh câu hỏi, âm thanh, countdown 3-2-1
- [ ] Firebase Auth cho admin thay vì rules mở
- [ ] Firebase Hosting + CI deploy

---

## Lưu ý kỹ thuật

- Global scope, không bundler.
- `sessionStorage`: `playerName`, `quizRoundEpoch`; `localStorage`: `weddingQuiz_lastPlayedEpoch`.
- Firebase **compat** API: `firebase.firestore()`.
- Static site, không backend riêng.
