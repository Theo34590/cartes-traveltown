// Catalogue de la saison en cours : « Poussières d'étoiles effrayantes » (novembre 2026).
// Relevé le 15/11/2026 sur les captures d'écran du jeu en français (version Facebook).
// Format : [emoji, nom de l'album, [[nom de la carte, étoiles, dorée?] x 9]].
// Le 3e élément « true » marque une carte dorée (cadre jaune, non échangeable entre amis).
// La famille peut corriger un nom dans l'app (fiche de la carte > Corriger).
// À chaque nouvelle saison, ce fichier doit être refait (demander à Claude).
var CATALOGUE_DEFAUT = {
  saison: "Poussières d'étoiles effrayantes",
  albums: [
    ["🤖", "Sélection Pulse", [["Fermier du futur",1],["Boîte de robots",1],["Vue virtuelle",1],["Techno-gadgets",1],["Robe numérique",1],["Note néon",1],["Casquette cyber",1],["Recharge express",1],["En hauteur",2]]],
    ["🌌", "Tenue astro", [["Croquis de l'espace",1],["Gribouillage numérique",1],["Serpent stellaire",1],["Robe cosmique",1],["Sculpture cosmique",1],["Ciseaux spatiaux",1],["Armure alien",1],["Rayon-balai",2],["Chien cosmique",2]]],
    ["🎧", "Basse spatiale", [["Soucoupe scintillante",1],["Mélangeur de monstres",1],["Plaisir du fader",1],["Roue spatiale",1],["Squash sonique",1],["Foxtrot flottant",1],["Tourtereaux d'argent",2],["Chants de vampire",2],["Comble de la fête",2]]],
    ["🛍️", "Accès cosmique", [["Réveil loufoque",1],["Folie des hologrammes",1],["Boutique des robots",1],["Folie au centre commercial",1],["Porteur de caisses",1],["Super extensible",2],["Frottage grinçant",2],["Tourbillon de merveilles",2],["Tracas du rangement",2]]],
    ["👻", "Repaire hanté", [["Buffet fantôme",1],["Soupe gluante",1],["Mambo de la momie",1],["Trésor sucré",1],["Selfie express",2],["Élixir mystérieux",2],["Gelée gigotante",2],["Marchand de gourmandises",2],["Compagnons de balai",3]]],
    ["🍳", "En-cas étoilés", [["Grill galactique",1],["Pensées gourmandes",1],["Coupe givrée d'Halloween",1],["Génie du wok",1],["Folie des tentacules",2],["Total",2],["Corvée de vaisselle",2],["Vers frétillants",3],["Robot cuisinier",3]]],
    ["🦇", "Frontière farfelue", [["Trésors oubliés",1],["Brigade des chauves-souris",1],["Frissons glacés",1],["Créature fromagère",2],["Petit intrus",2],["Forme dans l'ombre",2],["Bestiole en carton",2],["Joyeux Halloween !",3],["Crâne soyeux",3,true]]],
    ["☕", "Cosmos cocooning", [["Aurore automnale",1],["Curiosité de cristal",1],["Fenêtre en laine",1],["Bibliothèque verdoyante",2],["Cacao comète",2],["Pause douillette",2],["Câlin fait main",3],["Fête champêtre",3,true],["Sous les étoiles",3]]],
    ["🌱", "Pousses de l'espace", [["Domaine du dôme",1],["Forêt aux champignons",1],["Fronde flottante",1],["Fruits funky",2],["Galerie des spécimens",2],["Pousse instantanée",3],["Sphère germante",3],["Transport en douceur",3],["Plante gourmande",3,true]]],
    ["🦎", "Soutien stellaire", [["Sauver Rover",1],["Petits gloutons affamés",1],["Sécurité au passage piéton",1],["Pack de réparation",2],["Compagnie de cuisine",2],["Câlin guérisseur",3],["Lecture de récupération",3],["Café cosmique",3,true],["Cadeau pétales",4,true]]],
    ["🍂", "Verger orbital", [["Ferme flottante",1],["Gants et gadgets",1],["Cosse précieuse",2],["Récoltes en folie",2],["Glouton vorace",2],["Plan génial",3],["Travaux de soudure",3,true],["Pote des prés",3],["Bienvenue à tire-d'aile",4,true]]],
    ["🍽️", "Galaxie reconnaissante", [["Pluie d'étoiles",1],["Splendeur rôtie",2],["Nouveau plat",2],["Grosses bouchées",2],["Tintement coloré",3],["Dressage des plats",3],["Plaisir gourmand",3],["Cerceau de récolte",4,true],["Groupe rayonnant",4,true]]],
    ["🍬", "Sortie spatiale sucrée", [["Cadeau étincelant",1],["Porteurs de bonbons",2],["Cadeau du perron",3,true],["Butin de gobelins",3],["Duvet volant",4],["Douceurs givrées",4],["Aperçu du portail",4,true],["Fondue fondante",4],["Coup de mou sucré",5,true]]],
    ["🚨", "Folie à la station", [["Coin tranquille",1],["Pont animé",2],["Alerte d'alarme",3],["Casseurs de câbles",3],["Rush dans les couloirs",4,true],["Bande de chenapans",4],["Plan du projecteur",4,true],["Supercherie holographique",5],["Trio triomphant",5,true]]],
    ["🎃", "Jeux des gourdes", [["Courge tachetée",2],["Récolte abondante",3,true],["Kit de sculpture",4],["Tripes gluantes",4],["Champ de citrouilles",4],["Coups de dents",4,true],["Le stress du jury",4],["Farandole de lanternes",5],["Gloire des courges",5,true]]],
    ["🚀", "Halloween flottant", [["Satellite orange",3],["Globe scintillant",3],["Envol des courges",3,true],["Tempête de glaçage",4],["Cascade de bonbons",4,true],["Fièvre des lanternes",4,true],["Squelette collant",5,true],["Fils scintillants",5],["Chef-d'œuvre maquillage",5]]],
    ["🦃", "Festin gourmand", [["Bouée à plumes",3],["Chapeau auto-stoppeur",3,true],["Garnitures de dinde",4],["Sucette porte-bonheur",4],["Folie des tambours",4],["Joie des confettis",5,true],["Amuseur trémoussant",5,true],["Plumes fantaisie",5],["Rugissement de la rockstar",5,true]]],
    ["🧸", "Chariots cosmiques", [["Dôme des bons plans",3],["Tour de jouets",4],["Chasse au chariot",4],["Choix de peluche",4],["Fièvre des héros",4,true],["Primate en peluche",5],["Paiement de cochonnet",5,true],["Compte à rebours de la caisse",5,true],["Amis à poils pour toujours",5,true]]]
  ]
};
