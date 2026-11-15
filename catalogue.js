// Catalogue de la saison en cours : « Poussières d'étoiles effrayantes » (novembre 2026).
// Relevé le 15/11/2026 sur la liste publique d'un revendeur (version Facebook, noms ANGLAIS :
// le jeu en français affiche d'autres noms ; la famille peut les corriger dans l'app,
// fiche de la carte > Corriger, et la correction est partagée avec tout le monde).
// Format : [emoji, nom de l'album, [[nom de la carte, étoiles] x 9]].
// null = carte dorée (non échangeable, donc absente des listes de revente ; ces
// emplacements sont identiques d'une saison à l'autre). Noms d'albums inconnus.
// À chaque nouvelle saison, ce fichier doit être refait (demander à Claude).
var CATALOGUE_DEFAUT = {
  saison: "Poussières d'étoiles effrayantes",
  albums: [
    ["🤖", "Album 1", [["Futuristic Farmer",1],["Bot Box",1],["Virtual View",1],["Tool Tech",1],["Digital Dress",1],["Neon Note",1],["Cyber Cap",1],["Power Pour",1],["Hover High",2]]],
    ["🌌", "Album 2", [["Space Sketch",1],["Digital Doodle",1],["Starlight Serpent",1],["Cosmic Gown",1],["Cosmic Carve",1],["Space Snips",1],["Alien Armor",1],["Broom Beam",2],["Cosmic Canine",2]]],
    ["🎧", "Album 3", [["Saucer Sparkle",1],["Monster Mixer",1],["Fader Fun",1],["Space Spin",1],["Sonic Squash",1],["Floating Foxtrot",1],["Silver Sweethearts",2],["Vampire Vocals",2],["Party Peak",2]]],
    ["🛍️", "Album 4", [["Wacky Wake-Up",1],["Hologram Hype",1],["Bot Boutique",1],["Mall Mayhem",1],["Crate Carrier",1],["Super Stretch",2],["Squeaky Scrub",2],["Whirling Wonder",2],["Tidy Trouble",2]]],
    ["🧪", "Album 5", [["Boo Buffet",1],["Slimy Soup",1],["Mummy Mambo",1],["Sweet Stash",1],["Snappy Selfie",2],["Eerie Elixir",2],["Jiggly Jelly",2],["Treat Trader",2],["Broom Buddies",3]]],
    ["🍳", "Album 6", [["Galaxy Grill",1],["Tasty Thoughts",1],["Spooky Sundae",1],["Wok Wizard",1],["Tentacle Tantrum",2],["Total Tally",2],["Dish Duty",2],["Wiggly Worms",3],["Dinner Droid",3]]],
    ["👻", "Album 7", [["Derelict Discovery",1],["Batty Brigade",1],["Frozen Fright",1],["Cheesy Creature",2],["Itsy Intruder",2],["Shadowy Shape",2],["Boxy Beast",2],["Happy Haunting",3],null]],
    ["🍂", "Album 8", [["Autumn Aurora",1],["Crystal Curiosity",1],["Woolly Window",1],["Leafy Library",2],["Comet Cocoa",2],["Puffy Pause",2],["Handmade Hug",3],null,["Galaxy Gazing",3]]],
    ["🍄", "Album 9", [["Dome Domain",1],["Fungi Forest",1],["Floating Frond",1],["Funky Fruit",2],["Specimen Showcase",2],["Snapshot Sprout",3],["Sprouting Sphere",3],["Careful Carry",3],null]],
    ["🐾", "Album 10", [["Rescue Rover",1],["Hungry Hatchlings",1],["Crosswalk Care",1],["Patch-Up Pack",2],["Cooking Company",2],["Healing Hug",3],["Recovery Reading",3],null,null]],
    ["🚜", "Album 11", [["Floating Farm",1],["Gloves & Gadgets",1],["Prized Pod",2],["Harvest Havoc",2],["Greedy Gobbler",2],["Brilliant Blueprint",3],null,["Field Friend",3],null]],
    ["🍽️", "Album 12", [["Starry Spread",1],["Roasted Radiance",2],["Dish Debut",2],["Big Bites",2],["Colorful Clink",3],["Plate Prep",3],["Belly Bliss",3],null,null]],
    ["🍬", "Album 13", [["Gleaming Goodie",1],["Candy Carriers",2],null,["Goblin Goodies",3],["Floating Fluff",4],["Frosted Fancies",4],null,["Melty Mess",4],null]],
    ["🚨", "Album 14", [["Quiet Quarters",1],["Busy Bridge",2],["Alarm Alert",3],["Wire Wreckers",3],null,["Mischief Mob",4],null,["Hologram Hoax",5],null]],
    ["🎃", "Album 15", [["Speckled Squash",2],null,["Carving Kit",4],["Gooey Guts",4],["Pumpkin Plot",4],null,["Judging Jitters",4],["Lantern Lineup",5],null]],
    ["✨", "Album 16", [["Orange Orbiter",3],["Glitter Globe",3],null,["Frosting Flurry",4],null,null,null,["Twinkle Threads",5],["Makeup Masterpiece",5]]],
    ["🦃", "Album 17", [["Feathered Float",3],null,["Turkey Trimmings",4],["Lucky Lollipop",4],["Drum Dazzle",4],null,null,["Fancy Feathers",5],null]],
    ["🧸", "Album 18", [["Deal Dome",3],["Toy Tower",4],["Cart Chase",4],["Plush Pick",4],null,["Plush Primate",5],null,null,null]]
  ]
};
