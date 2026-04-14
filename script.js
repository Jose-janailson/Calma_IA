const API_KEY = "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";
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

let historico = [];
let promptSistema = "";
let aguardando = false;
let nomeUsuario = "";

function mudarTela(idTela) {
  const telas = ["tela-inicio", "tela-entrevista", "tela-feedback"];
  telas.forEach(tela => {
    document.getElementById(tela).style.display = (tela === idTela) ? "flex" : "none";
  });
}

async function iniciarEntrevista() {
  const nome = document.getElementById("nome").value.trim();
  const vaga = document.getElementById("vaga").value.trim();
  const nivel = document.getElementById("nivel").value;
  const habilidades = document.getElementById("habilidades").value.trim();
  const tom = document.getElementById("tom").value;
  const msgErro = document.getElementById("msg-erro");

  if (!nome || !vaga) {
    msgErro.style.display = "block";
    return;
  }

  msgErro.style.display = "none";
  nomeUsuario = nome;

  const estiloTom = {
    formal: "Use linguagem formal, profissional e objetiva.",
    tecnica: "Seja focado na parte técnica e faça perguntas difíceis da área.",
    startup: "Seja bem descontraído, amigável e focado em inovação."
  }[tom];

  promptSistema = `Você é Ana, uma recrutadora experiente de RH.
Candidato: ${nome}
Vaga: ${vaga} (Nível: ${nivel})
${habilidades ? `Habilidades: ${habilidades}` : ""}
Estilo: ${estiloTom}

Regras:
- Aja como humano.
- No máximo 7 perguntas.
- Uma pergunta por vez.
- Sempre termine com uma pergunta clara até o encerramento.
- Responda em Português do Brasil.`;

  historico = [{ role: "system", content: promptSistema }];
  
  document.getElementById("area-chat").innerHTML = "";
  mudarTela("tela-entrevista");

  await chamarIA("Olá, cheguei para a entrevista.");
}

async function chamarIA(mensagemInicial) {
  if (aguardando) return;
  aguardando = true;
  
  const idDigitando = mostrarDigitando();
  if (mensagemInicial) historico.push({ role: "user", content: mensagemInicial });

  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: historico,
        temperature: 0.7
      })
    });

    const dados = await resposta.json();
    removerDigitando(idDigitando);

    const textoResposta = dados.choices[0].message.content;
    adicionarMensagem("ia", textoResposta);
    historico.push({ role: "assistant", content: textoResposta });

  } catch (erro) {
    removerDigitando(idDigitando);
    adicionarMensagem("ia", "Erro na conexão. Verifique sua internet ou API Key.");
  } finally {
    aguardando = false;
    document.getElementById("campo-resposta").focus();
  }
}

async function encerrarEntrevista() {
  document.getElementById("tela-entrevista").style.display = "none";
  document.getElementById("tela-feedback").style.display = "flex";
  document.getElementById("conteudo-feedback").textContent = "Gerando seu feedback com Inteligência Artificial. Aguarde um momento...";

  let transcricao = "";
  for (let i = 1; i < historico.length; i++) {
    const quemFalou = historico[i].role === "user" ? nomeUsuario : "Recrutadora";
    transcricao += quemFalou + ": " + historico[i].content + "\n\n";
  }

  const promptFeedback =
    "Você é um especialista em carreira. Leia a transcrição da entrevista abaixo e crie um feedback honesto.\n\n" +
    "Siga exatamente este formato:\n" +
    "🟢 PONTOS FORTES: (liste o que foi bom)\n" +
    "🟡 O QUE MELHORAR: (liste onde o candidato errou ou foi vago)\n" +
    "💡 DICAS: (dê 3 dicas práticas para o futuro)\n" +
    "⭐ NOTA FINAL: (dê uma nota de 0 a 10 e explique em uma frase)\n\n" +
    "Transcrição da entrevista:\n" + transcricao;

  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // <-- AQUI TAMBÉM FOI ATUALIZADO
        messages:[
          { role: "user", content: promptFeedback }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const dados = await resposta.json();

    if (dados.error) {
      throw new Error(dados.error.message);
    }

    document.getElementById("conteudo-feedback").textContent = dados.choices[0].message.content;

  } catch (erro) {
    document.getElementById("conteudo-feedback").textContent = "Não foi possível gerar o feedback: " + erro.message;
  }
}

async function enviarMensagem() {
  const campo = document.getElementById("campo-resposta");
  const texto = campo.value.trim();

  if (!texto || aguardando) return;

  campo.value = "";
  campo.style.height = "auto";

  adicionarMensagem("usuario", texto);
  historico.push({ role: "user", content: texto });

  await chamarIA(null);
}

function adicionarMensagem(tipo, texto) {
  const area = document.getElementById("area-chat");
  const linha = document.createElement("div");
  linha.className = `linha-msg ${tipo === "usuario" ? "usuario" : ""}`;

  const inicial = tipo === "usuario" ? (nomeUsuario[0] || "U").toUpperCase() : "A";
  
  linha.innerHTML = `
    <div class="mini-avatar ${tipo === "ia" ? "ia" : "user"}">${inicial}</div>
    <div class="balao ${tipo === "ia" ? "ia" : "usuario"}">${texto.replace(/\n/g, "<br>")}</div>
  `;

  area.appendChild(linha);
  area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
}

function reiniciar() {
  historico =[];
  document.getElementById("tela-feedback").style.display = "none";
  document.getElementById("tela-inicio").style.display = "flex";
  document.getElementById("area-chat").innerHTML = "";
}

function mostrarDigitando() {
  const area = document.getElementById("area-chat");
  const id = "dig-" + Date.now();
  const linha = document.createElement("div");
  linha.className = "linha-msg";
  linha.id = id;
  linha.innerHTML =
    '<div class="mini-avatar ia">A</div>' +
    '<div class="digitando">' +
      '<div class="ponto"></div>' +
      '<div class="ponto"></div>' +
      '<div class="ponto"></div>' +
    "</div>";
  area.appendChild(linha);
  area.scrollTop = area.scrollHeight;
  return id;
}

function removerDigitando(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function teclaEnter(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    enviarMensagem();
  }
}

function ajustarAltura(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 130) + "px";
}


