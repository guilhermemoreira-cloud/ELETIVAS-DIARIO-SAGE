// js/storage.js - GERENCIAMENTO DE ESTADO (sem redirecionamento)

let state = {
  alunos: [],
  professores: [],
  eletivas: [],
  matriculas: [],
  registros: [],
  semestres: [],
  remocoes: [],
  nextId: {
    aluno: 1,
    professor: 1,
    eletiva: 1,
    matricula: 1,
    registro: 1,
  },
};

function carregarEstado() {
  console.log("📊 Carregando estado do localStorage...");

  state.professores =
    JSON.parse(localStorage.getItem(CONFIG.storageKeys.professores)) || [];
  state.alunos =
    JSON.parse(localStorage.getItem(CONFIG.storageKeys.alunos)) || [];
  state.eletivas =
    JSON.parse(localStorage.getItem(CONFIG.storageKeys.eletivas)) || [];
  state.matriculas =
    JSON.parse(localStorage.getItem(CONFIG.storageKeys.matriculas)) || [];
  state.registros =
    JSON.parse(localStorage.getItem(CONFIG.storageKeys.registros)) || [];
  state.semestres =
    JSON.parse(localStorage.getItem(CONFIG.storageKeys.semestres)) || [];
  state.remocoes =
    JSON.parse(localStorage.getItem(CONFIG.storageKeys.remocoes)) || [];

  const nextId = JSON.parse(localStorage.getItem("sage_nextId_2026")) || {
    aluno: state.alunos.length + 1,
    professor: state.professores.length + 1,
    eletiva: state.eletivas.length + 1,
    matricula: state.matriculas.length + 1,
    registro: state.registros.length + 1,
  };
  state.nextId = nextId;

  state.semestreAtivo =
    state.semestres.find((s) => s.ativo) || state.semestres[0];

  console.log(`✅ Estado carregado:`);
  console.log(`   - Professores: ${state.professores.length}`);
  console.log(`   - Alunos: ${state.alunos.length}`);
  console.log(`   - Eletivas: ${state.eletivas.length}`);
  console.log(`   - Matrículas: ${state.matriculas.length}`);
  console.log(`   - Registros: ${state.registros.length}`);
  console.log(`   - Semestre ativo: ${state.semestreAtivo?.id || "Nenhum"}`);

  return state;
}

function salvarEstado() {
  console.log("💾 Salvando estado no localStorage...");

  localStorage.setItem(
    CONFIG.storageKeys.professores,
    JSON.stringify(state.professores),
  );
  localStorage.setItem(CONFIG.storageKeys.alunos, JSON.stringify(state.alunos));
  localStorage.setItem(
    CONFIG.storageKeys.eletivas,
    JSON.stringify(state.eletivas),
  );
  localStorage.setItem(
    CONFIG.storageKeys.matriculas,
    JSON.stringify(state.matriculas),
  );
  localStorage.setItem(
    CONFIG.storageKeys.registros,
    JSON.stringify(state.registros),
  );
  localStorage.setItem(
    CONFIG.storageKeys.semestres,
    JSON.stringify(state.semestres),
  );
  localStorage.setItem(
    CONFIG.storageKeys.remocoes,
    JSON.stringify(state.remocoes),
  );
  localStorage.setItem("sage_nextId_2026", JSON.stringify(state.nextId));

  console.log("✅ Estado salvo no localStorage");

  if (
    window.FirebaseSync &&
    typeof window.FirebaseSync.salvarDadosFirebase === "function"
  ) {
    setTimeout(() => {
      window.FirebaseSync.salvarDadosFirebase("alunos", state.alunos);
      window.FirebaseSync.salvarDadosFirebase("professores", state.professores);
      window.FirebaseSync.salvarDadosFirebase("eletivas", state.eletivas);
      window.FirebaseSync.salvarDadosFirebase("matriculas", state.matriculas);
      window.FirebaseSync.salvarDadosFirebase("semestres", state.semestres);
      window.FirebaseSync.salvarDadosFirebase("remocoes", state.remocoes);
    }, 100);
  }
}

function getNextId(tipo) {
  const id = state.nextId[tipo];
  state.nextId[tipo] += 1;
  salvarEstado();
  return id;
}

function atualizarIndicadorSemestre() {
  const badge = document.getElementById("semestreAtivoBadge");
  if (badge && state.semestreAtivo) {
    badge.textContent = `${state.semestreAtivo.id} - ATIVO`;
  }
}

function getEstatisticas() {
  return {
    totalAlunos: state.alunos.length,
    totalProfessores: state.professores.length,
    totalEletivas: state.eletivas.length,
    totalMatriculas: state.matriculas.length,
  };
}

window.state = state;
window.carregarEstado = carregarEstado;
window.salvarEstado = salvarEstado;
window.getNextId = getNextId;
window.atualizarIndicadorSemestre = atualizarIndicadorSemestre;
window.getEstatisticas = getEstatisticas;
