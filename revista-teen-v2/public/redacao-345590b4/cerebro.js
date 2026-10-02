// Cérebro local da Revista Teen: monta os textos do post sem chamar IA nenhuma.
// Pipeline: limpa o artigo (lixo de site, chamadas de vídeo), divide em frases, dá nota a
// cada frase (posição, título, novidade, datas), escolhe as melhores, deixa o tom mais leve
// (futuro com "vai", palavras mais simples) e monta títulos curtos a partir do título
// original ou, se ele for só chamada, da frase de abertura.
// Ele não inventa fato: toda informação vem de uma frase do artigo.
// ponytail: radical = 6 primeiras letras sem acento; trocar por um stemmer de verdade
// (RSLP) se a escolha de frases começar a errar por causa de plural ou conjugação.
(function (root) {
  "use strict";

  const ANO = new Date().getFullYear();
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

  const STOP = new Set(norm(
    "a o as os um uma uns umas de da do das dos em na no nas nos por pela pelo pelas pelos para pra com sem sob " +
    "sobre entre ate e ou mas que se como quando onde ja nao sim mais menos muito muita muitos muitas ao aos " +
    "foi sao ser sera seu sua seus suas ele ela eles elas isso isto esse essa este esta aquele aquela tambem " +
    "ainda apos antes depois tem ter ha nesta neste nessa nesse desta deste dessa desse num numa lhe lhes " +
    "porque pois entao assim segundo cada outro outra outros outras todo toda todos todas qual quais"
  ).split(" "));

  const ABREV = new Set(["sr", "sra", "srta", "dr", "dra", "prof", "profa", "av", "n", "no", "nº", "p", "pag",
    "ex", "vs", "jr", "bros", "cap", "fig", "tel", "eng", "dep", "sen", "gov", "pres", "gen", "cel", "ten", "sgt",
    "vol", "ed", "art", "ltda", "cia", "jan", "fev", "abr", "jun", "jul", "ago", "set", "out", "nov", "dez", "st"]);

  // ---------- Regras do brandbook: sem travessão, emoji e hashtag ----------
  function limpar(t) {
    return String(t || "")
      .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
      .replace(/(^|\s)#([\p{L}\d_]+)/gu, "$1$2")
      .replace(/[ \t]*--+[ \t]*/g, ", ")
      .replace(/^[ \t]*[‒-―-][ \t]*/gm, "")
      .replace(/([.!?:;]?)[ \t]*[‒-―][ \t]*/g, (m, p) => (p ? p + " " : ", "))
      .replace(/([.!?:;]?)[ \t]+-[ \t]+/g, (m, p) => (p ? p + " " : ", "))
      .replace(/[ \t]+([,.;:!?])/g, "$1")
      .replace(/,(\s*,)+/g, ",")
      .replace(/([!?:;]),/g, "$1")
      .replace(/,(\s*[.!?])/g, "$1")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/^[ \t]*,[ \t]*/gm, "")
      .trim();
  }

  // ---------- 1. Limpeza do artigo ----------
  const LIXO_LINHA = /^(leia (tamb[eé]m|mais)|veja (tamb[eé]m|mais)|saiba mais|publicidade|continua (depois|ap[oó]s)|siga |assine|clique|compartilhe|foto:|fotos:|imagem:|cr[eé]dito|reprodu[cç][aã]o|\(foto|an[uú]ncio|newsletter)/i;
  const LIXO_FRASE = /coment[aá]rios? (s[aã]o|ser[aá]|de responsabilidade)|termos (e condi|de uso)|pol[ií]tica de privacidade|\bcookies\b|fa[cç]a login|\bdenuncie\b|newsletter|pular para o conte|compartilhar mat[eé]ria|todos os direitos|baixe o app|\bsiga @|leia (tamb[eé]m|mais)|veja (tamb[eé]m|mais)|saiba mais:|publicidade|continua (depois|ap[oó]s)|\bassine\b|persist[eê]ncia na viola|banimento da sua conta|(um|uma) (post|publica[cç][aã]o) compartilhad[ao] por|ver essa foto no instagram|\(@[\w.]+\)/i;
  const SO_MIDIA = /^(veja|confira|assista)\b[^.!?]{0,40}[.:!]?$/i;
  const CLAUSULA_MIDIA = /,?\s*\b(assista|veja|confira)\b[^.;,]{0,40}\b(acima|abaixo|aqui|no v[ií]deo|o v[ií]deo|ao v[ií]deo|ao trailer|[àa] pr[eé]via)\b/gi;
  const PREFIXO_CONFIRA = /^(confira|veja|leia|conhe[cç]a)(\s(a|o|as|os))?(\s\p{L}+){0,3}:\s*/iu;

  // Assinatura ("Fulana, da CNN Brasil"), data de publicação e legenda de foto com crédito.
  const ASSINATURA = /^[\p{Lu}][\p{L}'’.\- ]{2,40}, d[aoe]s? [\p{Lu}][\p{L} ]{1,30}$/u;
  const DATA_PUBLICACAO = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b.*\b\d{1,2}[:h]\d{2}\b/;
  const LEGENDA_FOTO = /\s[•|]\s*[\p{L}\d .\/-]{2,40}$/u;
  const FINA = "\u0002"; // marca a linha fina (o subtítulo logo abaixo do título)

  // Linha sem pontuação final no meio do texto é manchete de "veja também" ou botão; só a
  // primeira (a linha fina) fica, e com marca, porque costuma ser o melhor resumo da notícia.
  function limparArtigo(t) {
    const linhas = String(t || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !LIXO_LINHA.test(l) && !/https?:\/\/|www\.|\bsiga @/i.test(l))
      .filter((l) => !ASSINATURA.test(l) && !DATA_PUBLICACAO.test(l) && !(l.length < 120 && LEGENDA_FOTO.test(l)));
    return linhas
      .map((l, k) => (/[.!?]["”']?$/.test(l) ? l : k === 0 && l.length >= 30 ? FINA + l : ""))
      .filter(Boolean)
      .join("\n")
      .replace(/\((foto|imagem|reprodu[cç][aã]o)[^)]*\)/gi, "")
      .replace(/\[[^\]]*\]/g, "");
  }

  const grudado = (f) => (f.match(/[a-zà-ú][A-ZÀ-Ú]/g) || []).length >= 3; // menu do site colado no texto

  function partirLinha(t) {
    const out = [];
    let ini = 0, m;
    const re = /[.!?…]+["”’)]*(?=\s+["“(]?[A-ZÁÉÍÓÚÂÊÔÃÕÀÇ0-9])/g;
    while ((m = re.exec(t))) {
      const antes = t.slice(ini, m.index).split(/\s+/).pop() || "";
      const palavra = norm(antes.replace(/^[("“]+/, ""));
      if (ABREV.has(palavra) || /^[A-ZÁÉÍÓÚ]$/.test(antes)) continue; // "Dr. Silva", "J. K. Rowling"
      out.push(t.slice(ini, m.index + m[0].length).trim());
      ini = m.index + m[0].length;
    }
    out.push(t.slice(ini).trim());
    return out.filter(Boolean);
  }

  // Cada linha do artigo vira uma ou mais frases. Linha que faz parte de uma lista (3 ou mais
  // linhas curtas seguidas) leva a marca "lista", para pesar menos.
  function frasesComInfo(texto) {
    const linhas = limpar(limparArtigo(texto)).split(/\s*\n+\s*/).filter(Boolean);
    const c = linhas.map((l) => l.length < 110);
    const lista = c.map((x, k) => x && ((c[k - 1] && c[k + 1]) || (c[k + 1] && c[k + 2]) || (c[k - 1] && c[k - 2])));
    const vistas = new Set(), out = [];
    linhas.forEach((linhaBruta, k) => {
      const fina = linhaBruta.startsWith(FINA), linha = linhaBruta.replace(FINA, "");
      for (let f of partirLinha(linha)) {
        if (grudado(f)) { // menu do site colado: aproveita só o que vem depois da última emenda
          const m = [...f.matchAll(/[a-zà-ú0-9)](?=[A-ZÀ-Ú])/g)].pop();
          f = m ? f.slice(m.index + 1) : "";
        }
        f = f.replace(PREFIXO_CONFIRA, "").replace(CLAUSULA_MIDIA, "").trim();
        if (!f) continue;
        f = cap(/[.!?…]["”’)]*$/.test(f) ? f : f + ".");
        const chave = norm(f);
        if (f.length < 25 || f.length > 450 || vistas.has(chave)) continue;
        if (LIXO_FRASE.test(f) || SO_MIDIA.test(f) || /:\.?$/.test(f) || grudado(f)) continue;
        if ((f.match(/["“”]/g) || []).length % 2) continue; // pedaço de citação que começou em outra frase
        vistas.add(chave);
        out.push({ f, lista: lista[k], fina, citacao: fracaoCitacao(f) >= 0.45 });
      }
    });
    return out;
  }

  const dividirFrases = (texto) => frasesComInfo(texto).map((x) => x.f);

  // Quanto da frase está entre aspas: frase que é quase só fala de alguém é citação.
  function fracaoCitacao(f) {
    const dentro = (f.match(/["“][^"”]{8,}["”]/g) || []).reduce((a, q) => a + q.length, 0);
    return dentro / Math.max(1, f.length);
  }

  // ---------- 2. Tom: mais leve, sem mudar o fato ----------
  const FUT_IRREG = {
    "será": "vai ser", "serão": "vão ser", "terá": "vai ter", "terão": "vão ter", "fará": "vai fazer", "farão": "vão fazer",
    "dirá": "vai dizer", "dirão": "vão dizer", "haverá": "vai ter", "poderá": "vai poder", "poderão": "vão poder",
    "estará": "vai estar", "estarão": "vão estar", "trará": "vai trazer", "trarão": "vão trazer", "irá": "vai", "irão": "vão",
    "virá": "vai vir", "virão": "vão vir", "dará": "vai dar", "darão": "vão dar", "verá": "vai ver",
  };
  const NAO_VERBO = new Set(["verão", "pará", "ceará", "guará"]);
  const TROCAS = [
    [/\badquirir\b/g, "comprar"], [/\bpossui\b/g, "tem"], [/\bpossuem\b/g, "têm"], [/\bpossuía\b/g, "tinha"],
    [/\bencontra-se\b/g, "está"], [/\btrata-se de\b/g, "é"], [/\ba fim de\b/g, "para"], [/\bdevido ao\b/g, "por causa do"],
    [/\bdevido à\b/g, "por causa da"], [/\bdevido a\b/g, "por causa de"], [/\bse inicia\b/g, "começa"], [/\biniciou\b/g, "começou"],
    [/\binicia\b/g, "começa"], [/\biniciar\b/g, "começar"], [/\bafirmou\b/g, "disse"], [/\bdeclarou\b/g, "disse"],
    [/\bdentre\b/g, "entre"], [/\b(o|ao|no|do) País\b/g, "$1 país"], [/\bo mesmo\b(?= (dia|ano|mês|lugar))/g, "o mesmo"],
  ];
  const CONECTIVO = /^(al[eé]m disso|felizmente|infelizmente|entretanto|no entanto|contudo|por[eé]m|ainda assim|enquanto isso|vale lembrar que|vale destacar que|por outro lado|dessa forma|desta forma|assim),?\s+/i;

  function futuroComVai(s) {
    return s.replace(/(^|[^\p{L}])(?:(se|me|te|nos|lhe) )?(\p{L}+)(?![\p{L}])/gu, (todo, pre, pron, w) => {
      const lw = w.toLowerCase();
      const maiuscula = w[0] !== lw[0];
      let out = null;
      if (FUT_IRREG[lw] && !(maiuscula && lw === "irão")) out = FUT_IRREG[lw].replace(" ", pron ? " " + pron + " " : " ");
      else if (!maiuscula && !NAO_VERBO.has(lw)) {
        const m = lw.match(/^(\p{L}{2,}?)(ar|er|ir)(á|ão)$/u);
        if (m) out = (m[3] === "á" ? "vai " : "vão ") + (pron ? pron + " " : "") + m[1] + m[2];
      }
      if (!out) return todo;
      return pre + (maiuscula ? cap(out) : out);
    });
  }

  function jovem(s, { semParenteses = false } = {}) {
    let t = futuroComVai(s);
    for (const [re, por] of TROCAS) t = t.replace(re, por);
    t = t.replace(/\s\(\d{1,2}º?\)/g, ""); // "nesta quarta-feira (17)", "(1º)"
    if (semParenteses) t = t.replace(/\s*\([^)]{1,80}\)/g, "");
    t = t
      .replace(/(\p{Lu}[\p{L}.]*(?:\s\p{Lu}[\p{L}.]*)+)\s\((["“][^"”]+["”])\)/gu, "$1, de $2,") // Iñárritu ("O Regresso") → Iñárritu, de "O Regresso",
      .replace(/\s\(\p{Lu}[\p{L}]+(?:\s\p{Lu}[\p{L}]+)?\)/gu, ""); // personagem (Cruise) → personagem
    return t.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").replace(/,\s*,/g, ",").replace(/,([.!?])/g, "$1").trim();
  }
  const semConectivo = (f) => cap(f.replace(CONECTIVO, ""));

  // ---------- 3. Nota de cada frase ----------
  const radicais = (s) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.slice(0, 6));
  const MESES = "janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";
  const QUANDO = new RegExp("\\b(" + MESES + "|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo|hoje|amanha|amanhã)\\b|\\b\\d{1,2}/\\d{1,2}\\b", "i");
  const NOVIDADE = /\b(estreia|estreiam|estrear|lança|lançam|lançar|lançamento|confirm|anunci|chega|chegam|chegar|começa|começam|começar|volta|voltam|revela|divulg|ganha|ganham|vence|vai|vão|data|ingressos?|trailer|temporada|novo|nova)\w*/i;
  const VOZ_DE_BLOG = /\b(n[oó]s|sabemos|separamos|vemos|temos|fomos|estamos|podemos|achamos|queremos|contamos|mostramos|trouxemos|nossa|nosso|nossos|nossas|voc[eê]s?|te contamos|a gente)\b/i;
  const REFERE_ANTERIOR = /^(ele|ela|eles|elas|isso|isto|o ator|a atriz|o cantor|a cantora|o grupo|a banda|o artista)\b|\btamb[eé]m\b/i;
  const anosVelhos = (f) => (f.match(/\b(19|20)\d{2}\b/g) || []).map(Number).filter((a) => a < ANO - 1).length;

  function pontuar(itens, titulo) {
    const frases = itens.map((x) => x.f);
    const tf = new Map();
    for (const f of frases) for (const r of new Set(radicais(f))) tf.set(r, (tf.get(r) || 0) + 1);
    const maxTf = Math.max(1, ...tf.values());
    const rt = new Set(radicais(titulo));
    const n = frases.length;
    return frases.map((f, i) => {
      const rs = [...new Set(radicais(f))];
      const centro = rs.length ? rs.reduce((a, r) => a + tf.get(r), 0) / rs.length / maxTf : 0;
      const doTitulo = rt.size ? rs.filter((r) => rt.has(r)).length / rt.size : 0;
      let s = (1 - i / Math.max(1, n)) * 0.6 + doTitulo * 1.2 + centro * 0.5;
      if (QUANDO.test(f)) s += 0.35;
      if (NOVIDADE.test(f)) s += 0.25;
      s -= Math.min(2, anosVelhos(f)) * 0.3; // histórico, não novidade
      if (VOZ_DE_BLOG.test(f)) s -= 0.7;
      if (REFERE_ANTERIOR.test(f)) s -= 0.3;
      if (f.length < 30) s -= 0.6;
      if (f.length > 280) s -= 0.4;
      if ((f.match(/R\$/g) || []).length > 1 || /^[\p{L} -]{2,25}:/u.test(f)) s -= 0.5; // item de lista
      if (itens[i].lista) s -= 0.6;
      if (itens[i].fina) s += 0.9;            // linha fina: o resumo que o próprio jornal escreveu
      if (i === n - 1 && n > 4) s += 0.25;    // fecho costuma trazer elenco, onde ver, próxima data
      if (itens[i].citacao) s -= 0.2;
      return { f, i, s, blog: VOZ_DE_BLOG.test(f) };
    });
  }

  // ---------- 4. Títulos ----------
  const ORDINAIS = { primeira: "1ª", segunda: "2ª", terceira: "3ª", quarta: "4ª", quinta: "5ª", sexta: "6ª", "sétima": "7ª", oitava: "8ª" };
  const encurtarOrdinal = (t) => t.replace(/\b(primeira|segunda|terceira|quarta|quinta|sexta|sétima|oitava) (temporada|parte|edição|fase)\b/gi, (m, o, w) => ORDINAIS[o.toLowerCase()] + " " + w);
  const PASSADO = [["confirmou", "confirma"], ["confirmaram", "confirmam"], ["anunciou", "anuncia"], ["anunciaram", "anunciam"],
    ["ganhou", "ganha"], ["ganharam", "ganham"], ["lançou", "lança"], ["revelou", "revela"], ["divulgou", "divulga"],
    ["venceu", "vence"], ["estreou", "estreia"], ["chegou", "chega"], ["voltou", "volta"], ["recebeu", "recebe"],
    ["bateu", "bate"], ["quebrou", "quebra"], ["conquistou", "conquista"], ["apresentou", "apresenta"], ["liberou", "libera"],
    ["publicou", "publica"], ["postou", "posta"], ["perdeu", "perde"], ["deixou", "deixa"], ["assinou", "assina"],
    ["entrou", "entra"], ["saiu", "sai"], ["morreu", "morre"], ["fez", "faz"]];
  const VERBOS = new Set(norm("ganha ganham anuncia anunciam confirma confirmam estreia estreiam lanca lancam chega chegam volta voltam " +
    "vence revela divulga comeca comecam sai saem recebe bate quebra conquista apresenta libera publica posta perde deixa assina " +
    "entra morre faz fazem vai vao e sao tem tera terao promete celebra leva traz retorna encerra cancela adia renova renovada " +
    "divide dividem surpreende emociona encanta vira viraliza rebate responde reage explica critica elogia homenageia mostra exibe " +
    "supera bomba lidera domina conquista atinge arrecada esgota esgotam ganhou").split(" "));
  const temVerbo = (s) => norm(s).split(/[^a-z0-9]+/).some((w) => VERBOS.has(w));
  const TEMPO_REL = /,?\s*\b(nest[ae]|ness[ae]) (segunda|terça|quarta|quinta|sexta)(-feira)?\b|,?\s*\b(neste|nesse) (sábado|domingo)\b|,?\s*\b(hoje|ontem)\b/gi;
  const CHAMADA = /\s*[;,.!:]?\s*\b(veja|confira|saiba|entenda|assista)\b.*$/i;
  const GENERICO = /^(o |a )?(novo |nova )?(filme|série|serie|anime|produção|longa|jogo|game|álbum|disco|banda|grupo|cantor|cantora|ator|atriz|novela|reality|livro|mangá|desenho|animação)\b/i;
  const FORTE_ANTES = new Set(["e", "com", "para", "pra", "apos", "mas", "sem", "durante", "depois", "antes", "enquanto", "porque", "pois"]);
  const MARCA_TEMPO = new RegExp("^(\\d|" + norm(MESES) + "|segunda|terca|quarta|quinta|sexta|sabado|domingo|este|esse|o fim|maio)");

  function tirarSufixoDeSite(t) {
    return String(t || "").trim().replace(/\s+[•·\-–—]\s+(\S+\s?){1,3}$/, "").trim();
  }

  // Corta só em fronteira natural: antes de "e", "com", "para", pontuação, ou de uma marca de tempo.
  // Verbo que não fecha título sozinho ("ganha" o quê?).
  const PEDE_COMPLEMENTO = new Set(norm("ganha ganham anuncia anunciam confirma confirmam lanca lancam revela revelam divulga divulgam recebe recebem " +
    "faz fazem tem tem tera terao vai vao e sao apresenta apresentam libera publica posta assina deixa leva traz promete celebra bate quebra conquista").split(" "));

  // Corta só em fronteira natural: antes de "e", "com", "para", pontuação, ou de uma marca de tempo.
  // Devolve o corte e a nota dele, para comparar versões diferentes do mesmo título.
  function cortarTitulo(t, max, entidade) {
    const s = limpar(t).replace(/[.]+$/, "");
    const bonus = (x) => (temVerbo(x) ? 0.4 : 0) + (entidade && x.includes(entidade) ? 0.5 : 0);
    if (s.length <= max) return { s, nota: s.length / max + 1.1 + bonus(s) };
    const w = s.split(/\s+/);
    let melhor = null;
    for (let k = 2; k < w.length; k++) {
      const pre = w.slice(0, k).join(" ").replace(/[,;:]+$/, "");
      if (pre.length > max || pre.length < 12) continue;
      const prox = norm(w[k]).replace(/[^a-z0-9]/g, "");
      const forte = /[,;:!]$/.test(w[k - 1]) || FORTE_ANTES.has(prox) ||
        (["em", "ate", "a", "nesta", "neste", "no", "na", "entre"].includes(prox) && MARCA_TEMPO.test(norm(w[k + 1] || "")));
      const ultima = norm(w[k - 1]).replace(/[^a-z]/g, "");
      let nota = pre.length / max + (forte ? 0.8 : 0) + bonus(pre);
      if (STOP.has(ultima)) nota -= 2;
      if (PEDE_COMPLEMENTO.has(ultima)) nota -= 1.5;
      if (!melhor || nota > melhor.nota) melhor = { nota, s: pre };
    }
    if (melhor) return melhor;
    const out = [];
    for (const p of w) { if (out.concat(p).join(" ").length > max) break; out.push(p); }
    while (out.length > 1 && STOP.has(norm(out[out.length - 1]).replace(/[^a-z]/g, ""))) out.pop();
    return { s: out.join(" ").replace(/[,:;]+$/, ""), nota: -1 };
  }
  const tituloCurto = (t, max, entidade) => cortarTitulo(t, max, entidade).s;

  // Frase de abertura vira manchete: presente, sem "nesta quarta", sem artigo no começo.
  function manchete(f) {
    let s = f.replace(/[.!?]+$/, "").replace(/\s*\([^)]*\)/g, "");
    const m = s.match(/^(O |A |Os |As )?(.+?) (confirmou|anunciou|revelou|divulgou|contou) que (?:o |a |os |as )?(?:seu|sua|seus|suas) (.+?) (vai|vão) (.+)$/);
    if (m) {
      const de = m[1] ? { "O ": "do ", "A ": "da ", "Os ": "dos ", "As ": "das " }[m[1]] : "de ";
      s = m[4] + " " + de + m[2] + " " + m[5] + " " + m[6];
    } else {
      s = s.replace(/^(O|A|Os|As) /, "");
      for (const [p, q] of PASSADO) s = s.replace(new RegExp("\\b" + p + "\\b"), q);
    }
    return cap(s.replace(TEMPO_REL, "").replace(/\s{2,}/g, " ").trim());
  }

  function titulos(tituloOriginal, lead) {
    let t = limpar(tirarSufixoDeSite(tituloOriginal)).replace(/\s*\([^)]*\)/g, "");
    let entidade = null, variantes = [];
    const partes = t.split(/\s+\|\s+/);
    if (partes.length > 1) { entidade = partes[0]; t = partes[0] + ": " + partes.slice(1).join(" "); }
    const semChamada = t.replace(CHAMADA, "").trim();
    let base = semChamada.length >= 15 ? semChamada : lead ? manchete(jovem(lead)) : t;
    base = base.replace(/[.!]+$/, "");
    const dois = base.match(/^(.{3,40}?): (.+)$/);
    if (dois) {
      entidade = entidade || dois[1];
      const y = dois[2];
      if (GENERICO.test(y)) { // "Coyote vs. Acme: Filme abandonado pela Warner ganha trailer" → "Coyote vs. Acme ganha trailer"
        const ws = y.split(/\s+/), k = ws.findIndex((x) => VERBOS.has(norm(x)));
        if (k > 0) variantes.push(dois[1] + " " + ws.slice(k).join(" "));
      }
    }
    // "De 'desastre' a 'espetacular', novo filme de Tom Cruise divide opiniões": a notícia está
    // depois da vírgula; a parte de depois vira candidata quando tem verbo.
    for (const m of base.matchAll(/[,;]\s+/g)) {
      const resto = base.slice(m.index + m[0].length);
      if (resto.length >= 15 && temVerbo(resto)) variantes.push(cap(resto));
    }
    variantes.push(base);
    const ig = variantes.map((v) => cortarTitulo(encurtarOrdinal(jovem(v, { semParenteses: true })), 48, entidade))
      .sort((a, b) => b.nota - a.nota)[0].s;
    return { ig: cap(ig), site: cap(tituloCurto(jovem(base, { semParenteses: true }), 110, entidade)) };
  }

  // ---------- 5. Parágrafos ----------
  function emTres(frases) {
    if (frases.length <= 3) return [0, 1, 2].map((k) => frases[k] || "");
    const pre = [0];
    for (const f of frases) pre.push(pre[pre.length - 1] + f.length);
    const n = frases.length;
    let melhor = null;
    for (let a = 1; a < n - 1; a++) for (let b = a + 1; b < n; b++) {
      const l = [pre[a], pre[b] - pre[a], pre[n] - pre[b]], d = Math.max(...l) - Math.min(...l);
      if (!melhor || d < melhor.d) melhor = { a, b, d };
    }
    return [frases.slice(0, melhor.a), frases.slice(melhor.a, melhor.b), frases.slice(melhor.b)].map((p) => p.join(" "));
  }

  // Na ordem do artigo; tira "Além disso" quando a frase de antes não entrou.
  function costurar(escolhidas, opts) {
    const ord = [...escolhidas].sort((a, b) => a.i - b.i);
    const aposto = new Set(); // ', de "O Regresso",' só na primeira vez que aparece
    return ord.map((p, k) => {
      const anteriorEntrou = k > 0 && ord[k - 1].i === p.i - 1;
      const f = jovem(p.f, opts).replace(/, de ["“][^"”]+["”],/g, (m) => (aposto.has(m) ? "" : (aposto.add(m), m)));
      return anteriorEntrou ? f : semConectivo(f);
    });
  }

  // ---------- 6. Selo ----------
  // Só 3 selos, os mesmos das editorias do site. Entretenimento é o padrão: é o assunto de
  // quase tudo (83 das 99 matérias do site em 01/10/2026), então Moda e Educação só ganham
  // quando as palavras delas aparecem mais.
  const SELOS = [
    ["Entretenimento e Famosos", "futebol gol gols brasileirao libertadores selecao neymar champions volei basquete nba tenis formula olimpiada " +
      "game games jogo jogos videogame playstation xbox nintendo fortnite minecraft roblox gta netflix prime disney globoplay hbo crunchyroll " +
      "spotify streaming filme filmes serie series temporada anime animes manga cinema cinemas bilheteria episodio elenco oscar ator atriz " +
      "show shows turne festival ingresso ingressos palco album single clipe cantor cantora banda influenciador influenciadora influencer " +
      "tiktok youtuber youtube seguidores viral famoso famosa famosos celebridade casal namoro casamento bbb reality meme kpop fandom army"],
    ["Moda e Beleza", "moda look looks beleza maquiagem skincare cabelo cabelos desfile grife perfume estilo roupa roupas tendencia unhas pele"],
    ["Educação e Cultura", "escola escolas enem vestibular universidade faculdade estudante estudantes educacao livro livros leitura museu " +
      "exposicao bienal curso cursos bolsa bolsas ensino professor professora aula aulas ciencia pesquisa estudo saude"],
  ].map(([nome, ws]) => [nome, new Set(ws.split(" "))]);

  function sugerirSelo(titulo, texto) {
    const conta = (t, chaves) => norm(t).split(/[^a-z0-9-]+/).filter((w) => chaves.has(w)).length;
    let melhor = { nome: SELOS[0][0], n: 0 };
    for (const [nome, chaves] of SELOS) {
      const n = conta(titulo, chaves) * 3 + conta(texto || "", chaves);
      if (n > melhor.n) melhor = { nome, n };
    }
    return melhor.nome;
  }

  // Legenda do Instagram: o título e as 1 ou 2 primeiras frases do texto. A fonte não entra
  // aqui: o app sempre acrescenta "Fonte original: X" na hora de copiar.
  function legenda(titulo, texto) {
    const frases = (limpar(texto).match(/[^.!?]+[.!?]+["”]?/g) || [limpar(texto)]).map((f) => f.trim()).filter(Boolean);
    let resumo = frases[0] || "";
    if (frases[1] && (resumo + " " + frases[1]).length <= 220) resumo += " " + frases[1];
    return [limpar(titulo), resumo].filter(Boolean).join("\n\n");
  }

  // ---------- Hashtags da legenda ----------
  // #revistateen sempre primeiro; depois a da editoria e até 3 nomes próprios do título.
  // Nome próprio = palavra com maiúscula que aparece com maiúscula também no meio de uma
  // frase do texto (assim "Série" no começo do título não vira hashtag, mas "Recreio" vira).
  const TAG_EDITORIA = { "Entretenimento e Famosos": "#entretenimento", "Moda e Beleza": "#modaebeleza", "Educação e Cultura": "#educacaoecultura" };
  const paraTag = (s) => "#" + norm(s).split(/[^a-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  const TAG_GENERICA = new Set(["brasil", "brasileiro", "brasileira", "mundo", "eua"]);
  function normalizarHashtags(texto) {
    const vistas = new Set(), out = [];
    for (const bruto of ["#revistateen", ...String(texto || "").split(/[\s,;]+/)]) {
      const nome = norm(bruto.replace(/^#+/, "")).replace(/[^a-z0-9_]/g, "");
      if (!nome || vistas.has(nome)) continue;
      vistas.add(nome);
      out.push("#" + bruto.replace(/^#+/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\d_]/gu, ""));
    }
    return out.join(" ");
  }
  // Nomes próprios do título (pessoas, obras, marcas): viram hashtag no Instagram e tag no site.
  function nomesDe(titulo, texto) {
    const t = limpar(titulo), corpo = " " + limpar(texto);
    const meioDeFrase = (w) => new RegExp("[^.!?]\\s" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "u").test(corpo);
    const nomes = [];
    const re = /(\p{Lu}[\p{L}\d'’]*(?:\s(?:\p{Lu}[\p{L}\d'’]*|\d+))*)/gu;
    let m;
    while ((m = re.exec(t)) && nomes.length < 3) {
      const nome = m[1], noComeco = m.index === 0;
      const ehNome = nome.includes(" ") || meioDeFrase(nome.split(" ")[0]) || !noComeco;
      if (ehNome && !STOP.has(norm(nome)) && !TAG_GENERICA.has(norm(nome)) && nome.length > 2) nomes.push(nome);
    }
    return nomes;
  }
  function hashtags(titulo, texto, selo) {
    return normalizarHashtags([TAG_EDITORIA[selo] || "", ...nomesDe(titulo, texto).map(paraTag)].join(" "));
  }
  const tags = (titulo, texto) => [...new Set(nomesDe(titulo, texto))];

  // Frase que diz quase o mesmo que uma já escolhida (metade das palavras em comum) fica de fora.
  // Só palavras comuns contam: nomes próprios se repetem em qualquer notícia.
  const comuns = (f) => new Set(radicais(f.replace(/(^|\s)["“(]?\p{Lu}[\p{L}.]*/gu, " ")));
  function repete(p, escolhidas) {
    const a = comuns(p.f);
    return escolhidas.some((q) => {
      const b = comuns(q.f);
      const comum = [...a].filter((r) => b.has(r)).length;
      return comum / Math.max(1, Math.min(a.size, b.size)) >= 0.5;
    });
  }

  // ---------- Tudo junto ----------
  function gerar({ titulo, artigo }) {
    const itens = frasesComInfo(artigo);
    const frases = itens.map((x) => x.f);
    const avisos = [];
    const pts = pontuar(itens, tirarSufixoDeSite(titulo) || "");
    const porNota = [...pts].sort((a, b) => b.s - a.s);
    const lead = pts.slice(0, 4).filter((p) => !p.blog && p.f.length >= 30).sort((a, b) => b.s - a.s)[0] || porNota[0];

    // Instagram: abertura + o que mais pesa, até ~380 caracteres.
    const ig = lead ? [lead] : [];
    let tam = lead ? lead.f.length : 0;
    for (const p of porNota) {
      if (ig.length >= 3) break;
      if (ig.includes(p) || p.blog || itens[p.i].citacao || p.f.length < 30 || p.s < Math.max(0, lead.s * 0.45) || tam + p.f.length + 1 > 420) continue;
      if (repete(p, ig)) continue;
      ig.push(p); tam += p.f.length + 1;
    }

    // Site: as frases mais importantes, de 5 a 9, até ~950 caracteres.
    const site = [];
    let tamSite = 0;
    for (const p of porNota) {
      if (site.length >= 9 || (site.length >= 5 && tamSite >= 950)) break;
      if ((p.s < -0.3 || p.blog || itens[p.i].lista) && site.length >= 3) continue;
      if (repete(p, site)) continue;
      if (itens[p.i].citacao && site.some((q) => itens[q.i].citacao)) continue; // no máximo uma fala direta
      site.push(p); tamSite += p.f.length;
    }
    // O fecho da matéria (elenco, onde assistir, próxima data) entra se couber.
    const fecho = pts[pts.length - 1];
    if (fecho && !site.includes(fecho) && fecho.s > 0 && !itens[fecho.i].citacao && !repete(fecho, site) && tamSite + fecho.f.length <= 1150) site.push(fecho);

    if (frases.length < 3) avisos.push("O artigo tem poucas frases, então o texto do site ficou curto. Complete à mão.");
    const t = titulos(titulo, lead && lead.f);
    const textoIg = costurar(ig, { semParenteses: true }).join(" ");
    return {
      instagram: { titulo: t.ig, texto: textoIg, legenda: legenda(t.ig, textoIg) },
      site: { titulo: t.site, paragrafos: emTres(costurar(site)) },
      seloSugerido: sugerirSelo(titulo, artigo),
      avisos,
    };
  }

  root.Cerebro = { gerar, limpar, dividirFrases, tituloCurto, sugerirSelo, emTres, jovem, manchete, legenda, hashtags, normalizarHashtags, tags };
})(typeof window !== "undefined" ? window : globalThis);
