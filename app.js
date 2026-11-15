"use strict";
// Échanges de cartes TravelTown : application familiale.
// Données partagées via un Google Apps Script (voir apps-script/). Sans serveur
// configuré, l'app tourne en mode démo avec des données fictives locales.

var VERSION = "1.5";
var COULEURS = ["#e4572e", "#2e86ab", "#7a5195", "#2a9d8f", "#d97706", "#c2185b", "#5c6bc0", "#43a047", "#8d6e63", "#00838f"];

// ---------- Stockage local (tolérant aux navigateurs qui le bloquent) ----------
var LS = {
  get: function (k, d) { try { var v = localStorage.getItem("tt." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem("tt." + k, JSON.stringify(v)); } catch (e) {} }
};

// Lien d'invitation : #api=<url du script>&cle=<clé famille>
(function lireLien() {
  var h = new URLSearchParams(location.hash.slice(1));
  if (h.get("api")) {
    if (h.get("api") !== LS.get("api", "")) { LS.set("etat", null); LS.set("file", []); }
    LS.set("api", h.get("api"));
    LS.set("cle", h.get("cle") || "");
  } else if (LS.get("api", "")) {
    // Le lien reste dans l'adresse : « Ajouter à l'écran d'accueil » le conserve.
    // Indispensable sur iPhone, où l'icône d'écran d'accueil a son propre stockage.
    history.replaceState(null, "", location.pathname + location.search + "#api=" +
      encodeURIComponent(LS.get("api", "")) + "&cle=" + encodeURIComponent(LS.get("cle", "")));
  }
})();

// Lit un lien d'invitation collé (adresse complète ou seulement la partie après #).
function lireInvitation(texte) {
  var t = String(texte || "").trim(), i = t.indexOf("#");
  var h = new URLSearchParams(i >= 0 ? t.slice(i + 1) : t);
  var api = h.get("api") || "", cle = h.get("cle") || "";
  return /^https:\/\/script\.google(usercontent)?\.com\//.test(api) && cle ? { api: api, cle: cle } : null;
}
function formLien() {
  return '<form class="ajout lien-invit" data-f="lien"><input id="lien-colle" name="lien" placeholder="Colle ici ton lien d’invitation" autocomplete="off" required><button class="principal">Rejoindre</button></form>';
}

var S = {
  api: LS.get("api", ""),
  cle: LS.get("cle", ""),
  moi: LS.get("moi", ""),
  serveur: LS.get("etat", null),   // dernier état confirmé par le serveur
  file: LS.get("file", []),        // actions pas encore confirmées
  etat: null,                      // état serveur + actions en attente
  onglet: LS.get("onglet", "demandes"),
  filtre: LS.get("filtre", "tout"),
  recherche: "",
  rapide: false,
  fiche: null, edition: false,
  ouvert: {},                      // membres dépliés dans l'onglet Famille
  enVol: 0, enLigne: true, erreurServeur: "", derniereSync: LS.get("sync", null)
};
var DEMO = !S.api;

// ---------- Utilitaires ----------
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function nouvelId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function etoiles(n) { return n > 0 ? "★".repeat(n) : ""; }
function ilYa(iso) {
  var s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!(s >= 0)) return "";
  if (s < 60) return "à l'instant";
  if (s < 3600) return "il y a " + Math.floor(s / 60) + " min";
  if (s < 86400) return "il y a " + Math.floor(s / 3600) + " h";
  var j = Math.floor(s / 86400);
  return j === 1 ? "hier" : "il y a " + j + " j";
}
function memeJour(iso) { var d = new Date(iso), n = new Date(); return d.toDateString() === n.toDateString(); }
function toast(msg, type) {
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "visible " + (type || "");
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { t.className = ""; }, 3200);
}

// ---------- Catalogue ----------
function catalogue() {
  var surcharges = (S.etat && S.etat.catalogue) || {};
  var albums = CATALOGUE_DEFAUT.albums.map(function (alb, i) {
    var a = i + 1, s = surcharges[String(a)];
    var cartes = alb[2].map(function (c, j) {
      var id = a + "-" + (j + 1), o = surcharges[id];
      var base = c ? { nom: c[0], etoiles: c[1], doree: false } : { nom: "", etoiles: 0, doree: true };
      if (o) base = { nom: o.nom || base.nom, etoiles: o.etoiles || base.etoiles, doree: o.doree };
      return { id: id, album: a, num: j + 1, emoji: alb[0], nom: base.nom || (base.doree ? "Carte dorée" : "Carte " + (j + 1)), inconnue: !base.nom, etoiles: base.etoiles, doree: base.doree };
    });
    return { num: a, emoji: alb[0], nom: (s && s.nom) || alb[1], cartes: cartes };
  });
  var index = {};
  albums.forEach(function (al) { al.cartes.forEach(function (c) { index[c.id] = c; }); });
  return { albums: albums, index: index, total: albums.length * 9 };
}
var CAT = null;

// ---------- État et actions ----------
function q(prenom, id) { return TT.quantite(S.etat, prenom, id); }
function joueurs() { return S.etat ? S.etat.joueurs : []; }
function autres() { return joueurs().filter(function (j) { return j.prenom !== S.moi; }); }
function couleur(prenom) {
  var j = joueurs().filter(function (x) { return x.prenom === prenom; })[0];
  if (j && j.couleur) return j.couleur;
  var h = 0; for (var i = 0; i < prenom.length; i++) h = (h * 31 + prenom.charCodeAt(i)) >>> 0;
  return COULEURS[h % COULEURS.length];
}
function pastille(prenom, petite) {
  return '<span class="pastille' + (petite ? " petite" : "") + '" style="background:' + esc(couleur(prenom)) + '">' + esc(prenom.charAt(0).toUpperCase()) + "</span>";
}

function recalculer() {
  S.etat = clone(S.serveur || TT.etatVide());
  S.file.forEach(function (act) { try { TT.appliquer(S.etat, act); } catch (e) {} });
  CAT = catalogue();
  if (S.moi) {
    var j = joueurs().filter(function (x) { return TT.memePrenom(x.prenom, S.moi); })[0];
    if (j && j.prenom !== S.moi) { S.moi = j.prenom; LS.set("moi", S.moi); }
  }
}
function sauver() { LS.set("etat", S.serveur); LS.set("file", S.file); }

