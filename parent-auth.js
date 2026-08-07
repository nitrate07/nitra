// ==========================================================================
// Ebeveyn Hesabı Sistemi
// Firebase yapılandırılmışsa: gerçek e-posta/şifre hesabı + doğrulama e-postası + Firestore'da
// çocuk profili saklama.
// Firebase yapılandırılmamışsa: bu dosya sessizce devre dışı kalır, site normal
// (localStorage tabanlı) profil sistemiyle çalışmaya devam eder.
// ==========================================================================

let fbAuth = null, fbDb = null, fbUser = null;

function initFirebase(){
  if(!window.FIREBASE_READY){
    console.log('Ebeveyn hesabı: Firebase yapılandırılmamış, localStorage modu kullanılıyor.');
    return false;
  }
  try{
    firebase.initializeApp(window.FIREBASE_CONFIG);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    return true;
  } catch(e){
    console.error('Firebase başlatılamadı:', e);
    return false;
  }
}

function parentSignUp(email, password, onSuccess, onError){
  if(!fbAuth) return onError('Firebase kurulu değil.');
  fbAuth.createUserWithEmailAndPassword(email, password)
    .then(cred=>{
      return cred.user.sendEmailVerification().then(()=>{
        return fbDb.collection('parents').doc(cred.user.uid).set({
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          children: []
        });
      }).then(()=> onSuccess(cred.user));
    })
    .catch(err=> onError(fbErrorMessage(err)));
}

function parentSignIn(email, password, onSuccess, onError){
  if(!fbAuth) return onError('Firebase kurulu değil.');
  fbAuth.signInWithEmailAndPassword(email, password)
    .then(cred=> onSuccess(cred.user))
    .catch(err=> onError(fbErrorMessage(err)));
}

function parentSignOut(){
  if(fbAuth) fbAuth.signOut();
}

function resendVerificationEmail(onSuccess, onError){
  if(!fbAuth || !fbAuth.currentUser) return onError('Oturum bulunamadı.');
  fbAuth.currentUser.sendEmailVerification().then(onSuccess).catch(err=>onError(fbErrorMessage(err)));
}

function fbErrorMessage(err){
  const map = {
    'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.',
    'auth/invalid-email': 'Geçerli bir e-posta adresi girin.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/user-not-found': 'Bu e-postayla kayıtlı hesap bulunamadı.',
    'auth/wrong-password': 'Şifre hatalı.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.',
    'auth/invalid-credential': 'E-posta veya şifre hatalı.'
  };
  return map[err.code] || ('Bir hata oluştu: ' + err.message);
}

// Çocuk profili ekleme (ebeveyn hesabına bağlı, Firestore'da saklanır)
function addChildProfile(childData, onSuccess, onError){
  if(!fbAuth || !fbAuth.currentUser) return onError('Önce giriş yapmalısınız.');
  const uid = fbAuth.currentUser.uid;
  fbDb.collection('parents').doc(uid).update({
    children: firebase.firestore.FieldValue.arrayUnion({
      id: 'child_' + Date.now(),
      name: childData.name,
      avatar: childData.avatar,
      color: childData.color,
      createdAt: new Date().toISOString()
    })
  }).then(onSuccess).catch(err=> onError(fbErrorMessage(err)));
}

function getChildren(onSuccess, onError){
  if(!fbAuth || !fbAuth.currentUser) return onError('Önce giriş yapmalısınız.');
  fbDb.collection('parents').doc(fbAuth.currentUser.uid).get()
    .then(doc=> onSuccess(doc.exists ? (doc.data().children||[]) : []))
    .catch(err=> onError(fbErrorMessage(err)));
}
