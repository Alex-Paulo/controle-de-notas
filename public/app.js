// Espera todo o HTML da página ser carregado antes de rodar o código
document.addEventListener("DOMContentLoaded", () => {

    // ==================== Variáveis Globais ====================
    const API = "/api";
    let token = localStorage.getItem("token");
    let notas = [];
    let grafico = null;
    let idEmEdicao = null;

    // ==================== Função Helper de Data ====================
    function formatarDataBR(dataISO) {
        if (!dataISO) return ""; 
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    // ==================== Seleção de Elementos (DOM) ====================
    // (Seleciona os elementos UMA VEZ para evitar repetição)
    
    // Tela de Login
    const loginBox = document.getElementById("loginBox");
    const appBox = document.getElementById("app");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const loginUser = document.getElementById("loginUser");
    const loginPass = document.getElementById("loginPass");
    const regUser = document.getElementById("regUser");
    const regPass = document.getElementById("regPass");
    
    // Botões de Login/Registro
    const btnLogin = document.getElementById("btnLogin");
    const btnRegister = document.getElementById("btnRegister");
    const showRegister = document.getElementById("showRegister");
    const showLogin = document.getElementById("showLogin");
    const btnLogout = document.getElementById("logout");

    // Formulário de Notas
    const btnAddNota = document.getElementById("addNota");
    const btnCancelEdit = document.getElementById("cancelEdit");
    
    // Busca e Exportação
    const caixaBusca = document.getElementById("caixaBusca");
    const btnExportExcel = document.getElementById("exportExcel");
    const filtroMes = document.getElementById("filtroMes");
    const resetarFiltro = document.getElementById("resetarFiltro");

    // ==================== LÓGICA DE LOGIN/REGISTRO (Eventos) ====================

    btnLogin.onclick = async () => {
        const username = loginUser.value.trim();
        const password = loginPass.value.trim();
        if (!username || !password) return alert("Preencha usuário e senha");

        try {
            const res = await fetch(API + "/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) return alert(data.error);
            localStorage.setItem("token", data.token);
            token = data.token;
            showApp();
        } catch (err) {
            alert("Erro ao conectar ao servidor.");
        }
    };

    btnRegister.onclick = async () => {
        const username = regUser.value.trim();
        const password = regPass.value.trim();
        if (!username || !password) return alert("Preencha usuário e senha");

        try {
            const res = await fetch(API + "/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) return alert(data.error);
            localStorage.setItem("token", data.token);
            token = data.token;
            showApp();
        } catch (err) {
            alert("Erro ao registrar.");
        }
    };

    btnLogout.onclick = () => {
        localStorage.removeItem("token");
        location.reload();
    };

    showRegister.onclick = (e) => {
        e.preventDefault(); 
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
    };

    showLogin.onclick = (e) => {
        e.preventDefault();
        registerForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
    };

    // ==================== LOGIN/REGISTRO COM "ENTER" ====================

// Função helper para checar a tecla "Enter"
function handleEnterKey(event, buttonToClick) {
    if (event.key === "Enter") {
        event.preventDefault(); // Impede o "Enter" de fazer outras coisas
        buttonToClick.click(); // Simula o clique no botão
    }
}

// "Escuta" o Enter nos campos de Login
loginUser.addEventListener("keyup", (e) => handleEnterKey(e, btnLogin));
loginPass.addEventListener("keyup", (e) => handleEnterKey(e, btnLogin));

// "Escuta" o Enter nos campos de Registro
regUser.addEventListener("keyup", (e) => handleEnterKey(e, btnRegister));
regPass.addEventListener("keyup", (e) => handleEnterKey(e, btnRegister));

    // ==================== LÓGICA DA BUSCA ====================
    caixaBusca.addEventListener("input", renderizarTudo);

    // LÓGICA DO FILTRO DE MÊS
filtroMes.addEventListener("change", renderizarTudo);

resetarFiltro.onclick = () => {
    filtroMes.value = ""; // Limpa o seletor de mês
    renderizarTudo();     // Renderiza tudo de novo
};

    // ==================== FUNÇÃO MESTRE DE RENDERIZAÇÃO ====================
function renderizarTudo() {
    // Pega os valores atuais de TODOS os filtros
    const mesFiltro = filtroMes.value; // ex: "2025-12"
    const termoBusca = caixaBusca.value.toLowerCase();

    // 1. FILTRAR LISTA PARA O RESUMO (Apenas por Mês)
    let notasParaResumo = notas;
    if (mesFiltro) { // Se um mês foi selecionado
        notasParaResumo = notas.filter(n => n.data.startsWith(mesFiltro));
    }

    // 2. FILTRAR LISTA PARA A TABELA (Mês E Busca)
    const notasParaTabela = notasParaResumo.filter(n => 
        (n.empresa || "").toLowerCase().includes(termoBusca) || 
        (n.numero || "").toLowerCase().includes(termoBusca) || 
        (n.observacoes || "").toLowerCase().includes(termoBusca)
    );

    // 3. ATUALIZAR OS COMPONENTES
    // Passa a lista filtrada por mês para o resumo
    atualizarResumo(notasParaResumo); 
    // Passa a lista duplamente filtrada (mês + busca) para a tabela
    renderTabela(notasParaTabela);
    // O gráfico SEMPRE mostra o total de todos os meses (passa a lista completa)
    atualizarGrafico(notas); 
}

    // ==================== LÓGICA PRINCIPAL DO APP ====================
    
    function showApp() {
        loginBox.classList.add("hidden");
        appBox.classList.remove("hidden");
        carregarNotas();
    }

    // ==================== LÓGICA DO FORMULÁRIO (Resetar/Preencher) ====================

    btnCancelEdit.onclick = (e) => {
        e.preventDefault();
        resetarFormulario();
    };

    function resetarFormulario() {
        document.getElementById("data").value = "";
        document.getElementById("empresa").value = "";
        document.getElementById("numero").value = "";
        document.getElementById("valor").value = "";
        document.getElementById("obs").value = "";
        idEmEdicao = null;
        btnAddNota.textContent = "Adicionar";
        btnCancelEdit.classList.add("hidden");
    }

    function preencherFormularioParaEditar(nota) {
        document.getElementById("data").value = nota.data;
        document.getElementById("empresa").value = nota.empresa;
        document.getElementById("numero").value = nota.numero;
        document.getElementById("valor").value = nota.valor;
        document.getElementById("obs").value = nota.observacoes;

        idEmEdicao = nota.id;
        
        btnAddNota.textContent = "Salvar Alterações";
        btnCancelEdit.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ==================== CRUD (Create, Read, Update, Delete) ====================

    async function carregarNotas() {
        try {
            const res = await fetch(API + "/notas", {
                headers: { Authorization: "Bearer " + token }
            });
            if (!res.ok) { // Trata tokens expirados ou inválidos
                 localStorage.removeItem("token");
                 location.reload();
                 return;
            }
            notas = await res.json();
            renderizarTudo();

        } catch (err) {
            console.error("Erro ao carregar notas:", err);
            alert("Não foi possível carregar os dados.");
        }
    }

    btnAddNota.onclick = async () => {
        const data = document.getElementById("data").value;
        const empresa = document.getElementById("empresa").value.trim();
        const numero = document.getElementById("numero").value.trim();
        const valor = parseFloat(document.getElementById("valor").value);
        const observacoes = document.getElementById("obs").value.trim();

        if (!data || !empresa || !numero || isNaN(valor)) return alert("Preencha todos os campos obrigatórios (Data, Empresa, Número, Valor)");

        const notaData = { data, empresa, numero, valor, observacoes };
        
        let url = API + "/notas";
        let method = "POST";

        if (idEmEdicao) {
            url = `${API}/notas/${idEmEdicao}`;
            method = "PUT";
        }

        await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify(notaData)
        });
        
        resetarFormulario();
        carregarNotas();
    };

    async function excluirNota(id) {
        if (!confirm("Tem certeza de que deseja excluir esta nota?")) {
            return;
        }
        await fetch(API + "/notas/" + id, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token }
        });
        carregarNotas();
    }

    // ==================== TABELA (Renderização Robusta) ====================
    function renderTabela(notasParaMostrar) {
        const tbody = document.querySelector("#tabelaNotas tbody");
        tbody.innerHTML = "";

        const termoBusca = caixaBusca.value.toLowerCase();

        const notasFiltradas = notas.filter(n => 
            (n.empresa || "").toLowerCase().includes(termoBusca) || 
            (n.numero || "").toLowerCase().includes(termoBusca) || 
            (n.observacoes || "").toLowerCase().includes(termoBusca)
        );

        notasParaMostrar.forEach(n => {
            const tr = document.createElement("tr");
            
            // Cria as células
            tr.innerHTML = `
                <td>${formatarDataBR(n.data)}</td>
                <td>${n.empresa}</td>
                <td>${n.numero}</td>
                <td>R$ ${n.valor.toFixed(2)}</td>
                <td>${n.observacoes || ""}</td>
            `;

            // === CRIA OS BOTÕES E ADICIONA EVENTOS (Forma Robusta) ===
            const tdAcoes = document.createElement("td");
            tdAcoes.style.display = "flex";
            tdAcoes.style.gap = "5px";

            // Botão Editar
            const btnEditar = document.createElement("button");
            btnEditar.innerHTML = "✏️";
            btnEditar.style.cssText = "width: auto; padding: 5px 10px; font-size: 13px; background-color: #ffc107;";
            btnEditar.addEventListener('click', () => {
                // Encontra a nota mais recente (caso o array 'notas' tenha mudado)
                const notaParaEditar = notas.find(nota => nota.id === n.id);
                preencherFormularioParaEditar(notaParaEditar);
            });

            // Botão Excluir
            const btnExcluir = document.createElement("button");
            btnExcluir.innerHTML = "🗑️";
            btnExcluir.style.cssText = "width: auto; padding: 5px 10px; font-size: 13px; background-color: #dc3545;";
            btnExcluir.addEventListener('click', () => {
                excluirNota(n.id);
            });

            tdAcoes.appendChild(btnEditar);
            tdAcoes.appendChild(btnExcluir);
            tr.appendChild(tdAcoes);
            
            tbody.appendChild(tr);
        });
    }

    // ==================== RESUMO ====================
    function atualizarResumo(notasParaMostrar) {
        const totalNotas = notasParaMostrar.length;
        const totalValor = notasParaMostrar.reduce((s, n) => s + n.valor, 0);
        
        const diasUnicos = [...new Set(notasParaMostrar.map(n => n.data))].length;
        const mediaDia = diasUnicos ? (totalNotas / diasUnicos) : 0;

        const mesesUnicosGlobal = [...new Set(notas.map(n => n.data.substring(0, 7)))].length;
        const mediaMes = mesesUnicosGlobal ? (notas.length / mesesUnicosGlobal) : 0;

        const mesesUnicosFiltro = [...new Set(notasParaMostrar.map(n => n.data.substring(0, 7)))].length;
        const mediaMesFiltro = mesesUnicosFiltro ? (totalNotas / mesesUnicosFiltro) : 0;

        document.getElementById("resTotalNotas").textContent = totalNotas;
        document.getElementById("resTotalValor").textContent = totalValor.toFixed(2);
        document.getElementById("resMediaDia").textContent = mediaDia.toFixed(1);
        document.getElementById("resMediaMes").textContent = mediaMesFiltro.toFixed(1); 
    }

    // ==================== GRÁFICO ====================
    function atualizarGrafico(notasParaMostrar)  {
        const dadosPorMes = {};
        notasParaMostrar.forEach(n => {
            const mes = n.data.substring(0, 7); 
            if (!dadosPorMes[mes]) dadosPorMes[mes] = 0;
            dadosPorMes[mes] += n.valor;
        });

        const labels = Object.keys(dadosPorMes).sort();
        const valores = labels.map(mes => dadosPorMes[mes]);

        if (grafico) grafico.destroy();

        const ctx = document.getElementById("grafico").getContext("2d");
        grafico = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Total Pago por Mês (R$)",
                    data: valores,
                    backgroundColor: 'rgba(0, 123, 255, 0.6)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // ==================== EXPORTAÇÃO EXCEL ====================
    btnExportExcel.onclick = () => {
        if (notas.length === 0) {
            return alert("Não há notas para exportar.");
        }
        const dados = notas.map(n => ({
            Data: formatarDataBR(n.data), 
            Empresa: n.empresa,
            Numero: n.numero,
            Valor: n.valor,
            Observações: n.observacoes || ""
        }));

        try {
            const ws = XLSX.utils.json_to_sheet(dados);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Notas");
            XLSX.writeFile(wb, "notas_fiscais.xlsx");
        } catch (err) {
            console.error("Falha ao exportar Excel:", err);
            alert("Ocorreu um erro ao gerar o arquivo Excel. Verifique o console.");
        }
    };

    // ==================== INICIALIZAÇÃO ====================
    if (token) {
        showApp();
    } else {
        // Se não houver token, não faz nada, fica na tela de login
    }

}); // Fim do "DOMContentLoaded"