function agir(act, sansRendu) {
  // Plusieurs appuis rapides sur +/- : seule la dernière quantité compte.
  if (act.type === "quantite") {
    for (var i = S.file.length - 1; i >= S.enVol; i--) {
      var a = S.file[i];
      if (a.type === "quantite" && a.prenom === act.prenom && a.carte === act.carte) S.file.splice(i, 1);
    }
  }
  try { TT.appliquer(clone(S.etat), act); } catch (e) { toast(e.message, "erreur"); return false; }
  S.file.push(act);
  sauver();
  recalculer();
  if (!sansRendu) rendre();
  planifierEnvoi();
  return true;
}

var minuteurEnvoi = null;
function planifierEnvoi(delai) {
  clearTimeout(minuteurEnvoi);
  minuteurEnvoi = setTimeout(envoyer, delai == null ? 500 : delai);
}

function envoyer() {
  if (!S.file.length || S.enVol) return;
  if (DEMO) {
    S.serveur = S.serveur || TT.etatVide();
    S.file.forEach(function (act) { try { TT.appliquer(S.serveur, act); } catch (e) {} });
    S.file = [];
    sauver(); recalculer(); rendre();
    return;
  }
  var lot = S.file.slice(0, 40);
  S.enVol = lot.length;
  fetch(S.api, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ cle: S.cle, actions: lot }) })
    .then(function (r) { return r.json(); })
    .then(function (rep) {
      S.enVol = 0;
      S.enLigne = true;
      if (!rep.ok) { S.erreurServeur = rep.erreur || "Erreur serveur"; rendre(); return; }
      S.erreurServeur = "";
      S.serveur = rep.etat;
      S.file = S.file.slice(lot.length);
      S.derniereSync = rep.serveur; LS.set("sync", S.derniereSync);
      (rep.resultats || []).forEach(function (r) { if (!r.ok) toast(r.erreur, "erreur"); });
      sauver(); recalculer(); rendre();
      if (S.file.length) planifierEnvoi(0);
    })
    .catch(function () {
      S.enVol = 0;
      S.enLigne = false;
      rendre();
      planifierEnvoi(8000);
    });
}

function synchroniser(manuel) {
  if (DEMO) { if (manuel) toast("Mode démo : rien à synchroniser"); return; }
  if (S.file.length || S.enVol) { envoyer(); return; }
  fetch(S.api + (S.api.indexOf("?") < 0 ? "?" : "&") + "cle=" + encodeURIComponent(S.cle))
    .then(function (r) { return r.json(); })
    .then(function (rep) {
      S.enLigne = true;
      if (!rep.ok) { S.erreurServeur = rep.erreur || "Erreur serveur"; rendre(); return; }
      S.erreurServeur = "";
      if (S.file.length || S.enVol) return; // une modification est partie entre-temps
      S.serveur = rep.etat;
      S.derniereSync = rep.serveur; LS.set("sync", S.derniereSync);
      sauver(); recalculer(); rendre();
      if (manuel) toast("À jour");
    })
    .catch(function () { S.enLigne = false; rendre(); if (manuel) toast("Pas de connexion", "erreur"); });
}

// ---------- Données de démonstration ----------
function etatDemo() {
  var e = TT.etatVide(), graine = 7;
  function alea() { graine = (graine * 16807) % 2147483647; return graine / 2147483647; }
  ["Alice", "Bruno", "Chloé"].forEach(function (p, i) { TT.appliquer(e, { type: "joueur", prenom: p, couleur: COULEURS[i] }); });
  CATALOGUE_DEFAUT.albums.forEach(function (alb, i) {
    alb[2].forEach(function (c, j) {
      var id = (i + 1) + "-" + (j + 1), rare = c ? c[1] : 5;
      ["Alice", "Bruno", "Chloé"].forEach(function (p) {
        var r = alea(), n = r < 0.08 + rare * 0.06 ? 0 : r < 0.62 ? 1 : r < 0.85 ? 2 : 3;
        if (!c && n > 1) n = 1;
        if (n) TT.appliquer(e, { type: "quantite", prenom: p, carte: id, quantite: n });
      });
    });
  });
  var vues = {};
  [["Bruno", "Alice"], ["Chloé", "Alice"], ["Bruno", "Chloé"], ["Chloé", "Bruno"]].forEach(function (x, k) {
    var id = premiereCarte(e, x[0], x[1], vues);
    vues[id] = 1;
    TT.appliquer(e, { type: "demande", id: "demo" + k, de: x[0], carte: id });
  });
  return e;
}
function premiereCarte(e, receveur, donneur, deja) {
  for (var a = 18; a >= 1; a--) for (var n = 9; n >= 1; n--) {
    var id = a + "-" + n;
    if (!deja[id] && CATALOGUE_DEFAUT.albums[a - 1][2][n - 1] && !TT.quantite(e, receveur, id) && TT.quantite(e, donneur, id) > 1) return id;
  }
  return "1-1";
}

// ---------- Calculs pour l'affichage ----------
function stats(prenom) {
  var possedees = 0, doubles = 0, manquantes = 0, doreesManquantes = 0, albumsFinis = 0;
  CAT.albums.forEach(function (al) {
    var fini = true;
    al.cartes.forEach(function (c) {
      var n = q(prenom, c.id);
      if (n > 0) possedees++; else { manquantes++; fini = false; if (c.doree) doreesManquantes++; }
      if (n > 1 && !c.doree) doubles += n - 1;
    });
    if (fini) albumsFinis++;
  });
  return { possedees: possedees, doubles: doubles, manquantes: manquantes, doreesManquantes: doreesManquantes, albumsFinis: albumsFinis };
}
function demandesOuvertes() { return S.etat.demandes.filter(function (d) { return d.statut === "ouverte"; }); }
function maDemande(id, a) {
  return demandesOuvertes().filter(function (d) { return d.de === S.moi && d.carte === id && (!a || d.a === a); })[0];
}
function manquantesAlbum(prenom, album) {
  return CAT.albums[album - 1].cartes.filter(function (c) { return !q(prenom, c.id); }).length;
}

// ---------- Rendu ----------
var ICONES = {
  demandes: '<svg viewBox="0 0 24 24"><path d="M5 4h14v12H9l-4 4z"/><path d="M9 9h6M9 12h4"/></svg>',
  album: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="11" rx="1.5"/><rect x="13" y="4" width="8" height="11" rx="1.5"/><path d="M5 19h14"/></svg>',
  echanges: '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  famille: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5M14 19c.3-2.4 1.5-3.8 3-3.8s2.7 1.4 3.2 3.8"/></svg>',
  reglages: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>'
};

