// js/sincronizacao.js - Carregando dados do arquivo JSON local

async function carregarDadosDaPlanilha() {
  console.log("📦 Carregando dados...");

  // Tentar Firebase primeiro
  if (
    window.FirebaseSync &&
    typeof window.FirebaseSync.carregarDadosFirebase === "function"
  ) {
    try {
      const registros =
        await window.FirebaseSync.carregarDadosFirebase("registros");
      if (registros && registros.length > 0) {
        console.log("✅ Dados carregados do Firebase");
        showToast("Dados carregados do Firebase", "success");
        return true;
      }
    } catch (error) {
      console.warn("⚠️ Erro ao carregar Firebase, usando fallback:", error);
    }
  }

  console.log("📦 Carregando dados do arquivo local...");

  try {
    showToast("Carregando dados...", "info");

    const response = await fetch("js/dados-planilha.json");

    if (!response.ok) {
      throw new Error(`Erro ao carregar arquivo: ${response.status}`);
    }

    const data = await response.json();

    console.log("✅ Arquivo JSON carregado com sucesso!");
    console.log("📊 Estatísticas:", data.estatisticas);

    processarDadosPlanilha(data.dados);

    const agora = new Date().toISOString();
    if (window.state) {
      window.state.ultimaSincronizacao = agora;
    }
    localStorage.setItem(CONFIG.storageKeys.ultimaSincronizacao, agora);

    const spanSinc = document.getElementById("ultimaSincronizacao");
    if (spanSinc) {
      spanSinc.innerHTML = `<i class="fas fa-check-circle" style="color: green;"></i> Dados carregados: ${new Date(agora).toLocaleString("pt-BR")}`;
    }

    showToast(
      `Dados carregados! ${data.estatisticas.alunos} alunos, ${data.estatisticas.professores} professores`,
      "success",
    );

    // Salvar no Firebase em background
    if (
      window.FirebaseSync &&
      typeof window.FirebaseSync.salvarDadosFirebase === "function"
    ) {
      setTimeout(() => {
        if (window.state) {
          window.FirebaseSync.salvarDadosFirebase(
            "alunos",
            window.state.alunos,
          );
          window.FirebaseSync.salvarDadosFirebase(
            "professores",
            window.state.professores,
          );
          window.FirebaseSync.salvarDadosFirebase(
            "eletivas",
            window.state.eletivas,
          );
          window.FirebaseSync.salvarDadosFirebase(
            "matriculas",
            window.state.matriculas,
          );
        }
      }, 500);
    }

    return true;
  } catch (error) {
    console.error("❌ Erro ao carregar dados:", error);
    showToast("Erro ao carregar dados. Usando dados padrão.", "error");

    // Usar dados padrão em caso de erro
    carregarDadosPadrao();
    return false;
  }
}

function processarDadosPlanilha(dados) {
  console.log("🔄 Processando dados da planilha...");

  if (dados.professores && dados.professores.length > 0) {
    const professores = dados.professores.map((p, index) => ({
      id: index + 1,
      nome: p.nome || "",
      email: p.email || "",
      cpf: p.cpf ? p.cpf.toString().replace(/\D/g, "") : "",
      perfil: p.perfil || "PROFESSOR",
    }));
    window.state.professores = professores;
    localStorage.setItem(
      CONFIG.storageKeys.professores,
      JSON.stringify(professores),
    );
    console.log(`✅ ${professores.length} professores processados`);
  }

  if (dados.alunos && dados.alunos.length > 0) {
    const alunos = dados.alunos.map((a, index) => {
      const turma = a.turma || "";
      return {
        id: index + 1,
        nome: a.nome || "",
        codigoSige: a.sige ? a.sige.toString() : "",
        turmaOrigem: normalizarTurma(turma),
        serie: getSerieFromTurma(turma),
      };
    });
    window.state.alunos = alunos;
    localStorage.setItem(CONFIG.storageKeys.alunos, JSON.stringify(alunos));
    console.log(`✅ ${alunos.length} alunos processados`);
  }

  if (dados.eletivasFixas && dados.eletivasFixas.length > 0) {
    const fixas = dados.eletivasFixas.map((f, index) => {
      const professor = window.state.professores?.find(
        (p) => p.nome === f.professor,
      );
      const tempo = f.tempo || "T1";
      const horario = CONFIG.mapeamentoTempos[tempo] || {
        diaSemana: "?",
        seriesPermitidas: ["1ª", "2ª", "3ª"],
      };

      return {
        id: index + 1000,
        codigo: f.codigo || "",
        nome: f.nome || "",
        tipo: "FIXA",
        professorId: professor?.id || 1,
        professorNome: professor?.nome || f.professor || "",
        horario: {
          diaSemana: horario.diaSemana || "?",
          codigoTempo: tempo,
        },
        local: f.local || "A DEFINIR",
        vagas: 40,
        seriesPermitidas: horario.seriesPermitidas || ["1ª", "2ª", "3ª"],
        turmaOrigem: normalizarTurma(f.turma || ""),
        semestreId: "2026-1",
      };
    });

    window.state.eletivas = fixas;
    localStorage.setItem(CONFIG.storageKeys.eletivas, JSON.stringify(fixas));
    console.log(`✅ ${fixas.length} eletivas fixas processadas`);
  }

  // Inicializar matriculas se não existir
  if (!window.state.matriculas) {
    window.state.matriculas = [];
  }

  criarMatriculasBasicas();

  // Atualizar contadores
  if (!window.state.nextId) {
    window.state.nextId = {
      aluno: (window.state.alunos?.length || 0) + 1,
      professor: (window.state.professores?.length || 0) + 1,
      eletiva: (window.state.eletivas?.length || 0) + 1,
      matricula: (window.state.matriculas?.length || 0) + 1,
      registro: 1,
    };
  }
  localStorage.setItem("sage_nextId_2026", JSON.stringify(window.state.nextId));

  if (typeof window.salvarEstado === "function") {
    window.salvarEstado();
  }
}

