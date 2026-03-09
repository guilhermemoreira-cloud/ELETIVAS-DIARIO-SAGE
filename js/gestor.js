// js/gestor.js - Lógica do gestor

let gestorAtual = null;

document.addEventListener("DOMContentLoaded", function () {
  console.log("👔 Inicializando página do gestor...");

  carregarTheme();

  // Carregar gestor selecionado
  const gestorStorage = localStorage.getItem("gestor_atual");
  if (!gestorStorage) {
    window.location.href = "selecionar-gestor.html";
    return;
  }

  gestorAtual = JSON.parse(gestorStorage);
  console.log("👤 Gestor:", gestorAtual.nome, "Perfil:", gestorAtual.perfil);

  // Carregar estado
  if (typeof carregarEstado === "function") {
    carregarEstado();
  }

  // Atualizar interface
  document.getElementById("userName").textContent = gestorAtual.nome;

  const roleMap = {
    GESTOR: "Gestor",
    SECRETARIA: "Secretaria",
    GESTOR_PROFESSOR: "Gestor/Professor",
  };
  document.getElementById("userRole").textContent =
    roleMap[gestorAtual.perfil] || "Gestor";

  if (typeof atualizarIndicadorSemestre === "function") {
    atualizarIndicadorSemestre();
  }

  // Carregar todos os dados
  carregarTodosDados();
});

