// js/professor.js - Lógica do professor

let professorAtual = null;
let registros = [];

document.addEventListener("DOMContentLoaded", function () {
  console.log("👨‍🏫 Inicializando página do professor...");

  carregarTheme();

  // Carregar professor selecionado
  const profStorage = localStorage.getItem("professor_atual");
  if (!profStorage) {
    window.location.href = "selecionar-professor.html";
    return;
  }

  professorAtual = JSON.parse(profStorage);
  console.log("👤 Professor:", professorAtual.nome);

  // Carregar estado
  if (typeof carregarEstado === "function") {
    carregarEstado();
  }

  // Atualizar interface
  document.getElementById("userName").textContent = professorAtual.nome;
  document.getElementById("userRole").textContent = "Professor";
  document.getElementById("professorInfoHeader").innerHTML =
    `<span>${professorAtual.nome}</span>`;

  if (typeof atualizarIndicadorSemestre === "function") {
    atualizarIndicadorSemestre();
  }

  // Carregar dados
  carregarEletivasProfessor();
  carregarSelectEletivas();
  carregarSelectHistorico();

  // Setar data atual
  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("dataAula").value = hoje;
});

// ==================== FUNÇÕES DE TABS ====================
window.mudarTab = function (tab) {
  document
    .querySelectorAll(".professor-tabs .tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  document
    .querySelectorAll(".tab-pane")
    .forEach((pane) => pane.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");

  if (tab === "historico") {
    carregarHistorico();
  }
};

// ==================== CARREGAR ELETIVAS DO PROFESSOR ====================
function carregarEletivasProfessor() {
  const container = document.getElementById("professorEletivasCards");

  // Filtrar eletivas do professor
  const eletivas = state.eletivas.filter(
    (e) => e.professorId === professorAtual.id,
  );

  if (eletivas.length === 0) {
    container.innerHTML =
      '<p class="empty-state">Nenhuma eletiva encontrada para este professor</p>';
    return;
  }

  container.innerHTML = "";

  eletivas.forEach((eletiva) => {
    const matriculas = state.matriculas.filter(
      (m) => m.eletivaId === eletiva.id,
    ).length;

    const card = document.createElement("div");
    card.className = "eletiva-card";
    card.innerHTML = `
            <h3>${eletiva.codigo} - ${eletiva.nome}</h3>
            <p><i class="fas fa-clock"></i> ${eletiva.horario.diaSemana} ${eletiva.horario.codigoTempo}</p>
            <p><i class="fas fa-users"></i> ${matriculas}/${eletiva.vagas} alunos</p>
            <p><i class="fas fa-tag"></i> ${eletiva.tipo} ${eletiva.turmaOrigem ? "- " + eletiva.turmaOrigem : ""}</p>
            <div class="card-actions">
                <button class="btn-primary btn-small" onclick="prepararRegistroAula(${eletiva.id})">
                    <i class="fas fa-pen"></i> Registrar Aula
                </button>
                <button class="btn-secondary btn-small" onclick="verHistoricoEletiva(${eletiva.id})">
                    <i class="fas fa-history"></i> Histórico
                </button>
            </div>
        `;
    container.appendChild(card);
  });
}

// ==================== FUNÇÕES DE REGISTRO DE AULA ====================

window.prepararRegistroAula = function (eletivaId) {
  document.getElementById("selectEletivaAula").value = eletivaId;
  mudarTab("registrar");
  carregarAlunosParaChamada();
};

function carregarSelectEletivas() {
  const select = document.getElementById("selectEletivaAula");

  const eletivas = state.eletivas.filter(
    (e) => e.professorId === professorAtual.id,
  );

  select.innerHTML = '<option value="">Selecione</option>';
  eletivas.forEach((e) => {
    select.innerHTML += `<option value="${e.id}">${e.codigo} - ${e.nome}</option>`;
  });
}

window.carregarAlunosParaChamada = function () {
  const eletivaId = document.getElementById("selectEletivaAula").value;
  if (!eletivaId) {
    document.getElementById("chamadaContainer").style.display = "none";
    return;
  }

  // Buscar alunos matriculados nesta eletiva
  const matriculas = state.matriculas.filter(
    (m) => m.eletivaId === parseInt(eletivaId),
  );
  const alunos = state.alunos.filter((a) =>
    matriculas.some((m) => m.alunoId === a.id),
  );

  if (alunos.length === 0) {
    document.getElementById("chamadaContainer").style.display = "none";
    alert("Nenhum aluno matriculado nesta eletiva");
    return;
  }

  const container = document.getElementById("listaAlunosChamada");
  container.innerHTML = "";

  alunos.forEach((aluno) => {
    const div = document.createElement("div");
    div.className = "aluno-chamada-item";
    div.innerHTML = `
            <input type="checkbox" id="aluno_${aluno.id}" value="${aluno.codigoSige}" checked onchange="atualizarResumoChamada()">
            <div class="aluno-info">
                <label for="aluno_${aluno.id}">
                    <strong>${aluno.codigoSige}</strong> - ${aluno.nome}
                    <span class="aluno-turma">${aluno.turmaOrigem}</span>
                </label>
            </div>
            <input type="text" class="justificativa-input" placeholder="Justificativa (se ausente)" 
                   onchange="atualizarResumoChamada()" disabled>
        `;

    const checkbox = div.querySelector('input[type="checkbox"]');
    const justificativa = div.querySelector(".justificativa-input");

    checkbox.addEventListener("change", () => {
      justificativa.disabled = checkbox.checked;
      if (!checkbox.checked) {
        justificativa.focus();
      } else {
        justificativa.value = "";
      }
      atualizarResumoChamada();
    });

    container.appendChild(div);
  });

  document.getElementById("chamadaContainer").style.display = "block";
  atualizarResumoChamada();
};

window.marcarTodosPresentes = function () {
  document
    .querySelectorAll('#listaAlunosChamada input[type="checkbox"]')
    .forEach((cb) => {
      cb.checked = true;
      const event = new Event("change", { bubbles: true });
      cb.dispatchEvent(event);
    });
};

window.marcarTodosAusentes = function () {
  document
    .querySelectorAll('#listaAlunosChamada input[type="checkbox"]')
    .forEach((cb) => {
      cb.checked = false;
      const event = new Event("change", { bubbles: true });
      cb.dispatchEvent(event);
    });
};

window.atualizarResumoChamada = function () {
  const checkboxes = document.querySelectorAll(
    '#listaAlunosChamada input[type="checkbox"]',
  );
  const presentes = Array.from(checkboxes).filter((cb) => cb.checked).length;
  const ausentes = checkboxes.length - presentes;

  document.getElementById("presentesCount").textContent = presentes;
  document.getElementById("ausentesCount").textContent = ausentes;
  document.getElementById("totalAlunosCount").textContent = checkboxes.length;
};

window.salvarRegistroAula = function (event) {
  event.preventDefault();

  const eletivaId = document.getElementById("selectEletivaAula").value;
  const data = document.getElementById("dataAula").value;
  const conteudo = document.getElementById("conteudoAula").value;
  const observacoes = document.getElementById("observacoesAula").value;

  if (!eletivaId || !data || !conteudo) {
    showToast("Preencha todos os campos obrigatórios!", "error");
    return;
  }

  const presentes = [];
  const ausentes = [];
  const justificativas = {};

  document
    .querySelectorAll("#listaAlunosChamada .aluno-chamada-item")
    .forEach((item) => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      const codigo = checkbox.value;
      const justificativa = item.querySelector(".justificativa-input").value;

      if (checkbox.checked) {
        presentes.push(codigo);
      } else {
        ausentes.push(codigo);
        if (justificativa) {
          justificativas[codigo] = justificativa;
        }
      }
    });

  const registro = {
    id: registros.length + 1,
    eletivaId: parseInt(eletivaId),
    data: data,
    conteudo: conteudo,
    observacoes: observacoes,
    frequencia: {
      presentes: presentes,
      ausentes: ausentes,
      justificativas: justificativas,
    },
    professorId: professorAtual.id,
    semestreId: state.semestreAtivo.id,
  };

  registros.push(registro);
  state.registros.push(registro);

  if (typeof salvarEstado === "function") {
    salvarEstado();
  }

  showToast("Registro de aula salvo com sucesso!", "success");

  document.getElementById("registroAulaForm").reset();
  document.getElementById("chamadaContainer").style.display = "none";

  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("dataAula").value = hoje;

  mudarTab("dashboard");
};

// ==================== FUNÇÕES DE HISTÓRICO ====================

function carregarSelectHistorico() {
  const select = document.getElementById("filterEletivaHistorico");

  const eletivas = state.eletivas.filter(
    (e) => e.professorId === professorAtual.id,
  );

  select.innerHTML = '<option value="">Todas as eletivas</option>';
  eletivas.forEach((e) => {
    select.innerHTML += `<option value="${e.id}">${e.codigo} - ${e.nome}</option>`;
  });
}

window.mudarHistoricoSemestre = function (semestreId) {
  document
    .getElementById("hist2026-1")
    .classList.toggle("active", semestreId === "2026-1");
  document
    .getElementById("hist2026-2")
    .classList.toggle("active", semestreId === "2026-2");
  carregarHistorico();
};

window.filtrarHistorico = function () {
  carregarHistorico();
};

function carregarHistorico() {
  const container = document.getElementById("historicoAulas");
  const filtroEletiva = document.getElementById(
    "filterEletivaHistorico",
  )?.value;
  const semestreHistorico =
    document.querySelector(".historico-semestre-selector .btn-toggle.active")
      ?.id === "hist2026-2"
      ? "2026-2"
      : "2026-1";

  let registrosFiltrados = state.registros.filter(
    (r) =>
      r.professorId === professorAtual.id && r.semestreId === semestreHistorico,
  );

  if (filtroEletiva) {
    registrosFiltrados = registrosFiltrados.filter(
      (r) => r.eletivaId === parseInt(filtroEletiva),
    );
  }

  if (registrosFiltrados.length === 0) {
    container.innerHTML =
      '<p class="empty-state">Nenhum registro encontrado</p>';
    return;
  }

  container.innerHTML = "";

  registrosFiltrados
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .forEach((registro) => {
      const eletiva = state.eletivas.find((e) => e.id === registro.eletivaId);
      if (!eletiva) return;

      const isReadOnly = registro.semestreId !== state.semestreAtivo.id;

      const div = document.createElement("div");
      div.className = `registro-item ${isReadOnly ? "readonly" : ""}`;
      div.innerHTML = `
            <div class="registro-header">
                <span class="registro-data">${formatarData(registro.data)}</span>
                <span class="registro-turma">${eletiva.codigo}</span>
                ${isReadOnly ? '<span class="registro-badge">Semestre anterior</span>' : ""}
            </div>
            <div class="registro-conteudo">${registro.conteudo.substring(0, 100)}${registro.conteudo.length > 100 ? "..." : ""}</div>
            <div class="registro-frequencia">
                <span class="presentes">Presentes: ${registro.frequencia.presentes.length}</span>
                <span class="ausentes">Ausentes: ${registro.frequencia.ausentes.length}</span>
            </div>
        `;

      div.addEventListener("click", () =>
        abrirDetalhesRegistro(registro, isReadOnly),
      );
      container.appendChild(div);
    });
}

window.verHistoricoEletiva = function (eletivaId) {
  document.getElementById("filterEletivaHistorico").value = eletivaId;
  mudarTab("historico");
  carregarHistorico();
};

function abrirDetalhesRegistro(registro, isReadOnly) {
  const eletiva = state.eletivas.find((e) => e.id === registro.eletivaId);

  const alunosPresentes = registro.frequencia.presentes
    .map((codigo) => {
      const aluno = state.alunos.find((a) => a.codigoSige === codigo);
      return aluno ? `${aluno.nome} (${aluno.turmaOrigem})` : codigo;
    })
    .join("<br>");

  const alunosAusentes = registro.frequencia.ausentes
    .map((codigo) => {
      const aluno = state.alunos.find((a) => a.codigoSige === codigo);
      const justificativa = registro.frequencia.justificativas?.[codigo];
      return aluno
        ? `${aluno.nome} (${aluno.turmaOrigem})${justificativa ? ` - Just: ${justificativa}` : ""}`
        : codigo;
    })
    .join("<br>");

  document.getElementById("modalTitle").textContent =
    `Detalhes do Registro - ${formatarData(registro.data)}`;
  document.getElementById("modalBody").innerHTML = `
        <p><strong>Eletiva:</strong> ${eletiva.codigo} - ${eletiva.nome}</p>
        <p><strong>Data:</strong> ${formatarData(registro.data)}</p>
        <p><strong>Conteúdo:</strong> ${registro.conteudo}</p>
        ${registro.observacoes ? `<p><strong>Observações:</strong> ${registro.observacoes}</p>` : ""}
        
        <div style="margin-top: 1rem;">
            <p><strong>Presentes (${registro.frequencia.presentes.length}):</strong></p>
            <p style="color: var(--success);">${alunosPresentes || "Nenhum"}</p>
        </div>
        
        <div style="margin-top: 1rem;">
            <p><strong>Ausentes (${registro.frequencia.ausentes.length}):</strong></p>
            <p style="color: var(--danger);">${alunosAusentes || "Nenhum"}</p>
        </div>
    `;

  document.getElementById("modalFooter").innerHTML = `
        <button class="btn-secondary" onclick="fecharModal()">Fechar</button>
    `;

  document.getElementById("modalDetalhes").classList.add("active");
}

// ==================== LOGOUT ====================
window.fazerLogout = function () {
  localStorage.removeItem("professor_atual");
  window.location.href = "index.html";
};
