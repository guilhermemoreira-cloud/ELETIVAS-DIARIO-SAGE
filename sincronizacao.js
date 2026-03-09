// js/sincronizacao.js - Carregando dados do arquivo JSON local

async function carregarDadosDaPlanilha() {
  console.log("📦 Carregando dados do arquivo local...");

  try {
    showToast("Carregando dados...", "info");

    // Carregar o arquivo JSON local
    const response = await fetch("js/dados-planilha.json");

    if (!response.ok) {
      throw new Error(`Erro ao carregar arquivo: ${response.status}`);
    }

    const data = await response.json();

    console.log("✅ Arquivo JSON carregado com sucesso!");
    console.log("📊 Estatísticas:", data.estatisticas);

    // Processar os dados
    processarDadosPlanilha(data.dados);

    // Salvar timestamp
    const agora = new Date().toISOString();
    state.ultimaSincronizacao = agora;
    localStorage.setItem(CONFIG.storageKeys.ultimaSincronizacao, agora);

    // Atualizar interface se existir
    const spanSinc = document.getElementById("ultimaSincronizacao");
    if (spanSinc) {
      spanSinc.innerHTML = `<i class="fas fa-check-circle" style="color: green;"></i> Dados carregados: ${new Date(agora).toLocaleString("pt-BR")}`;
    }

    showToast(
      `Dados carregados! ${data.estatisticas.alunos} alunos, ${data.estatisticas.professores} professores`,
      "success",
    );

    return true;
  } catch (error) {
    console.error("❌ Erro ao carregar dados:", error);
    showToast("Erro ao carregar dados. Usando fallback.", "error");

    // Usar fallback em caso de erro
    carregarDadosFallback();
    return false;
  }
}

function processarDadosPlanilha(dados) {
  console.log("🔄 Processando dados da planilha...");

  // Processar professores
  if (dados.professores && dados.professores.length > 0) {
    const professores = dados.professores.map((p, index) => ({
      id: index + 1,
      nome: p.nome || "",
      email: p.email || "",
      cpf: p.cpf ? p.cpf.toString().replace(/\D/g, "") : "",
      perfil: p.perfil || "PROFESSOR",
    }));
    state.professores = professores;
    localStorage.setItem(
      CONFIG.storageKeys.professores,
      JSON.stringify(professores),
    );
    console.log(`✅ ${professores.length} professores processados`);
  }

  // Processar alunos
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
    state.alunos = alunos;
    localStorage.setItem(CONFIG.storageKeys.alunos, JSON.stringify(alunos));
    console.log(`✅ ${alunos.length} alunos processados`);
  }

  // Processar eletivas fixas
  if (dados.eletivasFixas && dados.eletivasFixas.length > 0) {
    const fixas = dados.eletivasFixas.map((f, index) => {
      const professor = state.professores.find((p) => p.nome === f.professor);
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

    state.eletivas = fixas;
    localStorage.setItem(CONFIG.storageKeys.eletivas, JSON.stringify(fixas));
    console.log(`✅ ${fixas.length} eletivas fixas processadas`);
  }

  // Como não há eletivas mistas, criar matrículas básicas para as fixas
  criarMatriculasBasicas();

  // Atualizar contadores
  state.nextId = {
    aluno: state.alunos.length + 1,
    professor: state.professores.length + 1,
    eletiva: state.eletivas.length + 1,
    matricula: (state.matriculas?.length || 0) + 1,
    registro: 1,
  };
  localStorage.setItem("sage_nextId_2026", JSON.stringify(state.nextId));

  // Salvar estado completo
  if (typeof salvarEstado === "function") {
    salvarEstado();
  }
}

function criarMatriculasBasicas() {
  console.log("📝 Criando matrículas para eletivas fixas...");

  const matriculas = [];
  let idCounter = 1;

  state.eletivas.forEach((eletiva) => {
    if (eletiva.tipo === "FIXA" && eletiva.turmaOrigem) {
      // Buscar alunos da mesma turma
      const alunosTurma = state.alunos.filter(
        (a) => a.turmaOrigem === eletiva.turmaOrigem,
      );

      alunosTurma.forEach((aluno) => {
        // Verificar se o aluno já não está matriculado nesta eletiva
        const jaMatriculado = matriculas.some(
          (m) => m.alunoId === aluno.id && m.eletivaId === eletiva.id,
        );

        if (!jaMatriculado) {
          matriculas.push({
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

  state.matriculas = matriculas;
  localStorage.setItem(
    CONFIG.storageKeys.matriculas,
    JSON.stringify(matriculas),
  );
  console.log(`✅ ${matriculas.length} matrículas criadas`);
}

function carregarDadosFallback() {
  console.log("📦 Carregando dados de fallback...");

  // Dados mínimos para fallback
  state.professores = [
    {
      id: 1,
      nome: "Professor Exemplo",
      email: "professor@exemplo.com",
      perfil: "PROFESSOR",
    },
  ];

  state.alunos = [
    {
      id: 1,
      nome: "Aluno Exemplo",
      codigoSige: "2024001",
      turmaOrigem: "1ª SÉRIE A",
      serie: "1ª",
    },
  ];

  state.eletivas = [
    {
      id: 1,
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

  state.matriculas = [
    { id: 1, alunoId: 1, eletivaId: 1, semestreId: "2026-1" },
  ];

  salvarEstado();
  console.log("✅ Dados de fallback carregados");
}

// Função para recarregar dados (útil para o gestor)
window.recarregarDados = async function () {
  await carregarDadosDaPlanilha();
  if (typeof window.carregarTodosDados === "function") {
    window.carregarTodosDados();
  }
};

// Exportar funções
window.carregarDadosDaPlanilha = carregarDadosDaPlanilha;
window.recarregarDados = recarregarDados;
