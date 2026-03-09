// js/firebase-sync.js
// Sincronização inteligente com Firebase (online/offline)

(function () {
  console.log("📡 Inicializando módulo Firebase Sync...");

  let pendingQueue = [];
  let syncInProgress = false;
  let lastSyncTime = null;

  function carregarFilaPendente() {
    try {
      const saved = localStorage.getItem("sage_firebase_pending");
      if (saved) {
        pendingQueue = JSON.parse(saved);
        console.log(
          `📋 Fila carregada: ${pendingQueue.length} operações pendentes`,
        );
      }
    } catch (e) {
      console.warn("Erro ao carregar fila:", e);
      pendingQueue = [];
    }
  }

  function salvarFilaPendente() {
    try {
      localStorage.setItem(
        "sage_firebase_pending",
        JSON.stringify(pendingQueue),
      );
    } catch (e) {
      console.warn("Erro ao salvar fila:", e);
    }
  }

  function adicionarOperacaoPendente(tipo, colecao, dados, id) {
    pendingQueue.push({
      id: Date.now() + Math.random(),
      tipo,
      colecao,
      dados,
      documentoId: id,
      timestamp: new Date().toISOString(),
      tentativas: 0,
    });

    salvarFilaPendente();
    console.log(`➕ Operação adicionada à fila: ${tipo} - ${colecao}`);
    processarFilaPendente();
  }

  async function processarFilaPendente() {
    if (syncInProgress || pendingQueue.length === 0) return;

    const online = await FirebaseConfig.verificarConexaoFirebase();
    if (!online) {
      console.log(`📡 Offline: ${pendingQueue.length} operações aguardando`);
      atualizarStatusSincronizacao();
      return;
    }

    syncInProgress = true;
    console.log(`🔄 Processando fila: ${pendingQueue.length} operações...`);

    const novasPendentes = [];

    for (const op of pendingQueue) {
      try {
        op.tentativas++;

        const collectionRef = FirebaseConfig.firestore.collection(op.colecao);
        const docRef = op.documentoId
          ? collectionRef.doc(op.documentoId.toString())
          : collectionRef.doc();

        if (op.tipo === "salvar") {
          await docRef.set(
            {
              ...op.dados,
              _syncTimestamp: new Date().toISOString(),
              _syncVersion: "2026.1",
            },
            { merge: true },
          );
        } else if (op.tipo === "deletar") {
          await docRef.delete();
        }

        console.log(`✅ Operação concluída: ${op.tipo} - ${op.colecao}`);
      } catch (error) {
        console.warn(
          `⚠️ Falha na operação (tentativa ${op.tentativas}):`,
          error,
        );

        if (op.tentativas < 5) {
          novasPendentes.push(op);
        } else {
          console.error(`❌ Operação descartada após 5 tentativas:`, op);
          if (typeof window.showToast === "function") {
            window.showToast("Falha na sincronização de alguns dados", "error");
          }
        }
      }
    }

    pendingQueue = novasPendentes;
    salvarFilaPendente();
    syncInProgress = false;

    if (pendingQueue.length > 0) {
      console.log(`⏳ ${pendingQueue.length} operações ainda pendentes`);
      setTimeout(processarFilaPendente, 30000);
    } else {
      console.log("✅ Todas as operações sincronizadas!");
      lastSyncTime = new Date().toISOString();
      localStorage.setItem("sage_last_sync", lastSyncTime);
      atualizarStatusSincronizacao();
    }
  }

  async function salvarDadosFirebase(colecao, dados, id = null) {
    if (!dados) return false;

    const online = await FirebaseConfig.verificarConexaoFirebase();

    if (online) {
      try {
        const collectionRef = FirebaseConfig.firestore.collection(colecao);
        const docRef = id
          ? collectionRef.doc(id.toString())
          : collectionRef.doc();

        await docRef.set(
          {
            ...dados,
            _syncTimestamp: new Date().toISOString(),
            _syncVersion: "2026.1",
          },
          { merge: true },
        );

        console.log(`✅ Dados salvos no Firebase: ${colecao}`);
        return true;
      } catch (error) {
        console.warn("⚠️ Erro ao salvar online, adicionando à fila:", error);
        adicionarOperacaoPendente("salvar", colecao, dados, id);
        return false;
      }
    } else {
      console.log("📡 Offline: adicionando à fila");
      adicionarOperacaoPendente("salvar", colecao, dados, id);
      return false;
    }
  }

  async function carregarDadosFirebase(colecao, filtros = {}) {
    const online = await FirebaseConfig.verificarConexaoFirebase();

    if (!online) {
      console.log("📡 Offline: dados podem estar desatualizados");
      return null;
    }

    try {
      let query = FirebaseConfig.firestore.collection(colecao);

      Object.entries(filtros).forEach(([campo, valor]) => {
        if (valor !== undefined && valor !== null) {
          query = query.where(campo, "==", valor);
        }
      });

      const snapshot = await query.get();

      if (snapshot.empty) {
        return [];
      }

      const dados = [];
      snapshot.forEach((doc) => {
        dados.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return dados;
    } catch (error) {
      console.error("❌ Erro ao carregar do Firebase:", error);
      return null;
    }
  }

  async function salvarRegistroAulaOffline(registro) {
    console.log("💾 Salvando registro de aula (offline first)...");

    if (!registro.id) {
      registro.id = Date.now() + Math.floor(Math.random() * 1000);
    }

    if (!window.state) window.state = {};
    if (!window.state.registros) window.state.registros = [];

    window.state.registros.push(registro);

    if (typeof window.salvarEstado === "function") {
      window.salvarEstado();
    }

    const resultado = await salvarDadosFirebase(
      "registros",
      registro,
      registro.id,
    );

    if (typeof window.showToast === "function") {
      if (resultado) {
        window.showToast("Registro salvo e sincronizado!", "success");
      } else {
        window.showToast("Registro salvo localmente (offline)", "info");
      }
    }

    return registro.id;
  }

  async function carregarRegistrosFirebase(
    eletivaId = null,
    dataInicio = null,
    dataFim = null,
  ) {
    const filtros = {};
    if (eletivaId) filtros.eletivaId = parseInt(eletivaId);

    let registros = await carregarDadosFirebase("registros", filtros);

    if (!registros) {
      registros = window.state?.registros || [];
    }

    if (dataInicio) {
      registros = registros.filter((r) => r.data >= dataInicio);
    }
    if (dataFim) {
      registros = registros.filter((r) => r.data <= dataFim);
    }

    return registros;
  }

  function atualizarStatusSincronizacao() {
    const pending = pendingQueue.length;
    const lastSync = localStorage.getItem("sage_last_sync");

    document.querySelectorAll(".sync-status").forEach((el) => {
      if (pending > 0) {
        el.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i> Sincronizando (${pending})`;
        el.className = "sync-status sync-pending";
      } else if (lastSync) {
        const date = new Date(lastSync).toLocaleString("pt-BR");
        el.innerHTML = `<i class="fas fa-check-circle"></i> Sincronizado: ${date}`;
        el.className = "sync-status sync-ok";
      } else {
        el.innerHTML = `<i class="fas fa-cloud"></i> Aguardando...`;
        el.className = "sync-status";
      }
    });
  }

  function iniciarMonitoramentoOffline() {
    window.addEventListener("online", () => {
      console.log("📡 Conexão restabelecida! Processando fila...");
      if (typeof window.showToast === "function") {
        window.showToast("Conexão restabelecida. Sincronizando...", "info");
      }
      processarFilaPendente();
    });

    window.addEventListener("offline", () => {
      console.log("📡 Offline - operações serão enfileiradas");
      if (typeof window.showToast === "function") {
        window.showToast("Modo offline ativado", "warning");
      }
      atualizarStatusSincronizacao();
    });

    setInterval(() => {
      if (navigator.onLine) {
        processarFilaPendente();
      }
    }, 300000);

    setTimeout(() => {
      if (navigator.onLine) {
        processarFilaPendente();
      }
    }, 2000);
  }

  carregarFilaPendente();
  iniciarMonitoramentoOffline();

  window.FirebaseSync = {
    salvarDadosFirebase,
    carregarDadosFirebase,
    salvarRegistroAulaOffline,
    carregarRegistrosFirebase,
    getPendingCount: () => pendingQueue.length,
    processarFilaPendente,
  };

  console.log("✅ Módulo Firebase Sync carregado");
})();