function rendre() {
  if (!S.etat) recalculer();
  var app = document.getElementById("app");
  var focus = document.activeElement && document.activeElement.id;
  var curseur = focus && document.activeElement.selectionStart;
  var connu = S.moi && joueurs().some(function (j) { return j.prenom === S.moi; });

  if (!S.serveur && !DEMO) {
    app.innerHTML = '<div class="accueil"><h1>Échanges de cartes</h1><p class="chargement">' +
      (S.erreurServeur ? "⚠ " + esc(S.erreurServeur) : S.enLigne ? "Connexion à la famille…" : "Pas de connexion internet. Réessai automatique…") + "</p></div>";
  } else if (!connu) {
    app.innerHTML = ecranAccueil();
  } else {
    var aider = demandesOuvertes().filter(function (d) { return d.de !== S.moi && q(S.moi, d.carte) > 1; }).length;
    app.innerHTML =
      '<header class="entete">' +
        '<div class="titre"><span class="logo">🃏</span><div><b>Échanges de cartes</b><small>' + esc(CATALOGUE_DEFAUT.saison) + "</small></div></div>" +
        '<button class="moi" data-a="onglet" data-o="reglages">' + etatConnexion() + pastille(S.moi) + "</button>" +
      "</header>" +
      (DEMO ? '<div class="bandeau demo"><b>Mode démo</b> : données fictives. Tu as un lien d’invitation ? Colle-le ici :' + formLien() + "</div>" : "") +
      (S.erreurServeur ? '<div class="bandeau erreur">⚠ ' + esc(S.erreurServeur) + "</div>" : "") +
      '<main class="contenu">' + ({ demandes: ongletDemandes, album: ongletAlbum, echanges: ongletEchanges, famille: ongletFamille, reglages: ongletReglages }[S.onglet] || ongletDemandes)() + "</main>" +
      '<nav class="barre">' +
        boutonNav("demandes", "Demandes", aider) +
        boutonNav("album", "Album") +
        boutonNav("echanges", "Échanges") +
        boutonNav("famille", "Famille") +
        boutonNav("reglages", "Réglages") +
      "</nav>";
  }
  var modal = document.getElementById("modal");
  modal.innerHTML = S.fiche ? ficheCarte(S.fiche) : "";
  // L'animation d'ouverture ne joue qu'à l'ouverture, pas à chaque +/-.
  modal.classList.toggle("anime", !!S.fiche && modal.dataset.ouvert !== S.fiche);
  modal.dataset.ouvert = S.fiche || "";
  document.body.classList.toggle("modal-ouvert", !!S.fiche);
  if (focus) {
    var el = document.getElementById(focus);
    if (el && el.tagName === "INPUT") { el.focus(); try { el.setSelectionRange(curseur, curseur); } catch (e) {} }
  }
}

function etatConnexion() {
  if (DEMO) return "";
  if (!S.enLigne) return '<span class="sync hors" title="Hors ligne">hors ligne</span>';
  if (S.file.length) return '<span class="sync attente" title="Envoi en cours">envoi…</span>';
  return "";
}
function boutonNav(o, libelle, badge) {
  return '<button class="' + (S.onglet === o ? "actif" : "") + '" data-a="onglet" data-o="' + o + '">' + ICONES[o] +
    "<span>" + libelle + "</span>" + (badge ? '<i class="badge-nav">' + badge + "</i>" : "") + "</button>";
}

function ecranAccueil() {
  var liste = joueurs().map(function (j) {
    return '<button class="choix-membre" data-a="choisir" data-p="' + esc(j.prenom) + '">' + pastille(j.prenom) + "<span>" + esc(j.prenom) + "</span></button>";
  }).join("");
  return '<div class="accueil">' +
    '<div class="logo-grand">🃏</div><h1>Échanges de cartes</h1>' +
    "<p>Pour savoir qui a quoi dans la famille, et se demander les cartes qui manquent.</p>" +
    (DEMO ? '<div class="bandeau demo"><b>Mode démo</b> : données fictives sur cet appareil. Pour rejoindre ta famille, ouvre le lien d’invitation reçu, ou colle-le ici :' + formLien() + "</div>" : "") +
    (liste ? "<h2>Qui es-tu ?</h2><div class=\"membres\">" + liste + "</div>" : "<h2>Bienvenue !</h2>") +
    '<form class="ajout" data-f="ajout-moi"><input id="nouveau-prenom" name="prenom" maxlength="30" placeholder="' + (liste ? "Pas dans la liste ? Ton prénom" : "Ton prénom") + '" autocomplete="given-name" required><button class="principal">C\'est moi</button></form>' +
    "</div>";
}

function ongletAlbum() {
  var st = stats(S.moi);
  var rech = S.recherche.trim().toLowerCase();
  var html = '<section class="resume">' +
    '<div><b>' + st.possedees + "</b><small>/ " + CAT.total + " cartes</small></div>" +
    '<div><b>' + st.albumsFinis + "</b><small>/ 18 albums</small></div>" +
    '<div><b>' + st.doubles + "</b><small>doubles</small></div>" +
    "</section>" +
    '<div class="outils">' +
      '<div class="segments">' +
        ["tout:Toutes", "manque:Manquantes", "double:Doubles"].map(function (x) {
          var p = x.split(":");
          return '<button class="' + (S.filtre === p[0] ? "actif" : "") + '" data-a="filtre" data-v="' + p[0] + '">' + p[1] + "</button>";
        }).join("") +
      "</div>" +
      '<button class="interrupteur ' + (S.rapide ? "actif" : "") + '" data-a="rapide" aria-pressed="' + S.rapide + '">⚡ Saisie rapide</button>' +
    "</div>" +
    '<input id="recherche" class="recherche" type="search" placeholder="Chercher une carte ou un album…" value="' + esc(S.recherche) + '">' +
    (S.rapide ? '<p class="aide">Saisie rapide : un appui = +1 exemplaire, le bouton − retire un exemplaire.</p>' : "");

  var vide = true;
  CAT.albums.forEach(function (al) {
    var nbOk = al.cartes.filter(function (c) { return q(S.moi, c.id) > 0; }).length;
    var cartes = al.cartes.filter(function (c) {
      var n = q(S.moi, c.id);
      if (S.filtre === "manque" && n > 0) return false;
      if (S.filtre === "double" && n < 2) return false;
      if (rech && (c.nom + " " + al.nom + " " + c.id).toLowerCase().indexOf(rech) < 0) return false;
      return true;
    });
    if (!cartes.length) return;
    vide = false;
    html += '<section class="album' + (nbOk === 9 ? " complet" : "") + '">' +
      '<header><span class="num-album">' + al.num + "</span><h3>" + esc(al.nom) + "</h3>" +
      '<span class="compte">' + (nbOk === 9 ? "✓ complet" : nbOk + "/9") + "</span></header>" +
      '<div class="progression"><i style="width:' + (nbOk / 9 * 100) + '%"></i></div>' +
      '<div class="grille">' + cartes.map(tuile).join("") + "</div></section>";
  });
  if (vide) html += '<p class="vide">' + (S.filtre === "manque" ? "Aucune carte manquante. Bravo !" : S.filtre === "double" ? "Aucun double pour le moment." : "Aucune carte trouvée.") + "</p>";
  return html;
}

