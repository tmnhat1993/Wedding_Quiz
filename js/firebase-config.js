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

// Firestore Security Rules (paste these in Firebase Console → Firestore → Rules):
// ─────────────────────────────────────────────────────
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /scores/{scoreId} {
//       allow read: if true;
//       allow create: if true;
//       allow update, delete: if false;
//     }
//   }
// }
// ─────────────────────────────────────────────────────

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