// ==================== FUNÇÕES DE TABS ====================
window.mudarTab = function (tab) {
  document
    .querySelectorAll(".gestor-tabs .tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  document
    .querySelectorAll(".tab-pane")
    .forEach((pane) => pane.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");

  if (tab === "eletivas") carregarEletivas();
  if (tab === "professores") carregarProfessores();
  if (tab === "alunos") carregarAlunos();
  if (tab === "dashboard") atualizarDashboard();
};

// ==================== CARREGAR TODOS OS DADOS ====================
window.carregarTodosDados = function () {
  console.log("📊 Carregando todos os dados...");

  atualizarCardsResumo();
  atualizarDashboard();
  atualizarSelectProfessores();
  carregarEletivas();
  carregarProfessores();
  carregarAlunos();
  carregarInfoSemestres();
};

// ==================== ATUALIZAR CARDS DE RESUMO ====================
function atualizarCardsResumo() {
  document.getElementById("totalEletivas").textContent = state.eletivas.length;
  document.getElementById("totalProfessores").textContent =
    state.professores.length;
  document.getElementById("totalAlunos").textContent = state.alunos.length;
  document.getElementById("totalMatriculas").textContent =
    state.matriculas.length;
}

// ==================== ATUALIZAR DASHBOARD ====================
function atualizarDashboard() {
  const eletivasFixas = state.eletivas.filter((e) => e.tipo === "FIXA").length;
  const eletivasMistas = state.eletivas.filter(
    (e) => e.tipo === "MISTA",
  ).length;

  const matriculasFixas = state.matriculas.filter((m) => {
    const e = state.eletivas.find((el) => el.id === m.eletivaId);
    return e && e.tipo === "FIXA";
  }).length;

  const matriculasMistas = state.matriculas.filter((m) => {
    const e = state.eletivas.find((el) => el.id === m.eletivaId);
    return e && e.tipo === "MISTA";
  }).length;

  const alunos1 = state.alunos.filter((a) => a.serie === "1ª").length;
  const alunos2 = state.alunos.filter((a) => a.serie === "2ª").length;
  const alunos3 = state.alunos.filter((a) => a.serie === "3ª").length;

  const professoresLimite = state.professores.filter((p) => {
    const count = state.eletivas.filter((e) => e.professorId === p.id).length;
    return count >= 4;
  }).length;

  document.getElementById("dashboardEletivasFixas").textContent = eletivasFixas;
  document.getElementById("dashboardEletivasMistas").textContent =
    eletivasMistas;
  document.getElementById("dashboardMatriculasFixas").textContent =
    matriculasFixas;
  document.getElementById("dashboardMatriculasMistas").textContent =
    matriculasMistas;
  document.getElementById("dashboardAlunos1").textContent = alunos1;
  document.getElementById("dashboardAlunos2").textContent = alunos2;
  document.getElementById("dashboardAlunos3").textContent = alunos3;
  document.getElementById("dashboardProfessoresLimite").textContent =
    professoresLimite;
}

// ==================== ATUALIZAR SELECT DE PROFESSORES ====================
function atualizarSelectProfessores() {
  const select = document.getElementById("filterEletivasProfessor");
  if (!select) return;

  select.innerHTML = '<option value="">Todos os professores</option>';
  state.professores.forEach((p) => {
    select.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
  });
}

// ==================== CARREGAR ELETIVAS ====================
function carregarEletivas() {
  const container = document.getElementById("listaEletivas");
  if (!container) return;

  const filtroTipo = document.getElementById("filterEletivasTipo")?.value;
  const filtroProfessor = document.getElementById(
    "filterEletivasProfessor",
  )?.value;

  console.log("📚 Carregando eletivas...");
  console.log("   - Total no state:", state.eletivas?.length || 0);

  if (!state.eletivas || state.eletivas.length === 0) {
    container.innerHTML =
      '<p class="empty-state">Nenhuma eletiva cadastrada</p>';
    return;
  }

  // Filtrar por semestre ativo
  let eletivas = state.eletivas.filter((e) => e.semestreId === "2026-1");
  console.log("   - Após filtro de semestre:", eletivas.length);

  // Aplicar filtro de tipo
  if (filtroTipo) {
    eletivas = eletivas.filter((e) => e.tipo === filtroTipo);
    console.log(`   - Após filtro tipo (${filtroTipo}):`, eletivas.length);
  }

  // Aplicar filtro de professor
  if (filtroProfessor) {
    eletivas = eletivas.filter(
      (e) => e.professorId === parseInt(filtroProfessor),
    );
    console.log(`   - Após filtro professor:`, eletivas.length);
  }

  if (eletivas.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p class="empty-state">Nenhuma eletiva encontrada com os filtros selecionados</p>
                <p style="color: var(--text-light); margin-top: 0.5rem;">Total de eletivas no sistema: ${state.eletivas.length}</p>
                <button class="btn-primary btn-small" onclick="limparFiltrosEletivas()" style="margin-top: 1rem;">
                    <i class="fas fa-eraser"></i> Limpar Filtros
                </button>
            </div>
        `;
    return;
  }

  container.innerHTML = "";
  eletivas.forEach((e) => {
    // Calcular número de matrículas
    const matriculas =
      state.matriculas?.filter((m) => m.eletivaId === e.id).length || 0;

    // Determinar a turma para exibição
    let turmaDisplay = "";
    if (e.turmaOrigem) {
      turmaDisplay = `<span><i class="fas fa-layer-group"></i> ${e.turmaOrigem}</span>`;
    }

    const div = document.createElement("div");
    div.className = "eletiva-item";
    div.innerHTML = `
            <div class="eletiva-info">
                <h4>${e.codigo || "SEM CÓDIGO"} - ${e.nome || "SEM NOME"}</h4>
                <div class="eletiva-meta">
                    <span><i class="fas fa-chalkboard-teacher"></i> ${e.professorNome || "Não atribuído"}</span>
                    <span><i class="fas fa-clock"></i> ${e.horario?.diaSemana || "?"} ${e.horario?.codigoTempo || "?"}</span>
                    <span><i class="fas fa-users"></i> ${matriculas}/${e.vagas || 40}</span>
                    <span><i class="fas fa-tag"></i> ${e.tipo || "MISTA"}</span>
                    ${turmaDisplay}
                </div>
            </div>
        `;
    container.appendChild(div);
  });

  console.log(`✅ ${eletivas.length} eletivas renderizadas`);
}

// Função para limpar filtros
window.limparFiltrosEletivas = function () {
  document.getElementById("filterEletivasTipo").value = "";
  document.getElementById("filterEletivasProfessor").value = "";
  carregarEletivas();
};

// ==================== CARREGAR PROFESSORES ====================
function carregarProfessores() {
  const container = document.getElementById("listaProfessores");
  const searchTerm =
    document.getElementById("searchProfessores")?.value.toLowerCase() || "";

  let professores = state.professores;

  if (searchTerm) {
    professores = professores.filter(
      (p) =>
        p.nome.toLowerCase().includes(searchTerm) ||
        p.email.toLowerCase().includes(searchTerm),
    );
  }

  if (professores.length === 0) {
    container.innerHTML =
      '<p class="empty-state">Nenhum professor encontrado</p>';
    return;
  }

  container.innerHTML = "";
  professores.forEach((p) => {
    const eletivas = state.eletivas.filter(
      (e) => e.professorId === p.id,
    ).length;

    const div = document.createElement("div");
    div.className = "professor-item";
    div.innerHTML = `
            <div class="professor-info">
                <h4>${p.nome} ${eletivas >= 4 ? "⚠️" : ""}</h4>
                <div class="professor-meta">
                    <span><i class="fas fa-envelope"></i> ${p.email}</span>
                    <span><i class="fas fa-book"></i> ${eletivas} eletivas</span>
                    <span><i class="fas fa-tag"></i> ${p.perfil}</span>
                </div>
            </div>
        `;
    container.appendChild(div);
  });
}

// ==================== CARREGAR ALUNOS ====================
function carregarAlunos() {
  const container = document.getElementById("listaAlunos");
  const searchTerm =
    document.getElementById("searchAlunos")?.value.toLowerCase() || "";

  let alunos = state.alunos;

  if (searchTerm) {
    alunos = alunos.filter(
      (a) =>
        a.nome.toLowerCase().includes(searchTerm) ||
        a.codigoSige.toLowerCase().includes(searchTerm),
    );
  }

  if (alunos.length === 0) {
    container.innerHTML = '<p class="empty-state">Nenhum aluno encontrado</p>';
    return;
  }

  container.innerHTML = "";
  alunos.forEach((a) => {
    const matriculas = state.matriculas.filter(
      (m) => m.alunoId === a.id,
    ).length;

    const div = document.createElement("div");
    div.className = "aluno-item";
    div.innerHTML = `
            <div class="aluno-info">
                <h4>${a.nome}</h4>
                <div class="aluno-meta">
                    <span><i class="fas fa-hashtag"></i> ${a.codigoSige}</span>
                    <span><i class="fas fa-users"></i> ${a.turmaOrigem}</span>
                    <span><i class="fas fa-user-graduate"></i> ${matriculas} matrículas</span>
                </div>
            </div>
        `;
    container.appendChild(div);
  });
}

// ==================== CARREGAR INFO SEMESTRES ====================
function carregarInfoSemestres() {
  const eletivasS1 = state.eletivas.filter(
    (e) => e.semestreId === "2026-1",
  ).length;
  const eletivasS2 = state.eletivas.filter(
    (e) => e.semestreId === "2026-2",
  ).length;
  const matriculasS1 = state.matriculas.filter(
    (m) => m.semestreId === "2026-1",
  ).length;
  const matriculasS2 = state.matriculas.filter(
    (m) => m.semestreId === "2026-2",
  ).length;

  document.getElementById("totalEletivasS1").textContent = eletivasS1;
  document.getElementById("totalEletivasS2").textContent = eletivasS2;
  document.getElementById("totalMatriculasS1").textContent = matriculasS1;
  document.getElementById("totalMatriculasS2").textContent = matriculasS2;
}

// ==================== FUNÇÕES DE FILTRO ====================
window.filtrarEletivas = function () {
  carregarEletivas();
};

window.filtrarProfessores = function () {
  carregarProfessores();
};

window.filtrarAlunos = function () {
  carregarAlunos();
};

// ==================== SINCRONIZAÇÃO MANUAL ====================
window.sincronizarAgora = async function () {
  if (typeof sincronizarComPlanilha === "function") {
    await sincronizarComPlanilha();
    carregarTodosDados();
  }
};

// ==================== LOGOUT ====================
window.fazerLogout = function () {
  localStorage.removeItem("gestor_atual");
  window.location.href = "index.html";
};
