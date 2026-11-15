// Logique métier commune : exécutée telle quelle par Google Apps Script (serveur)
// et par l'application (mise à jour immédiate de l'écran avant la réponse du serveur).
// SOURCE UNIQUE : app/logique.js. La copie apps-script/Logique.js est faite par
// outils/preparer-script.js (un test vérifie qu'elles sont identiques).
var TT = (function () {
  var STATUTS_FINAUX = { envoyee: 1, refusee: 1, annulee: 1 };
  var CONSERVATION_JOURS = 14;

  function prenomPropre(p) {
    return String(p == null ? "" : p).trim().replace(/\s+/g, " ").slice(0, 30);
  }
  function memePrenom(a, b) {
    return prenomPropre(a).toLowerCase() === prenomPropre(b).toLowerCase();
  }
  function carteValide(c) {
    return /^([1-9]|1[0-9]|20)-[1-9]$/.test(String(c));
  }
  function erreur(msg) {
    var e = new Error(msg);
    e.metier = true;
    return e;
  }
  function etatVide() {
    return { joueurs: [], cartes: {}, demandes: [], catalogue: {} };
  }
  function trouverJoueur(etat, prenom) {
    for (var i = 0; i < etat.joueurs.length; i++) {
      if (memePrenom(etat.joueurs[i].prenom, prenom)) return etat.joueurs[i];
    }
    return null;
  }
  function exigerJoueur(etat, prenom) {
    var j = trouverJoueur(etat, prenom);
    if (!j) throw erreur("Membre inconnu : " + prenom);
    return j.prenom;
  }
  function quantite(etat, prenom, carte) {
    var c = etat.cartes[prenom];
    return c && c[carte] ? c[carte] : 0;
  }
  function fixer(etat, prenom, carte, q) {
    if (!etat.cartes[prenom]) etat.cartes[prenom] = {};
    if (q > 0) etat.cartes[prenom][carte] = q;
    else delete etat.cartes[prenom][carte];
  }
  function trouverDemande(etat, id) {
    for (var i = 0; i < etat.demandes.length; i++) {
      if (etat.demandes[i].id === id) return etat.demandes[i];
    }
    return null;
  }
  // Une carte transférée : le donneur perd un exemplaire, le receveur en gagne un,
  // et les autres demandes ouvertes du receveur pour cette carte deviennent inutiles.
  function transferer(etat, de, a, carte, maintenant, sauf) {
    fixer(etat, de, carte, Math.max(0, quantite(etat, de, carte) - 1));
    fixer(etat, a, carte, quantite(etat, a, carte) + 1);
    etat.demandes.forEach(function (d) {
      if (d !== sauf && d.statut === "ouverte" && d.de === a && d.carte === carte) {
        d.statut = "annulee";
        d.maj_le = maintenant;
      }
    });
  }
  function purger(etat, maintenant) {
    var limite = new Date(new Date(maintenant).getTime() - CONSERVATION_JOURS * 864e5).toISOString();
    etat.demandes = etat.demandes.filter(function (d) {
      return d.statut === "ouverte" || String(d.maj_le) >= limite;
    });
  }

  // Applique une action à l'état (modifié sur place). Lève une erreur "métier"
  // (e.metier = true) si l'action est refusée. Les actions sont idempotentes :
  // les rejouer après une coupure réseau ne double rien.
  function appliquer(etat, act, maintenant) {
    maintenant = maintenant || new Date().toISOString();
    var type = act && act.type;
    if (type === "joueur") {
      var p = prenomPropre(act.prenom);
      if (!p) throw erreur("Prénom vide");
      if (!trouverJoueur(etat, p)) {
        etat.joueurs.push({ prenom: p, couleur: String(act.couleur || ""), cree_le: maintenant });
      }
    } else if (type === "supprimer_joueur") {
      var ps = exigerJoueur(etat, act.prenom);
      etat.joueurs = etat.joueurs.filter(function (j) { return j.prenom !== ps; });
      delete etat.cartes[ps];
      etat.demandes = etat.demandes.filter(function (d) { return d.de !== ps && d.a !== ps; });
    } else if (type === "quantite") {
      var pq = exigerJoueur(etat, act.prenom);
      if (!carteValide(act.carte)) throw erreur("Carte invalide : " + act.carte);
      var q = Math.floor(Number(act.quantite));
      if (!(q >= 0 && q <= 99)) throw erreur("Quantité invalide");
      fixer(etat, pq, String(act.carte), q);
    } else if (type === "demande") {
      // Une demande s'adresse à toute la famille (a vide) ou à une personne.
      if (!act.id) throw erreur("Demande sans identifiant");
      if (trouverDemande(etat, act.id)) return; // déjà reçue
      var de = exigerJoueur(etat, act.de), a = act.a ? exigerJoueur(etat, act.a) : "";
      if (de === a) throw erreur("On ne peut pas se demander une carte à soi-même");
      if (!carteValide(act.carte)) throw erreur("Carte invalide : " + act.carte);
      var doublon = etat.demandes.some(function (d) {
        return d.statut === "ouverte" && d.de === de && d.carte === act.carte;
      });
      if (doublon) return;
      etat.demandes.push({ id: String(act.id), de: de, a: a, carte: String(act.carte), statut: "ouverte", cree_le: maintenant, maj_le: maintenant });
    } else if (type === "statut") {
      var d = trouverDemande(etat, act.id);
      if (!d) throw erreur("Cette demande n'existe plus");
      if (!STATUTS_FINAUX[act.statut]) throw erreur("Statut invalide");
      // Celui qui envoie : la personne qui clique (par), sinon le destinataire prévu.
      var par = act.statut === "envoyee" ? (act.par ? exigerJoueur(etat, act.par) : d.a) : "";
      if (act.statut === "envoyee" && !par) throw erreur("Qui a envoyé la carte ?");
      if (par && par === d.de) throw erreur("On ne peut pas s'envoyer une carte à soi-même");
      if (d.statut !== "ouverte") {
        // Deux personnes ont cliqué presque en même temps : la seconde est prévenue.
        if (d.statut === "envoyee" && par && d.a !== par) throw erreur("Déjà envoyée par " + d.a + " à " + d.de);
        return; // même action rejouée (coupure réseau) : rien à faire
      }
      d.statut = act.statut;
      d.maj_le = maintenant;
      if (act.statut === "envoyee") {
        d.a = par;
        transferer(etat, par, d.de, d.carte, maintenant, d);
      }
    } else if (type === "don") {
      // Envoi spontané (sans demande préalable), tracé comme une demande envoyée.
      if (!act.id) throw erreur("Don sans identifiant");
      if (trouverDemande(etat, act.id)) return;
      var donneur = exigerJoueur(etat, act.de), receveur = exigerJoueur(etat, act.a);
      if (donneur === receveur) throw erreur("Donneur et receveur identiques");
      if (!carteValide(act.carte)) throw erreur("Carte invalide : " + act.carte);
      var trace = { id: String(act.id), de: receveur, a: donneur, carte: String(act.carte), statut: "envoyee", cree_le: maintenant, maj_le: maintenant };
      etat.demandes.push(trace);
      transferer(etat, donneur, receveur, trace.carte, maintenant, trace);
    } else if (type === "catalogue") {
      var modifs = act.modifs || {};
      Object.keys(modifs).forEach(function (cle) {
        if (!carteValide(cle) && !/^([1-9]|1[0-9]|20)$/.test(cle)) throw erreur("Entrée de catalogue invalide : " + cle);
        var m = modifs[cle] || {};
        var ancien = etat.catalogue[cle] || {};
        etat.catalogue[cle] = {
          nom: m.nom != null ? String(m.nom).trim().slice(0, 60) : ancien.nom || "",
          etoiles: m.etoiles != null ? Math.max(0, Math.min(5, Math.floor(Number(m.etoiles) || 0))) : ancien.etoiles || 0,
          doree: m.doree != null ? !!m.doree : !!ancien.doree
        };
      });
    } else if (type === "nouvelle_saison") {
      if (act.confirmation !== "NOUVELLE SAISON") throw erreur("Confirmation manquante");
      etat.cartes = {};
      etat.demandes = [];
      etat.catalogue = {};
    } else {
      throw erreur("Action inconnue : " + type);
    }
    purger(etat, maintenant);
  }

  // Conversion vers/depuis les lignes des feuilles Google Sheets.
  var ENTETES = {
    Joueurs: ["prenom", "couleur", "cree_le"],
    Cartes: ["prenom", "carte", "quantite"],
    Demandes: ["id", "de", "a", "carte", "statut", "cree_le", "maj_le"],
    Catalogue: ["carte", "nom", "etoiles", "doree"]
  };
  function versLignes(etat) {
    var cartes = [];
    Object.keys(etat.cartes).forEach(function (p) {
      Object.keys(etat.cartes[p]).sort(triCarte).forEach(function (c) {
        cartes.push({ prenom: p, carte: c, quantite: etat.cartes[p][c] });
      });
    });
    var catalogue = Object.keys(etat.catalogue).sort(triCarte).map(function (c) {
      var e = etat.catalogue[c];
      return { carte: c, nom: e.nom, etoiles: e.etoiles, doree: e.doree ? "oui" : "" };
    });
    return { Joueurs: etat.joueurs, Cartes: cartes, Demandes: etat.demandes, Catalogue: catalogue };
  }
  function depuisLignes(l) {
    var etat = etatVide();
    (l.Joueurs || []).forEach(function (r) {
      var p = prenomPropre(r.prenom);
      if (p && !trouverJoueur(etat, p)) etat.joueurs.push({ prenom: p, couleur: String(r.couleur || ""), cree_le: String(r.cree_le || "") });
    });
    (l.Cartes || []).forEach(function (r) {
      var j = trouverJoueur(etat, r.prenom), q = Math.floor(Number(r.quantite));
      if (j && carteValide(r.carte) && q > 0) fixer(etat, j.prenom, String(r.carte), q);
    });
    (l.Demandes || []).forEach(function (r) {
      if (r.id) etat.demandes.push({ id: String(r.id), de: String(r.de), a: String(r.a), carte: String(r.carte), statut: String(r.statut), cree_le: String(r.cree_le), maj_le: String(r.maj_le) });
    });
    (l.Catalogue || []).forEach(function (r) {
      var c = String(r.carte);
      if (c) etat.catalogue[c] = { nom: String(r.nom || ""), etoiles: Number(r.etoiles) || 0, doree: String(r.doree).toLowerCase() === "oui" || r.doree === true };
    });
    return etat;
  }
  function triCarte(a, b) {
    var x = String(a).split("-"), y = String(b).split("-");
    return (Number(x[0]) - Number(y[0])) || ((Number(x[1]) || 0) - (Number(y[1]) || 0));
  }

  return {
    appliquer: appliquer, etatVide: etatVide, versLignes: versLignes, depuisLignes: depuisLignes,
    ENTETES: ENTETES, prenomPropre: prenomPropre, memePrenom: memePrenom, quantite: quantite,
    carteValide: carteValide, triCarte: triCarte
  };
})();
if (typeof module !== "undefined") module.exports = TT;
