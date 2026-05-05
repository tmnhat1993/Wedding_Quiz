// ════════════════════════════════════════════════════════
//  FIREBASE CONFIGURATION
//  Thay thế các giá trị bên dưới bằng config Firebase của bạn.
//  Vào https://console.firebase.google.com → Project Settings → Your apps
// ════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyBUWft1K6eXze0r-d0rZTATYm5MRLWLEcE",
  authDomain: "wedding-quiz---dung.firebaseapp.com",
  projectId: "wedding-quiz---dung",
  storageBucket: "wedding-quiz---dung.firebasestorage.app",
  messagingSenderId: "236329532578",
  appId: "1:236329532578:web:7b24372020df52d5482bfb",
};

// Firestore Rules — BẮT BUỘC publish đúng bản trong firestore.rules (file ở root project),
// hoặc dán nguyên nội dung đó vào Console → Firestore → Rules → Publish.
// Nếu vẫn dùng rules cũ (delete: false, không có match /meta) thì admin reset sẽ lỗi permission.

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
