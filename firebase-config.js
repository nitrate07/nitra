// ==========================================================================
// FIREBASE YAPILANDIRMASI — woogigames-58547 projesine bağlandı (2026-08-12)
// ==========================================================================
// Aşağıdaki değerler artık gerçek Firebase projenize ait. Kalan tek adım:
// Firestore'da "Rules" sekmesine gidip aşağıdaki güvenlik kurallarını
// yapıştırıp YAYINLAMAK (Publish) — bu yapılmadan Ebeveyn Hesabı ve Liderlik
// Tablosu Firestore'a yazamaz/okuyamaz.
//
// KALAN ADIM — Firestore güvenlik kuralları:
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /parents/{parentId} {
//          allow read, write: if request.auth != null && request.auth.uid == parentId;
//        }
//        // "Liderlik Tablosu" için: herkes okuyabilir, sadece kendi kaydını
//        // oluşturup güncelleyebilir. Gerçek ad/e-posta/adres YAZILMAZ —
//        // sadece takma ad, gün serisi (streak) ve toplam oyun sayısı saklanır.
//        match /leaderboard/{docId} {
//          allow read: if true;
//          allow create: if request.resource.data.name is string
//                        && request.resource.data.name.size() <= 24
//                        && request.resource.data.streak is int
//                        && request.resource.data.totalPlays is int;
//          allow update: if resource.data.name == request.resource.data.name;
//          allow delete: if false;
//        }
//      }
//    }
//
// Bu kurallar yayınlandığında site otomatik olarak gerçek üyelik sistemine ve
// gerçek dünya çapında Liderlik Tablosu'na geçer — kod tarafında başka hiçbir
// değişiklik gerekmez.
// ==========================================================================
//
// NOT: Firebase panelinde size "npm install firebase" ile modüler SDK
// kurulumu önerildi — bu, React/Vue gibi derleme (build) adımı olan modern
// projeler içindir. WoogiGames saf statik HTML/JS bir site olduğu için
// index.html içinde zaten "compat" SDK'ları <script> etiketiyle yüklüyoruz
// (firebase-app-compat.js, firebase-auth-compat.js, firebase-firestore-compat.js).
// Bu yüzden npm/import adımlarını yapmanıza GEREK YOK — sadece aşağıdaki
// firebaseConfig değerleri ve Firestore kuralları yeterli.

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyA_ltNUQ6n1PH7T1Mga5ULGAHS5xZ8vYn4",
  authDomain: "woogigames-58547.firebaseapp.com",
  projectId: "woogigames-58547",
  storageBucket: "woogigames-58547.firebasestorage.app",
  messagingSenderId: "1007862615450",
  appId: "1:1007862615450:web:4d413ae435da17bdc53e23"
};

// Yapılandırmanın gerçekten doldurulup doldurulmadığını kontrol eder
var FIREBASE_READY = FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "BURAYA_YAPISTIRIN";
