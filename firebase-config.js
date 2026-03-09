// js/firebase-config.js
// Configuração do Firebase - Substitua com suas credenciais

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
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

    firebaseApp = firebase.initializeApp(firebaseConfig);
    firestore = firebase.firestore();

    // Configurar para trabalhar offline
    firestore
      .enablePersistence({ synchronizeTabs: true })
      .then(() => console.log("✅ Persistência offline habilitada"))
      .catch((err) => {
        if (err.code === "failed-precondition") {
          console.warn(
            "⚠️ Múltiplas abas abertas, persistência apenas em uma aba",
          );
        } else if (err.code === "unimplemented") {
          console.warn("⚠️ Navegador não suporta persistência offline");
        }
      });

    firebaseInitialized = true;
    console.log("✅ Firebase inicializado com sucesso");
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
    // Verificar conectividade
    const connectedRef = firebase
      .firestore()
      .collection("_health")
      .doc("connection");
    await connectedRef.set(
      { timestamp: new Date().toISOString() },
      { merge: true },
    );
    return true;
  } catch (error) {
    console.warn("⚠️ Offline:", error.message);
    return false;
  }
}

window.FirebaseConfig = {
  initFirebase,
  verificarConexaoFirebase,
  get firestore() {
    return firestore;
  },
  get isInitialized() {
    return firebaseInitialized;
  },
};