function tuile(c) {
  var n = q(S.moi, c.id);
  var classe = n === 0 ? "manque" : n > 1 ? "double" : "ok";
  var indice = "";
  if (!c.doree && n === 0 && autres().some(function (j) { return q(j.prenom, c.id) > 1; })) {
    indice = maDemande(c.id) ? '<span class="indice demandee" title="Demandée">⏳</span>' : '<span class="indice dispo" title="Disponible dans la famille">↔</span>';
  } else if (!c.doree && n > 1 && autres().some(function (j) { return !q(j.prenom, c.id); })) {
    indice = '<span class="indice besoin" title="Quelqu\'un en a besoin">♥</span>';
  }
  return '<div class="tuile ' + classe + '" data-a="' + (S.rapide ? "plus" : "fiche") + '" data-id="' + c.id + '" role="button" tabindex="0" aria-label="' + esc(c.nom) + ", " + (n ? n + " exemplaire" + (n > 1 ? "s" : "") : "manquante") + '">' +
    visuel(c, n === 0) + indice +
    (n > 1 ? '<span class="badge">+' + (n - 1) + "</span>" : "") +
    (S.rapide && n > 0 ? '<button class="moins" data-a="moins" data-id="' + c.id + '" aria-label="Retirer un exemplaire">−</button>' : "") +
    "</div>";
}

// Visuel d'une carte : illustration de l'album, bandeau coloré selon les étoiles
// (vert 1, orange 2, rose 3, bleu 4, violet 5), comme le code couleur du jeu.
function visuel(c, grise, grand) {
  return '<div class="cv e' + (c.etoiles || 0) + (grise ? " grise" : "") + (c.doree ? " doree" : "") + (grand ? " grand" : "") + '">' +
    '<span class="cv-num">' + c.album + "-" + c.num + "</span>" +
    '<span class="cv-image" aria-hidden="true">' + c.emoji + "</span>" +
    '<span class="cv-etoiles" aria-label="' + c.etoiles + ' étoiles">' + "★".repeat(c.etoiles || 0) + "</span>" +
    '<span class="cv-nom' + (c.inconnue ? " inconnue" : "") + '">' + esc(c.nom) + "</span>" +
    "</div>";
}

function ligneCarte(c) {
  return '<div class="carte-ligne" data-a="fiche" data-id="' + c.id + '" role="button" tabindex="0">' +
    '<span class="mini e' + c.etoiles + (c.doree ? " doree" : "") + '"><i>' + c.emoji + "</i>" + c.album + "-" + c.num + "</span>" +
    '<span class="txt"><b>' + esc(c.nom) + "</b><small>" + esc(CAT.albums[c.album - 1].nom) + " " + etoiles(c.etoiles) + "</small></span></div>";
}

// Écran principal : toutes les demandes ouvertes de la famille. La première
// personne qui envoie la carte touche « C'est fait » et la demande disparaît
// pour tout le monde (évite les envois en double).
function ongletDemandes() {
  var ouvertes = demandesOuvertes().slice().sort(function (a, b) { return String(b.cree_le).localeCompare(String(a.cree_le)); });
  var miennes = ouvertes.filter(function (d) { return d.de === S.moi; });
  var autresDem = ouvertes.filter(function (d) { return d.de !== S.moi; });
  var jePeux = autresDem.filter(function (d) { return q(S.moi, d.carte) > 1; });
  var reste = autresDem.filter(function (d) { return q(S.moi, d.carte) <= 1; });
  var envoisJour = S.etat.demandes.filter(function (d) { return d.a === S.moi && d.statut === "envoyee" && memeJour(d.maj_le); }).length;

  var html = '<div class="intro-demandes"><p>Les cartes que la famille cherche. Si tu l\'as en double : <b>envoie-la dans TravelTown</b>, puis touche <b>« C\'est fait »</b>. La demande disparaît pour tout le monde.</p>' +
    (DEMO ? "" : '<button class="discret actualiser" data-a="synchro">↻ ' + (S.derniereSync ? "Mis à jour " + ilYa(S.derniereSync) : "Actualiser") + "</button>") + "</div>";

  html += '<section class="bloc"><h2>Tu peux aider <span class="nb' + (jePeux.length ? " vif" : "") + '">' + jePeux.length + "</span></h2>";
  html += jePeux.length ? '<div class="grille-demandes">' + jePeux.map(function (d) { return carteDemande(d, true); }).join("") + "</div>"
    : '<p class="vide">Aucune demande pour une carte que tu as en double.</p>';
  if (envoisJour) html += '<p class="aide">Tes envois enregistrés aujourd\'hui : <b>' + envoisJour + "</b>. Le jeu limite le nombre d'envois par jour.</p>";
  html += "</section>";

  if (reste.length) {
    html += '<section class="bloc"><h2>Autres demandes <span class="nb">' + reste.length + "</span></h2>" +
      '<p class="aide">Tu n\'as pas ces cartes en double (d\'après ton album dans l\'app).</p>' +
      '<div class="grille-demandes">' + reste.map(function (d) { return carteDemande(d, false); }).join("") + "</div></section>";
  }

  html += '<section class="bloc"><h2>Tes demandes <span class="nb">' + miennes.length + "</span></h2>";
  html += miennes.length ? '<div class="grille-demandes">' + miennes.map(function (d) { return carteDemande(d, false); }).join("") + "</div>"
    : '<p class="vide">Tu n\'as rien demandé. Touche une carte manquante dans l\'album, puis « Demander à la famille ».</p>';
  html += '<button class="lien-discret" data-a="onglet" data-o="echanges">Voir les cartes que tu peux demander</button></section>';
  return html;
}

