// js/utils.js - Funções utilitárias e configurações

// ==================== CONFIGURAÇÕES GLOBAIS ====================
const CONFIG = {
  // URL da planilha Google Sheets (via Apps Script)
  planilhaURL:
    "https://script.google.com/a/macros/prof.ce.gov.br/s/AKfycbzPTTma4CvqGvZTcL38-ZhqwgthWCZGyvN9cVAVSz0jwQWp8vp-QyKgOsZ6EXWArKeL/exec",

  // Nomes das abas na planilha
  abas: {
    alunos: "Estudantes",
    professores: "Professores",
    fixas: "Eletivas Fixas",
    mistas: "Eletivas Mistas",
  },

  storageKeys: {
    alunos: "sage_alunos_2026",
    professores: "sage_professores_2026",
    eletivas: "sage_eletivas_2026",
    matriculas: "sage_matriculas_2026",
    registros: "sage_registros_2026",
    semestres: "sage_semestres_2026",
    remocoes: "sage_remocoes_2026",
    ultimaSincronizacao: "sage_ultima_sincronizacao",
  },

  turmas: [
    "1ª SÉRIE A",
    "1ª SÉRIE B",
    "1ª SÉRIE C",
    "2ª SÉRIE A",
    "2ª SÉRIE B",
    "2ª SÉRIE C",
    "3ª SÉRIE A",
    "3ª SÉRIE B",
    "3ª SÉRIE C",
  ],

  series: ["1ª", "2ª", "3ª"],
  diasSemana: ["segunda", "terca", "quarta", "quinta", "sexta"],

  mapeamentoTempos: {
    T1: {
      diaSemana: "segunda",
      tempo: 1,
      seriesPermitidas: ["1ª", "2ª", "3ª"],
    },
    T2: { diaSemana: "quinta", tempo: 2, seriesPermitidas: ["1ª", "3ª"] },
    T3: { diaSemana: "terca", tempo: 3, seriesPermitidas: ["1ª"] },
    T4: { diaSemana: "sexta", tempo: 4, seriesPermitidas: ["1ª"] },
    T5: { diaSemana: "quarta", tempo: 5, seriesPermitidas: ["1ª"] },
  },

  horarios: [
    { tempo: 1, codigo: "T1", descricao: "1º Tempo (07:00 - 08:40)" },
    { tempo: 2, codigo: "T2", descricao: "2º Tempo (08:55 - 10:35)" },
    { tempo: 3, codigo: "T3", descricao: "3º Tempo (10:50 - 12:30)" },
    { tempo: 4, codigo: "T4", descricao: "4º Tempo (13:30 - 15:10)" },
    { tempo: 5, codigo: "T5", descricao: "5º Tempo (15:25 - 17:05)" },
  ],
};

// ==================== TOAST ====================
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ==================== FORMATAÇÃO ====================
function formatarData(data) {
  if (!data) return "";
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarDataHora(data) {
  if (!data) return "";
  return new Date(data).toLocaleString("pt-BR");
}

// ==================== TURMAS ====================
function getSerieFromTurma(turma) {
  if (!turma) return "1ª";
  if (turma.includes("ª")) {
    return turma.substring(0, turma.indexOf("ª") + 1);
  }
  return turma.substring(0, turma.indexOf(" ")) + "ª";
}

function normalizarTurma(turma) {
  if (!turma) return turma;
  if (!turma.includes("ª") && turma.includes(" SÉRIE ")) {
    const partes = turma.split(" SÉRIE ");
    const numero = partes[0].trim();
    const letra = partes[1].trim();
    return `${numero}ª SÉRIE ${letra}`;
  }
  return turma;
}

// ==================== ID ====================
function gerarIdUnico() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// ==================== MODAIS ====================
function abrirModalConfirmacao(titulo, mensagem, callback) {
  const modal = document.getElementById("modalConfirmacao");
  if (!modal) {
    if (confirm(`${titulo}\n\n${mensagem}`)) {
      callback();
    }
    return;
  }

  document.getElementById("confirmTitle").textContent = titulo;
  document.getElementById("confirmBody").innerHTML = mensagem;

  const confirmBtn = document.getElementById("confirmActionBtn");
  confirmBtn.onclick = () => {
    callback();
    fecharModalConfirmacao();
  };

  modal.classList.add("active");
}

function fecharModalConfirmacao() {
  const modal = document.getElementById("modalConfirmacao");
  if (modal) {
    modal.classList.remove("active");
  }
}

function fecharModal() {
  const modal = document.getElementById("modalDetalhes");
  if (modal) {
    modal.classList.remove("active");
  }
}

// ==================== VALIDAÇÕES ====================
function validarFormatoTurma(turma) {
  const regexComAcento = /^[1-3]ª SÉRIE [A-C]$/;
  const regexSemAcento = /^[1-3] SÉRIE [A-C]$/;
  return regexComAcento.test(turma) || regexSemAcento.test(turma);
}

function validarCPF(cpf) {
  return /^\d{11}$/.test(cpf);
}

function validarCodigoTempo(codigo) {
  return ["T1", "T2", "T3", "T4", "T5"].includes(codigo);
}

function validarSeriePermitida(serie, tempo) {
  const horario = CONFIG.mapeamentoTempos[tempo];
  return horario && horario.seriesPermitidas.includes(serie);
}

// ==================== THEME ====================
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", newTheme);

  const icon = document.querySelector("#themeToggle i");
  if (icon) {
    icon.className = newTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }

  localStorage.setItem("sage_theme", newTheme);
}

function carregarTheme() {
  const savedTheme = localStorage.getItem("sage_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  const icon = document.querySelector("#themeToggle i");
  if (icon) {
    icon.className = savedTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }
}

// ==================== EXPORTS ====================
window.CONFIG = CONFIG;
window.showToast = showToast;
window.formatarData = formatarData;
window.formatarDataHora = formatarDataHora;
window.getSerieFromTurma = getSerieFromTurma;
window.normalizarTurma = normalizarTurma;
window.gerarIdUnico = gerarIdUnico;
window.abrirModalConfirmacao = abrirModalConfirmacao;
window.fecharModalConfirmacao = fecharModalConfirmacao;
window.fecharModal = fecharModal;
window.validarFormatoTurma = validarFormatoTurma;
window.validarCPF = validarCPF;
window.validarCodigoTempo = validarCodigoTempo;
window.validarSeriePermitida = validarSeriePermitida;
window.toggleTheme = toggleTheme;
window.carregarTheme = carregarTheme;
