/**
 * Busca no Google Analytics 4 as visualizações de cada /artigos/<slug> e grava
 * src/data/views.json, que o content layer lê no build.
 *
 * Nunca derruba o build: sem credencial, ou com o GA fora do ar, grava um arquivo
 * vazio e o site volta para o score editorial (Em Alta) e esconde os números.
 *
 * Credencial (conta de serviço com papel Leitor na propriedade):
 *  - GA_SERVICE_ACCOUNT_JSON: o conteúdo do JSON (usado na Vercel);
 *  - GA_SERVICE_ACCOUNT_FILE: caminho do JSON (usado local, via .env).
 *
 * Sem dependência nova: o JWT da conta de serviço é assinado com node:crypto.
 */
import { createSign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../src/data/views.json", import.meta.url);
const PROPERTY = process.env.GA_PROPERTY_ID ?? "536740001";

try {
  process.loadEnvFile?.();
} catch {
  // sem .env, segue só com as variáveis do ambiente
}

function credentials() {
  if (process.env.GA_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON);
  if (process.env.GA_SERVICE_ACCOUNT_FILE)
    return JSON.parse(readFileSync(process.env.GA_SERVICE_ACCOUNT_FILE, "utf8"));
  return null;
}

async function accessToken({ client_email, private_key }) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64({ alg: "RS256", typ: "JWT" }) +
    "." +
    b64({
      iss: client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
  const signature = createSign("RSA-SHA256").update(unsigned).sign(private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: unsigned + "." + signature,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

/** Visualizações por slug no período. Soma variações do mesmo caminho (barra final). */
async function viewsSince(token, startDate) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`,
    {
      method: "POST",
      headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        dimensionFilter: {
          filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/artigos/" } },
        },
        limit: 10000,
      }),
    },
  );
  if (!res.ok) throw new Error(`runReport ${res.status}: ${await res.text()}`);
  const out = {};
  for (const row of (await res.json()).rows ?? []) {
    const slug = row.dimensionValues[0].value.replace(/^\/artigos\//, "").replace(/\/$/, "");
    if (!slug || slug.includes("/")) continue;
    out[slug] = (out[slug] ?? 0) + Number(row.metricValues[0].value);
  }
  return out;
}

let data = {};
const creds = credentials();
if (!creds) {
  console.warn("[views] sem credencial do GA: números de visualização desligados neste build.");
} else {
  try {
    const token = await accessToken(creds);
    const [total, last30] = await Promise.all([viewsSince(token, "2020-01-01"), viewsSince(token, "30daysAgo")]);
    data = { updatedAt: new Date().toISOString(), total, last30 };
    console.log(`[views] ${Object.keys(total).length} matérias com visualizações no GA.`);
  } catch (err) {
    console.warn("[views] falha ao consultar o GA, build segue sem números:", err.message);
  }
}
writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