function carteDemande(d, prioritaire) {
  var c = CAT.index[d.carte];
  if (!c) return "";
  var mienne = d.de === S.moi;
  var donneurs = joueurs().filter(function (j) { return j.prenom !== d.de && q(j.prenom, d.carte) > 1; });
  var info = mienne
    ? (donneurs.length ? "En double chez " + donneurs.map(function (j) { return esc(j.prenom); }).join(", ") : "Personne ne l'a en double pour l'instant")
    : (prioritaire ? "Tu l'as ×" + (q(S.moi, d.carte) - 1) + " en double" : donneurs.length ? "En double chez " + donneurs.map(function (j) { return esc(j.prenom); }).join(", ") : "Personne ne l'a en double");
  return '<article class="carte-demande' + (prioritaire ? " prioritaire" : "") + '">' +
    '<div class="cd-visuel" data-a="fiche" data-id="' + c.id + '" role="button" tabindex="0">' + visuel(c, false) + "</div>" +
    '<div class="cd-pour">' + pastille(d.de, true) + "<span>" + (mienne ? "Pour toi" : "Pour <b>" + esc(d.de) + "</b>") + "</span></div>" +
    '<small class="cd-info">' + info + " · " + ilYa(d.cree_le) + "</small>" +
    (mienne
      ? '<button class="discret" data-a="statut" data-id="' + esc(d.id) + '" data-s="annulee">Annuler</button>'
      : '<button class="' + (prioritaire ? "principal" : "secondaire") + '" data-a="fait" data-id="' + esc(d.id) + '">✓ C\'est fait</button>') +
    "</article>";
}

function ongletEchanges() {
  var html = "";

  // 1. Ce que je peux demander (cartes qui me manquent et qu'un proche a en double)
  var aDemander = [];
  CAT.albums.forEach(function (al) {
    al.cartes.forEach(function (c) {
      if (c.doree || q(S.moi, c.id)) return;
      var donneurs = autres().filter(function (j) { return q(j.prenom, c.id) > 1; });
      if (donneurs.length) aDemander.push({ c: c, donneurs: donneurs, reste: manquantesAlbum(S.moi, c.album) });
    });
  });
  aDemander.sort(function (x, y) { return (x.reste - y.reste) || (y.c.etoiles - x.c.etoiles); });
  html += '<section class="bloc"><h2>Tu peux demander <span class="nb">' + aDemander.length + "</span></h2>";
  if (aDemander.length) {
    html += '<p class="aide">Cartes qui te manquent et qu\'un proche a en double. Les albums presque finis sont en premier. La demande apparaît pour toute la famille dans « Demandes ».</p>';
    html += aDemander.map(function (x) {
      var d = maDemande(x.c.id);
      return '<div class="proposition">' + ligneCarte(x.c) +
        (x.reste === 1 ? '<span class="etiquette">Termine l\'album !</span>' : "") +
        '<div class="puces"><span class="chez">En double chez ' + x.donneurs.map(function (j) { return esc(j.prenom) + " ×" + (q(j.prenom, x.c.id) - 1); }).join(", ") + "</span>" +
        (d ? '<button class="puce demandee" data-a="statut" data-id="' + esc(d.id) + '" data-s="annulee">Demandée ✕</button>'
           : '<button class="puce" data-a="demander" data-id="' + x.c.id + '">Demander à la famille</button>') +
        "</div></div>";
    }).join("");
  } else {
    html += '<p class="vide">Aucune des cartes qui te manquent n\'est en double chez un proche pour le moment.</p>';
  }
  html += "</section>";

  // 2. Ce que je peux donner
  var aDonner = [];
  CAT.albums.forEach(function (al) {
    al.cartes.forEach(function (c) {
      if (c.doree || q(S.moi, c.id) < 2) return;
      var receveurs = autres().filter(function (j) { return !q(j.prenom, c.id); });
      if (receveurs.length) aDonner.push({ c: c, receveurs: receveurs });
    });
  });
  html += '<section class="bloc"><h2>Tu peux donner <span class="nb">' + aDonner.length + "</span></h2>";
  if (aDonner.length) {
    html += '<p class="aide">Tes doubles qui manquent à quelqu\'un. Touche un prénom après l\'avoir envoyée dans le jeu.</p>';
    html += aDonner.map(function (x) {
      return '<div class="proposition">' + ligneCarte(x.c) + '<span class="etiquette neutre">×' + (q(S.moi, x.c.id) - 1) + " en double</span>" +
        '<div class="puces">' + x.receveurs.map(function (j) {
          var dem = demandesOuvertes().some(function (d) { return d.de === j.prenom && d.carte === x.c.id; });
          return '<button class="puce donner" data-a="donner" data-id="' + x.c.id + '" data-p="' + esc(j.prenom) + '">' + pastille(j.prenom, true) + "Envoyée à " + esc(j.prenom) + (dem ? " <small>(demandée)</small>" : "") + "</button>";
        }).join("") + "</div></div>";
    }).join("");
  } else {
    html += '<p class="vide">Aucun de tes doubles ne manque à quelqu\'un.</p>';
  }
  html += "</section>";

  // 3. Historique
  var histo = S.etat.demandes.filter(function (d) { return d.statut !== "ouverte" && (d.de === S.moi || d.a === S.moi); })
    .sort(function (a, b) { return String(b.maj_le).localeCompare(String(a.maj_le)); }).slice(0, 15);
  if (histo.length) {
    var libelles = { envoyee: "envoyée", refusee: "refusée", annulee: "annulée" };
    html += '<section class="bloc"><h2>Historique récent</h2><ul class="historique">' + histo.map(function (d) {
      var c = CAT.index[d.carte];
      var sens = d.de === S.moi ? (d.a ? "← " + esc(d.a) : "(demande à la famille)") : "→ " + esc(d.de);
      return '<li class="' + d.statut + '"><span>' + esc(c.nom) + " " + sens + "</span><small>" + libelles[d.statut] + " · " + ilYa(d.maj_le) + "</small></li>";
    }).join("") + "</ul></section>";
  }
  return html;
}

