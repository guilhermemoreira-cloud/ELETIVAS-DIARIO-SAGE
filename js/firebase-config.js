// js/firebase-config.js
// Configuração do Firebase - Suas credenciais já estão aqui!

const firebaseConfig = {
  apiKey: "AIzaSyCEekoPPwrg7uFuqfxybGQpTYYDOXs1EBk",
  authDomain: "sage-eletivas-2026.firebaseapp.com",
  projectId: "sage-eletivas-2026",
  storageBucket: "sage-eletivas-2026.firebasestorage.app",
  messagingSenderId: "585600942611",
  appId: "1:585600942611:web:7daaf29201dd565a8bb5e6",
  measurementId: "G-TG8FG01NRY",
};

let firebaseApp = null;
let firestore = null;
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return true;

  try {
    if (typeof firebase === "undefined") {
      console.warn("⚠️ Firebase SDK não carregado");
      return false;
    }

    // Inicializar o Firebase
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firestore = firebase.firestore();

    // Configurar persistência offline
    firestore
      .enablePersistence({
        synchronizeTabs: true,
        experimentalForceOwningTab: true,
      })
      .then(() => {
        console.log("✅ Persistência offline habilitada");
      })
      .catch((err) => {
        if (err.code === "failed-precondition") {
          console.warn(
            "⚠️ Múltiplas abas abertas, persistência apenas em uma aba",
          );
        } else if (err.code === "unimplemented") {
          console.warn("⚠️ Navegador não suporta persistência offline");
        } else {
          console.warn("⚠️ Erro na persistência:", err.message);
        }
      });

    firebaseInitialized = true;
    console.log("✅ Firebase inicializado com sucesso!");
    console.log("📁 Projeto:", firebaseConfig.projectId);
    return true;
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
    return false;
  }
}

async function verificarConexaoFirebase() {
  if (!firebaseInitialized && !initFirebase()) {
    return false;
  }

  try {
    // Verificar conectividade com uma operação simples
    const testRef = firestore.collection("_health").doc("connection");
    await testRef.set(
      {
        timestamp: new Date().toISOString(),
        online: true,
      },
      { merge: true },
    );

    console.log("📡 Conexão com Firebase OK");
    return true;
  } catch (error) {
    console.warn("📡 Offline:", error.message);
    return false;
  }
}

// Inicializar automaticamente quando o script carregar
setTimeout(() => {
  initFirebase();
}, 100);

window.FirebaseConfig = {
  initFirebase,
  verificarConexaoFirebase,
  get firestore() {
    return firestore;
  },
  get isInitialized() {
    return firebaseInitialized;
  },
  get config() {
    return firebaseConfig;
  },
};