function criarMatriculasBasicas() {
  console.log("📝 Criando matrículas para eletivas fixas...");

  if (!window.state.matriculas) {
    window.state.matriculas = [];
  }

  let idCounter = window.state.matriculas.length + 1;

  window.state.eletivas?.forEach((eletiva) => {
    if (eletiva.tipo === "FIXA" && eletiva.turmaOrigem) {
      const alunosTurma =
        window.state.alunos?.filter(
          (a) => a.turmaOrigem === eletiva.turmaOrigem,
        ) || [];

      alunosTurma.forEach((aluno) => {
        const jaMatriculado = window.state.matriculas.some(
          (m) => m.alunoId === aluno.id && m.eletivaId === eletiva.id,
        );

        if (!jaMatriculado) {
          window.state.matriculas.push({
            id: idCounter++,
            eletivaId: eletiva.id,
            alunoId: aluno.id,
            tipoMatricula: "automática",
            dataMatricula: new Date().toISOString().split("T")[0],
            semestreId: "2026-1",
          });
        }
      });
    }
  });

  localStorage.setItem(
    CONFIG.storageKeys.matriculas,
    JSON.stringify(window.state.matriculas),
  );
  console.log(`✅ ${window.state.matriculas.length} matrículas criadas`);
}

// FUNÇÃO CORRIGIDA - Dados padrão em vez de fallback
function carregarDadosPadrao() {
  console.log("📦 Carregando dados padrão...");

  // Garantir que window.state existe
  if (!window.state) {
    window.state = {};
  }

  // Professores padrão
  window.state.professores = [
    {
      id: 1,
      nome: "Professor Exemplo",
      email: "professor@exemplo.com",
      perfil: "PROFESSOR",
    },
  ];

  // Alunos padrão
  window.state.alunos = [
    {
      id: 1,
      nome: "Aluno Exemplo",
      codigoSige: "2024001",
      turmaOrigem: "1ª SÉRIE A",
      serie: "1ª",
    },
    {
      id: 2,
      nome: "Aluno Exemplo 2",
      codigoSige: "2024002",
      turmaOrigem: "1ª SÉRIE A",
      serie: "1ª",
    },
  ];

  // Eletivas padrão
  window.state.eletivas = [
    {
      id: 1000,
      codigo: "EX001",
      nome: "Eletiva Exemplo",
      tipo: "FIXA",
      professorId: 1,
      professorNome: "Professor Exemplo",
      horario: { diaSemana: "Segunda", codigoTempo: "T1" },
      vagas: 40,
      seriesPermitidas: ["1ª", "2ª", "3ª"],
      turmaOrigem: "1ª SÉRIE A",
      semestreId: "2026-1",
    },
  ];

  // Matrículas padrão
  window.state.matriculas = [
    { id: 1, alunoId: 1, eletivaId: 1000, semestreId: "2026-1" },
    { id: 2, alunoId: 2, eletivaId: 1000, semestreId: "2026-1" },
  ];

  // Registros vazio
  window.state.registros = [];

  // Semestres
  window.state.semestres = [
    {
      id: "2026-1",
      nome: "1º Semestre 2026",
      ano: 2026,
      periodo: 1,
      ativo: true,
    },
    {
      id: "2026-2",
      nome: "2º Semestre 2026",
      ano: 2026,
      periodo: 2,
      ativo: false,
    },
  ];

  // Salvar no localStorage
  localStorage.setItem(
    CONFIG.storageKeys.professores,
    JSON.stringify(window.state.professores),
  );
  localStorage.setItem(
    CONFIG.storageKeys.alunos,
    JSON.stringify(window.state.alunos),
  );
  localStorage.setItem(
    CONFIG.storageKeys.eletivas,
    JSON.stringify(window.state.eletivas),
  );
  localStorage.setItem(
    CONFIG.storageKeys.matriculas,
    JSON.stringify(window.state.matriculas),
  );
  localStorage.setItem(CONFIG.storageKeys.registros, JSON.stringify([]));
  localStorage.setItem(
    CONFIG.storageKeys.semestres,
    JSON.stringify(window.state.semestres),
  );

  if (typeof window.salvarEstado === "function") {
    window.salvarEstado();
  }

  console.log("✅ Dados padrão carregados");
}

// Recarregar dados
window.recarregarDados = async function () {
  await carregarDadosDaPlanilha();
  if (typeof window.carregarTodosDados === "function") {
    window.carregarTodosDados();
  }
};

// Exportar funções
window.carregarDadosDaPlanilha = carregarDadosDaPlanilha;
window.recarregarDados = recarregarDados;