function ongletFamille() {
  var liste = joueurs().slice().sort(function (a, b) { return a.prenom === S.moi ? -1 : b.prenom === S.moi ? 1 : a.prenom.localeCompare(b.prenom); });
  return '<section class="bloc"><h2>La famille</h2>' + liste.map(function (j) {
    var st = stats(j.prenom), ouvert = S.ouvert[j.prenom];
    var html = '<div class="membre' + (ouvert ? " ouvert" : "") + '">' +
      '<button class="tete" data-a="deplier" data-p="' + esc(j.prenom) + '">' + pastille(j.prenom) +
      '<span class="txt"><b>' + esc(j.prenom) + (j.prenom === S.moi ? " (toi)" : "") + "</b><small>" + st.possedees + "/" + CAT.total + " cartes · " + st.albumsFinis + " albums finis · " + st.doubles + " doubles</small>" +
      '<span class="progression"><i style="width:' + (st.possedees / CAT.total * 100) + '%;background:' + esc(couleur(j.prenom)) + '"></i></span></span>' +
      '<span class="chevron">' + (ouvert ? "▲" : "▼") + "</span></button>";
    if (ouvert) {
      var manque = [], doubles = [];
      CAT.albums.forEach(function (al) { al.cartes.forEach(function (c) {
        var n = q(j.prenom, c.id);
        if (!n && !c.doree) manque.push(c);
        if (n > 1 && !c.doree) doubles.push({ c: c, n: n - 1 });
      }); });
      html += '<div class="detail"><h4>Lui manque (' + manque.length + " échangeables" + (st.doreesManquantes ? " + " + st.doreesManquantes + " dorées" : "") + ")</h4>" +
        '<div class="puces-cartes">' + (manque.map(function (c) {
          var jAi = q(S.moi, c.id) > 1 && j.prenom !== S.moi;
          return '<button class="pc' + (jAi ? " je-peux" : "") + '" data-a="fiche" data-id="' + c.id + '" title="' + esc(c.nom) + '">' + c.id + " " + esc(c.nom) + "</button>";
        }).join("") || "<i>rien</i>") + "</div>" +
        "<h4>En double (" + doubles.length + ")</h4>" +
        '<div class="puces-cartes">' + (doubles.map(function (x) {
          var meManque = !q(S.moi, x.c.id) && j.prenom !== S.moi;
          return '<button class="pc' + (meManque ? " me-manque" : "") + '" data-a="fiche" data-id="' + x.c.id + '">' + x.c.id + " " + esc(x.c.nom) + " ×" + x.n + "</button>";
        }).join("") || "<i>aucun</i>") + "</div>" +
        (j.prenom !== S.moi ? '<p class="aide"><span class="leg je-peux"></span> tu l\'as en double · <span class="leg me-manque"></span> il te manque</p>' : "") +
        "</div>";
    }
    return html + "</div>";
  }).join("") + "</section>";
}

function ongletReglages() {
  var lien = DEMO ? "" : location.origin + location.pathname + "#api=" + encodeURIComponent(S.api) + "&cle=" + encodeURIComponent(S.cle);
  return '<section class="bloc"><h2>Toi</h2>' +
      '<div class="ligne-reglage">' + pastille(S.moi) + "<span>Tu es <b>" + esc(S.moi) + "</b></span>" +
      '<button class="discret" data-a="changer-moi">Changer</button></div></section>' +
    '<section class="bloc"><h2>Membres de la famille</h2>' +
      joueurs().map(function (j) {
        return '<div class="ligne-reglage">' + pastille(j.prenom) + "<span>" + esc(j.prenom) + "</span>" +
          (j.prenom !== S.moi ? '<button class="discret danger" data-a="supprimer" data-p="' + esc(j.prenom) + '">Retirer</button>' : "") + "</div>";
      }).join("") +
      '<form class="ajout" data-f="ajout-membre"><input id="prenom-membre" name="prenom" maxlength="30" placeholder="Ajouter un membre (prénom)" required><button>Ajouter</button></form>' +
    "</section>" +
    (DEMO ? "" :
    '<section class="bloc"><h2>Inviter la famille</h2>' +
      "<p>Envoie ce lien par Messenger, WhatsApp ou SMS. Chacun l'ouvre, choisit son prénom, et c'est tout.</p>" +
      '<div class="boutons"><button class="principal" data-a="partager">Partager le lien</button><button data-a="copier">Copier</button></div>' +
      '<input id="lien" class="lien" readonly value="' + esc(lien) + '">' +
      '<p class="aide"><b>Sur iPhone :</b> ouvre le lien dans Safari, bouton Partager, « Sur l\'écran d\'accueil ». <b>Sur Android :</b> menu ⋮ de Chrome, « Ajouter à l\'écran d\'accueil ».</p>' +
    "</section>" +
    '<section class="bloc"><h2>Connexion</h2>' +
      "<p>" + (S.enLigne ? "✅ En ligne" : "📴 Hors ligne : tes modifications partiront dès le retour du réseau") +
      (S.file.length ? "<br>" + S.file.length + " modification(s) en attente d'envoi" : "") +
      (S.derniereSync ? '<br><small>Dernière synchro : ' + ilYa(S.derniereSync) + "</small>" : "") + "</p>" +
      '<button data-a="synchro">Synchroniser maintenant</button></section>') +
    '<section class="bloc"><h2>Saison</h2>' +
      "<p>" + esc(CATALOGUE_DEFAUT.saison) + " · 18 albums de 9 cartes. Les noms sont ceux de la version anglaise et les noms d'albums sont à compléter : touche une carte puis « Corriger » (la correction vaut pour toute la famille). Les 30 cartes dorées ne s'échangent pas.</p>" +
      '<button class="discret danger" data-a="nouvelle-saison">Nouvelle saison : tout remettre à zéro</button></section>' +
    '<section class="bloc"><h2>Serveur</h2>' +
      (DEMO ? "<p>Aucun serveur configuré : l'app est en <b>mode démo</b>. Colle ici l'adresse du script Google et la clé famille (ou ouvre simplement le lien d'invitation).</p>"
            : "<p>Connecté au serveur familial.</p>") +
      '<form class="config" data-f="config"><input id="cfg-api" name="api" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(S.api) + '">' +
      '<input id="cfg-cle" name="cle" placeholder="Clé famille" value="' + esc(S.cle) + '"><button>' + (DEMO ? "Se connecter" : "Enregistrer") + "</button></form>" +
      (DEMO ? '<button class="discret" data-a="reinit-demo">Réinitialiser les données de démo</button>' : "") +
      '<p class="aide">Version ' + VERSION + " · " + esc(CATALOGUE_DEFAUT.saison) + ' <button class="discret" data-a="recharger">Forcer la mise à jour</button></p></section>';
}

