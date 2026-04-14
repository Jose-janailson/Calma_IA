const API_KEY = "API AQui";
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

let historico =[];
let promptSistema = "";
let aguardando = false;
let nomeUsuario = "";

function iniciarEntrevista() {
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

  promptSistema =
    "Você é Ana, uma recrutadora experiente de RH.\n" +
    "Candidato: " + nome + "\n" +
    "Vaga: " + vaga + " (Nível: " + nivel + ")\n" +
    (habilidades ? "Habilidades do candidato: " + habilidades + "\n" : "") +
    "Estilo da entrevista: " + estiloTom + "\n\n" +
    "Regras obrigatórias:\n" +
    "- Haja como uma pessoa real, não diga que é uma IA.\n" +
    "- Faça uma entrevista de emprego de verdade, com 5 a 8 perguntas no total.\n" +
    "- Mande apenas uma pergunta por vez. Espere o candidato responder.\n" +
    "- Comente a resposta do candidato brevemente antes de fazer a próxima pergunta.\n" +
    "- Quando achar que já fez perguntas suficientes, agradeça e diga que a entrevista acabou.\n" +
    "- Responda sempre em português do Brasil.";

  historico = [
    { role: "system", content: promptSistema }
  ];

  document.getElementById("tela-inicio").style.display = "none";
  document.getElementById("tela-entrevista").style.display = "flex";
  document.getElementById("area-chat").innerHTML = "";

  chamarIA("Olá, cheguei para a entrevista.");
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

async function chamarIA(mensagemInicial) {
  aguardando = true;
  const idDigitando = mostrarDigitando();

  if (mensagemInicial) {
      historico.push({ role: "user", content: mensagemInicial });
  }

  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // <-- AQUI FOI ATUALIZADO
        messages: historico,
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const dados = await resposta.json();

    if (dados.error) {
      throw new Error(dados.error.message);
    }

    const textoResposta = dados.choices[0].message.content;

    removerDigitando(idDigitando);
    adicionarMensagem("ia", textoResposta);

    historico.push({ role: "assistant", content: textoResposta });

  } catch (erro) {
    removerDigitando(idDigitando);
    adicionarMensagem("ia", "Erro na IA: " + erro.message);
  }

  aguardando = false;
  document.getElementById("campo-resposta").focus();
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

function reiniciar() {
  historico =[];
  document.getElementById("tela-feedback").style.display = "none";
  document.getElementById("tela-inicio").style.display = "flex";
  document.getElementById("area-chat").innerHTML = "";
}

function adicionarMensagem(tipo, texto) {
  const area = document.getElementById("area-chat");
  const linha = document.createElement("div");
  linha.className = "linha-msg" + (tipo === "usuario" ? " usuario" : "");

  const inicial = tipo === "usuario" ? (nomeUsuario[0] || "U").toUpperCase() : "A";
  const classeAvatar = tipo === "ia" ? "ia" : "user";
  const classeBalao = tipo === "ia" ? "ia" : "usuario";
  
  const textoSeguro = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  linha.innerHTML =
    '<div class="mini-avatar ' + classeAvatar + '">' + inicial + "</div>" +
    '<div class="balao ' + classeBalao + '">' + textoSeguro + "</div>";

  area.appendChild(linha);
  area.scrollTop = area.scrollHeight;
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
