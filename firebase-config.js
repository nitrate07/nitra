// ==========================================================================
// FIREBASE YAPILANDIRMASI — BU DOSYAYI DOLDURMANIZ GEREKİYOR
// ==========================================================================
// Aşağıdaki değerler örnek/boş değerlerdir. Site bu haliyle çalışır ama
// "Ebeveyn Hesabı" özelliği devre dışı kalır (site geri kalanı normal çalışır).
//
// GERÇEK ÜYELİK SİSTEMİNİ AKTİFLEŞTİRMEK İÇİN:
//
// 1) https://console.firebase.google.com adresine gidin, Google hesabınızla giriş yapın
// 2) "Proje Ekle" (Add Project) deyin, bir isim verin (örn. "oyun-kutusu"), devam edin
//    (Google Analytics'i kapatabilirsiniz, gerekmiyor)
// 3) Sol menüden "Build" > "Authentication" > "Get Started"
//    "Sign-in method" sekmesinden "Email/Password" seçeneğini AÇIN (Enable)
// 4) Sol menüden "Build" > "Firestore Database" > "Create Database"
//    "Production mode" seçin, size yakın bir bölge (örn. europe-west) seçin
// 5) Sol üstteki ⚙️ (Ayarlar) > "Project settings" > en altta "Your apps"
//    "</>" (Web) simgesine tıklayın, bir takma isim verin, "Register app"
// 6) Karşınıza çıkan "firebaseConfig" nesnesini KOPYALAYIN, aşağıya yapıştırın
// 7) Firestore'da "Rules" sekmesine gidip aşağıdaki kuralları yapıştırıp yayınlayın:
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /parents/{parentId} {
//          allow read, write: if request.auth != null && request.auth.uid == parentId;
//        }
//      }
//    }
//
// Bu 7 adımdan sonra site otomatik olarak gerçek üyelik sistemine geçer.
// ==========================================================================

var FIREBASE_CONFIG = {
  apiKey: "BURAYA_YAPISTIRIN",
  authDomain: "BURAYA_YAPISTIRIN",
  projectId: "BURAYA_YAPISTIRIN",
  storageBucket: "BURAYA_YAPISTIRIN",
  messagingSenderId: "BURAYA_YAPISTIRIN",
  appId: "BURAYA_YAPISTIRIN"
};

// Yapılandırmanın gerçekten doldurulup doldurulmadığını kontrol eder
var FIREBASE_READY = FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "BURAYA_YAPISTIRIN";
