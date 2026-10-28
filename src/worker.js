// Worker de la marque etika (28/10/2026).
//
// - etika.eus/            vitrine publique (vitrine.html)
// - etika.eus/admin/      page d'administration (index.html), PROTÉGÉE PAR CLOUDFLARE ACCESS
//                         (application Access sur le chemin « admin », à créer AVANT de relier
//                         le domaine etika.eus à ce Worker)
// - admin.etika.eus/      page d'administration, comme avant (transition, à retirer ensuite)
// - pages publiques       mentions légales, robots.txt, security.txt
// Toute autre adresse renvoie 404 : le code et la configuration du dépôt ne sont jamais servis.
// Objectif « sécurité et réputation » : le domaine racine était classé « parqué » faute de
// page, et toutes les apps *.etika.eus héritaient de cette catégorie à risque.

const ADMIN_HOST = "admin.etika.eus";

const PUBLIQUES = {
  "/": "/vitrine.html",
  "/mentions-legales": "/mentions-legales.html",
  "/robots.txt": "/robots.txt",
  "/.well-known/security.txt": "/security.txt",
};

const ADMIN = {
  "/admin/": "/index.html",
  "/admin/apps.json": "/apps.json",
};

const CSP_PUBLIQUE = [
  "default-src 'self'",
  "script-src 'self' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self' https://cloudflareinsights.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

const COMMUNS = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

function avecEntetes(reponse, type) {
  const r = new Response(reponse.body, reponse);
  for (const [k, v] of Object.entries(COMMUNS)) r.headers.set(k, v);
  if (type === "publique") {
    r.headers.set("Content-Security-Policy", CSP_PUBLIQUE);
  } else {
    r.headers.set("X-Robots-Tag", "noindex, nofollow");
    r.headers.set("Cache-Control", "no-store");
  }
  return r;
}

async function servir(env, request, fichier, type) {
  const r = await env.ASSETS.fetch(new Request(new URL(fichier, request.url), { method: request.method }));
  return avecEntetes(r, type);
}

function introuvable() {
  return avecEntetes(
    new Response("Page introuvable.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } }),
    "publique",
  );
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Méthode non autorisée.", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const url = new URL(request.url);
    // Une seule adresse canonique : www.etika.eus renvoie vers etika.eus.
    if (url.hostname === "www.etika.eus") {
      return Response.redirect(`https://etika.eus${url.pathname}${url.search}`, 301);
    }
    const p = url.pathname;

    // Transition : admin.etika.eus garde exactement son comportement d'avant.
    if (url.hostname === ADMIN_HOST) {
      if (p === "/") return servir(env, request, "/index.html", "admin");
      if (p === "/apps.json") return servir(env, request, "/apps.json", "admin");
    }

    if (p === "/admin") return Response.redirect(new URL("/admin/", url).toString(), 301);
    if (p === "/mentions-legales/") return Response.redirect(new URL("/mentions-legales", url).toString(), 301);
    if (PUBLIQUES[p]) return servir(env, request, PUBLIQUES[p], "publique");
    if (ADMIN[p]) return servir(env, request, ADMIN[p], "admin");
    return introuvable();
  },
};