function ficheCarte(id) {
  var c = CAT.index[id];
  if (!c) return "";
  var n = q(S.moi, id), al = CAT.albums[c.album - 1];
  var etatTxt = n === 0 ? "Il te manque cette carte." : n === 1 ? "Elle est dans ton album, pas de double." : "Dont <b>" + (n - 1) + " double" + (n > 2 ? "s" : "") + "</b> à donner.";
  var html = '<div class="voile" data-a="fermer"></div><div class="fiche" role="dialog" aria-label="' + esc(c.nom) + '">' +
    '<button class="fermer" data-a="fermer" aria-label="Fermer">✕</button>' +
    '<div class="fiche-tete ' + (c.doree ? "doree" : "") + '"><span class="grand-num">' + c.album + "-" + c.num + "</span>" +
    "<div><h3>" + esc(c.nom) + "</h3><small>Album " + c.album + " · " + esc(al.nom) + (c.etoiles ? " · " + etoiles(c.etoiles) : "") + "</small></div></div>" +
    (c.doree ? '<p class="note-doree">Carte dorée : elle ne peut pas être envoyée ni reçue entre amis.</p>' : "");

  if (S.edition) {
    html += '<form class="edition" data-f="catalogue" data-id="' + id + '">' +
      '<label>Nom de la carte<input id="ed-nom" name="nom" maxlength="60" value="' + esc(c.inconnue ? "" : c.nom) + '"></label>' +
      '<label>Étoiles<select name="etoiles">' + [0, 1, 2, 3, 4, 5].map(function (e) { return "<option" + (e === c.etoiles ? " selected" : "") + ' value="' + e + '">' + (e ? etoiles(e) : "—") + "</option>"; }).join("") + "</select></label>" +
      '<label class="case"><input type="checkbox" name="doree"' + (c.doree ? " checked" : "") + "> Carte dorée (non échangeable)</label>" +
      '<label>Nom de l\'album<input name="album" maxlength="60" value="' + esc(al.nom) + '"></label>' +
      '<div class="boutons"><button class="principal">Enregistrer pour toute la famille</button><button type="button" data-a="annuler-edition">Annuler</button></div></form></div>';
    return html;
  }

  html += '<div class="compteur"><span>J\'en possède</span>' +
    '<button data-a="moins" data-id="' + id + '" aria-label="Un de moins"' + (n ? "" : " disabled") + ">−</button>" +
    "<b>" + n + "</b>" +
    '<button data-a="plus" data-id="' + id + '" aria-label="Un de plus">+</button></div>' +
    '<p class="etat-carte">' + etatTxt + "</p>";

  if (!c.doree && n === 0) {
    var dm = maDemande(id);
    html += dm ? '<div class="demande-fiche">⏳ Demandée à la famille ' + ilYa(dm.cree_le) + ' <button class="discret" data-a="statut" data-id="' + esc(dm.id) + '" data-s="annulee">Annuler</button></div>'
               : '<button class="principal large" data-a="demander" data-id="' + id + '">Demander à la famille</button>';
  }
  var ouverte = demandesOuvertes().filter(function (d) { return d.carte === id && d.de !== S.moi; });
  ouverte.forEach(function (d) {
    html += '<div class="demande-fiche">' + pastille(d.de, true) + " <b>" + esc(d.de) + "</b> la cherche " +
      '<button class="' + (n > 1 ? "principal" : "secondaire") + '" data-a="fait" data-id="' + esc(d.id) + '">✓ C’est fait</button></div>';
  });
  var lignes = autres().map(function (j) {
    var m = q(j.prenom, id), action = "";
    if (!c.doree && n > 1 && m === 0 && !ouverte.some(function (d) { return d.de === j.prenom; })) {
      action = '<button class="puce donner" data-a="donner" data-id="' + id + '" data-p="' + esc(j.prenom) + '">Je lui ai envoyée</button>';
    }
    var txt = m === 0 ? '<span class="tag manque">lui manque</span>' : m === 1 ? '<span class="tag ok">l\'a</span>' : '<span class="tag double">×' + (m - 1) + " en double</span>";
    return '<div class="ligne-famille">' + pastille(j.prenom, true) + "<span>" + esc(j.prenom) + "</span>" + txt + action + "</div>";
  }).join("");
  if (lignes) html += "<h4>Dans la famille</h4>" + lignes;
  html += '<button class="lien-discret" data-a="editer">Corriger le nom ou les étoiles</button></div>';
  return html;
}

// ---------- Interactions ----------
function changerQuantite(id, delta) {
  var n = Math.max(0, q(S.moi, id) + delta);
  agir({ type: "quantite", prenom: S.moi, carte: id, quantite: n });
}

