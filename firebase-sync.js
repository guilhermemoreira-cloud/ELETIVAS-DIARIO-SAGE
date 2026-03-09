// js/firebase-sync.js
// Sincronização inteligente com Firebase (online/offline)

(function () {
  console.log("📡 Inicializando módulo Firebase Sync...");

  // Fila de operações pendentes
  let pendingQueue = [];
  let syncInProgress = false;
  let lastSyncTime = null;

  // ==================== FILA DE OPERAÇÕES ====================

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

    // Tentar processar imediatamente
    processarFilaPendente();
  }

  // ==================== PROCESSAR FILA ====================

  async function processarFilaPendente() {
    if (syncInProgress || pendingQueue.length === 0) return;

    // Verificar conexão
    const online = await FirebaseConfig.verificarConexaoFirebase();
    if (!online) {
      console.log("📡 Offline: ${pendingQueue.length} operações aguardando");
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
          novasPendentes.push(op); // Reintentar depois
        } else {
          console.error(`❌ Operação descartada após 5 tentativas:`, op);
          showToast?.("Falha na sincronização de alguns dados", "error");
        }
      }
    }

    pendingQueue = novasPendentes;
    salvarFilaPendente();
    syncInProgress = false;

    if (pendingQueue.length > 0) {
      console.log(`⏳ ${pendingQueue.length} operações ainda pendentes`);
      // Tentar novamente em 30 segundos
      setTimeout(processarFilaPendente, 30000);
    } else {
      console.log("✅ Todas as operações sincronizadas!");
      lastSyncTime = new Date().toISOString();
      localStorage.setItem("sage_last_sync", lastSyncTime);

      // Atualizar interface
      atualizarStatusSincronizacao();
    }
  }

  // ==================== FUNÇÕES DE SALVAR ====================

  async function salvarDadosFirebase(colecao, dados, id = null) {
    // Tentar salvar online primeiro
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

  // ==================== FUNÇÕES DE CARREGAR ====================

  async function carregarDadosFirebase(colecao, filtros = {}) {
    const online = await FirebaseConfig.verificarConexaoFirebase();

    if (!online) {
      console.log("📡 Offline: dados podem estar desatualizados");
      return null;
    }

    try {
      let query = FirebaseConfig.firestore.collection(colecao);

      // Aplicar filtros
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

  // ==================== FUNÇÕES DE REGISTRO DE AULA ====================

  async function salvarRegistroAulaOffline(registro) {
    console.log("💾 Salvando registro de aula (offline first)...");

    // Garantir que tem ID
    if (!registro.id) {
      registro.id = Date.now() + Math.floor(Math.random() * 1000);
    }

    // Salvar no state
    if (!window.state.registros) window.state.registros = [];
    window.state.registros.push(registro);

    // Salvar no localStorage
    if (typeof window.salvarEstado === "function") {
      window.salvarEstado();
    }

    // Tentar salvar no Firebase
    const resultado = await salvarDadosFirebase(
      "registros",
      registro,
      registro.id,
    );

    // Mostrar toast apropriado
    if (resultado) {
      showToast?.("Registro salvo e sincronizado!", "success");
    } else {
      showToast?.("Registro salvo localmente (offline)", "info");
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
      // Se falhou, usar dados locais
      registros = window.state?.registros || [];
    }

    // Filtrar por data se necessário
    if (dataInicio) {
      registros = registros.filter((r) => r.data >= dataInicio);
    }
    if (dataFim) {
      registros = registros.filter((r) => r.data <= dataFim);
    }

    return registros;
  }

  // ==================== STATUS NA INTERFACE ====================

  function atualizarStatusSincronizacao() {
    const pending = pendingQueue.length;
    const lastSync = localStorage.getItem("sage_last_sync");

    // Procurar elementos de status
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

  // ==================== INICIALIZAÇÃO ====================

  function iniciarMonitoramentoOffline() {
    // Monitorar mudanças de conectividade
    window.addEventListener("online", () => {
      console.log("📡 Conexão restabelecida! Processando fila...");
      showToast?.("Conexão restabelecida. Sincronizando...", "info");
      processarFilaPendente();
    });

    window.addEventListener("offline", () => {
      console.log("📡 Offline - operações serão enfileiradas");
      showToast?.("Modo offline ativado", "warning");
      atualizarStatusSincronizacao();
    });

    // Processar fila a cada 5 minutos mesmo online
    setInterval(() => {
      if (navigator.onLine) {
        processarFilaPendente();
      }
    }, 300000);

    // Processar fila inicial
    setTimeout(() => {
      if (navigator.onLine) {
        processarFilaPendente();
      }
    }, 2000);
  }

  // Carregar fila ao iniciar
  carregarFilaPendente();
  iniciarMonitoramentoOffline();

  // ==================== EXPORTAR ====================

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