document.addEventListener("click", function (ev) {
  var el = ev.target.closest("[data-a]");
  if (!el || el.disabled) return;
  var a = el.dataset.a, id = el.dataset.id, p = el.dataset.p;
  ev.preventDefault();
  if (a === "onglet") { S.onglet = el.dataset.o; LS.set("onglet", S.onglet); S.fiche = null; rendre(); window.scrollTo(0, 0); if (S.onglet === "demandes") synchroniser(); }
  else if (a === "filtre") { S.filtre = el.dataset.v; LS.set("filtre", S.filtre); rendre(); }
  else if (a === "rapide") { S.rapide = !S.rapide; rendre(); }
  else if (a === "fiche") { S.fiche = id; S.edition = false; rendre(); }
  else if (a === "fermer") { S.fiche = null; S.edition = false; rendre(); }
  else if (a === "plus") { changerQuantite(id, 1); if (S.rapide && !S.fiche) vibrer(); }
  else if (a === "moins") { ev.stopPropagation(); changerQuantite(id, -1); }
  else if (a === "choisir") { S.moi = p; LS.set("moi", p); rendre(); }
  else if (a === "changer-moi") { S.moi = ""; LS.set("moi", ""); rendre(); }
  else if (a === "deplier") { S.ouvert[p] = !S.ouvert[p]; rendre(); }
  else if (a === "demander") {
    if (agir({ type: "demande", id: nouvelId(), de: S.moi, carte: id })) toast("Demande visible par toute la famille");
  }
  else if (a === "fait") {
    var dem = S.etat.demandes.filter(function (x) { return x.id === id; })[0];
    if (!dem) return;
    var cf = CAT.index[dem.carte];
    if (q(S.moi, dem.carte) < 2 && !confirm("D'après l'app tu n'as pas « " + cf.nom + " » en double. L'as-tu bien envoyée à " + dem.de + " dans TravelTown ?")) return;
    if (agir({ type: "statut", id: id, statut: "envoyee", par: S.moi })) { toast("Merci ! " + cf.nom + " → " + dem.de); vibrer(); }
  }
  else if (a === "statut") {
    var s = el.dataset.s;
    if (agir({ type: "statut", id: id, statut: s })) toast({ envoyee: "Noté : carte envoyée", refusee: "Demande refusée", annulee: "Demande annulée" }[s]);
  }
  else if (a === "donner") {
    var c = CAT.index[id];
    if (confirm("As-tu bien envoyé « " + c.nom + " » à " + p + " dans TravelTown ?")) {
      // S'il avait demandé cette carte, on clôt sa demande ; sinon c'est un don spontané.
      var ouverteP = demandesOuvertes().filter(function (d) { return d.de === p && d.carte === id; })[0];
      var act = ouverteP ? { type: "statut", id: ouverteP.id, statut: "envoyee", par: S.moi } : { type: "don", id: nouvelId(), de: S.moi, a: p, carte: id };
      if (agir(act)) toast("Noté : " + c.nom + " → " + p);
    }
  }
  else if (a === "supprimer") {
    if (confirm("Retirer " + p + " de la famille ? Ses cartes et ses demandes seront effacées.")) agir({ type: "supprimer_joueur", prenom: p });
  }
  else if (a === "editer") { S.edition = true; rendre(); }
  else if (a === "annuler-edition") { S.edition = false; rendre(); }
  else if (a === "partager") {
    var lien = document.getElementById("lien").value;
    if (navigator.share) navigator.share({ title: "Échanges de cartes", text: "Notre app familiale pour les cartes TravelTown :", url: lien }).catch(function () {});
    else copier(lien);
  }
  else if (a === "copier") { copier(document.getElementById("lien").value); }
  else if (a === "synchro") { synchroniser(true); }
  else if (a === "recharger") {
    Promise.resolve(window.caches ? caches.keys().then(function (k) { return Promise.all(k.map(function (c) { return caches.delete(c); })); }) : 0)
      .then(function () { location.reload(); });
  }
  else if (a === "nouvelle-saison") {
    var r = prompt("Toutes les cartes de toute la famille seront effacées (les membres restent).\nTape NOUVELLE SAISON pour confirmer :");
    if (r && r.trim().toUpperCase() === "NOUVELLE SAISON") agir({ type: "nouvelle_saison", confirmation: "NOUVELLE SAISON" });
  }
  else if (a === "reinit-demo") {
    if (confirm("Remettre les données de démonstration à zéro ?")) { S.serveur = etatDemo(); S.file = []; sauver(); recalculer(); rendre(); }
  }
});

document.addEventListener("keydown", function (ev) {
  if (ev.key === "Escape" && S.fiche) { S.fiche = null; S.edition = false; rendre(); }
  if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches('[role="button"][data-a]')) { ev.preventDefault(); ev.target.click(); }
});

document.addEventListener("input", function (ev) {
  if (ev.target.id === "recherche") { S.recherche = ev.target.value; rendre(); }
});

document.addEventListener("submit", function (ev) {
  var f = ev.target, type = f.dataset.f;
  if (!type) return;
  ev.preventDefault();
  var data = new FormData(f);
  if (type === "ajout-moi" || type === "ajout-membre") {
    var p = TT.prenomPropre(data.get("prenom"));
    if (!p) return;
    var existe = joueurs().filter(function (j) { return TT.memePrenom(j.prenom, p); })[0];
    var coul = COULEURS[joueurs().length % COULEURS.length];
    if (!existe) agir({ type: "joueur", prenom: p, couleur: coul }, true);
    if (type === "ajout-moi") { S.moi = existe ? existe.prenom : p; LS.set("moi", S.moi); }
    else if (!existe) toast(p + " ajouté(e)");
    rendre();
  } else if (type === "catalogue") {
    var id = f.dataset.id, album = id.split("-")[0], modifs = {};
    modifs[id] = { nom: data.get("nom"), etoiles: Number(data.get("etoiles")), doree: !!data.get("doree") };
    var nomAlbum = String(data.get("album") || "").trim();
    if (nomAlbum && nomAlbum !== CAT.albums[album - 1].nom) modifs[album] = { nom: nomAlbum };
    S.edition = false;
    agir({ type: "catalogue", modifs: modifs });
    toast("Catalogue corrigé pour toute la famille");
  } else if (type === "lien") {
    var inv = lireInvitation(data.get("lien"));
    if (!inv) { toast("Ce n'est pas un lien d'invitation complet", "erreur"); return; }
    LS.set("api", inv.api); LS.set("cle", inv.cle); LS.set("etat", null); LS.set("file", []); LS.set("moi", "");
    location.replace(location.pathname + "#api=" + encodeURIComponent(inv.api) + "&cle=" + encodeURIComponent(inv.cle));
    location.reload();
  } else if (type === "config") {
    var api = String(data.get("api") || "").trim(), cle = String(data.get("cle") || "").trim();
    if (api && !/^https:\/\/script\.google(usercontent)?\.com\//.test(api)) { toast("Adresse de script Google attendue", "erreur"); return; }
    LS.set("api", api); LS.set("cle", cle);
    LS.set("etat", null); LS.set("file", []);
    location.reload();
  }
});

function copier(txt) {
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast("Lien copié"); }, function () { toast("Copie impossible", "erreur"); });
  else { var el = document.getElementById("lien"); el.select(); document.execCommand("copy"); toast("Lien copié"); }
}
function vibrer() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }

// ---------- Démarrage ----------
if (DEMO && !S.serveur) { S.serveur = etatDemo(); sauver(); }
recalculer();
rendre();
window.addEventListener("hashchange", function () { if (location.hash.indexOf("api=") >= 0) location.reload(); });
if (!DEMO) {
  if (S.file.length) envoyer(); else synchroniser();
  setInterval(function () { if (document.visibilityState === "visible") synchroniser(); }, 15000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") synchroniser(); });
  window.addEventListener("online", function () { planifierEnvoi(0); synchroniser(); });
}
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (reg) {
    reg.update();
    // Une nouvelle version vient de s'installer : on recharge une fois pour l'afficher.
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!sessionStorage.getItem("tt-maj")) { sessionStorage.setItem("tt-maj", "1"); location.reload(); }
    });
  }).catch(function () {});
}

// Safari iPhone ignore « user-scalable=no » : on bloque le pincement à la main.
["gesturestart", "gesturechange", "gestureend"].forEach(function (t) {
  document.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
});
document.addEventListener("touchmove", function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
