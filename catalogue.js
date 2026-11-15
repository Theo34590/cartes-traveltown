// Catalogue par défaut de la saison en cours (relevé le 15/11/2026, version Facebook).
// 18 albums x 9 cartes : [emoji, nom de l'album, [[nom de la carte, étoiles] x 9]].
// Noms relevés sur les listes publiques des revendeurs. Les cartes dorées ne sont
// pas identifiées : la famille peut en marquer une dans l'app (fiche > Corriger),
// comme corriger un nom ; la correction est partagée avec tout le monde.
// À chaque nouvelle saison, ce fichier doit être refait (demander à Claude).
var CATALOGUE_DEFAUT = {
  saison: "Saison de novembre 2026",
  albums: [
    ["🚑", "Emergency Expectations", [["Paramedic Pose",1],["Radio Ride",1],["Ambulance Action",1],["Medical Materials",1],["Patient’s Perch",1],["Cactus Crisis",1],["Prickly Patient",1],["Healing Handshake",1],["Medic’s Misstep",2]]],
    ["🏄", "Surfing Sanctuary", [["Coastal Cottage",1],["Tide Tidier",1],["Surf Snap",1],["Surfer’s Stash",1],["Fix Finish",1],["Buffer Blitz",1],["Board Bond",1],["Crafty Care",2],["Surf Showcase",2]]],
    ["🧜", "Siren Seekers", [["Coastal Keeper",1],["Sailor Sketch",1],["Case Connections",1],["Stringed Stories",1],["Friendly Float",1],["Cranium Cove",1],["Mermaid Memories",2],["Prehistoric Prints",2],["Mermaid Miss",2]]],
    ["🧖", "Spa Celebration", [["Spa Setting",1],["Bathrobe Besties",1],["Pampered Pals",1],["Taffy’s Time Out",1],["Calming Combo",1],["Spa Selfie",2],["Summer’s Soothe",2],["Tranquil Toes",2],["Peaceful Pyramid",2]]],
    ["📮", "Postal Paradise", [["Mailbag Magic",1],["Courier’s Cap",1],["Package Portal",1],["Postage Pro",1],["Letter Lot",2],["Postal Placement",2],["Delivery Delight",2],["Postal Pouch",2],["Mail Manor",3]]],
    ["🫧", "Suds Stories", [["Laundry Literature",1],["Washing Worries",1],["Stain Solutions",1],["Socks & Sun",1],["Oscar’s Obstacle",2],["The Bubbles",2],["Tidy Team",2],["Tucked Taffy",3],["Laundry Letdown",3]]],
    ["🎨", "Crafting Corner", [["Artsy Accessories",1],["Butterfly Burst",1],["Paint Party",1],["Proud Painters",2],["Princess Painting",2],["Playful Palette",2],["Monkey Mementos",2],["Dino Doodle",3],["Crafty Companions",3]]],
    ["💍", "Esme’s Elegance", [["Coastal Charms",1],["Esme’s Exhibit",1],["Jewel Jotting",1],["Sparkling Spectrum",2],["Artisan Area",2],["Ruby Review",2],["Ring Refiner",3],["Shell Showcase",3],["Mirror Marvel",3]]],
    ["🌵", "Prickly Park", [["Botanical Burrow",1],["Curious Cacti",1],["Thorny Threshold",1],["Succulent Snap",2],["Taffy’s Thorns",2],["Cactus Cap",3],["Prickly Plants",3],["Cacti Canvas",3],["Succulent Smile",3]]],
    ["🔨", "Handy Haven", [["Baz’s Bargain",1],["Handy How-To",1],["Birdhouse Blueprint",1],["Happy Handiwork",2],["Hammer Help",2],["Oscar’s Offering",3],["Birdhouse Bond",3],["Birdie Bungalow",3],["Chirpy Cottage",4]]],
    ["🍌", "Banana Museum", [["Banana Beacon",1],["Fruitful Frame",1],["Displayed Delight",2],["Banana Bites",2],["Monkey Monolith",2],["Exhibition Elegance",3],["Banana Beam",3],["Cultured Company",3],["Taffy Tapestry",4]]],
    ["🏐", "Sandy Sports", [["Showdown Stare",1],["Team Threads",2],["Tug Triumph",2],["Sack Sprint",2],["Coastal Cooler",3],["Drink Defender",3],["Beach Bend",3],["Reach Rally",4],["Sophia’s Success",4]]],
    ["🍭", "Flossy Fun", [["Fun Ferris",1],["Candy Child",2],["Cotton Catastrophe",3],["Fix-it Fellow",3],["Fluffy Feast",4],["Wiring Whiz",4],["Cotton Cart",4],["Candy Calamity",4],["Monkey Munchies",5]]],
    ["🎸", "Sophia’s Session", [["Strumming Serenity",1],["Turntable Tunes",2],["Beat Buddies",3],["Duet Delight",3],["Audio Accessory",4],["Record Realm",4],["Sofa Symphony",4],["Groovy Grub",5],["Piano Pals",5]]],
    ["📸", "Marvelous Memories", [["Flock Finders",2],["Snorkeling Set",3],["Builder’s Bundle",4],["Urgent Utilities",4],["Dazzle Display",4],["Chef’s Kit",4],["Rhythm Retreat",4],["Backyard Basics",5],["Sprout Supplies",5]]],
    ["🏕️", "Camping Craze", [["Cooler Cache",3],["Chop Champion",3],["Shine Source",3],["Packed Pickup",4],["Trail Throne",4],["Stick Snacks",4],["Picnic Place",5],["Snug Space",5],["Nature Niche",5]]],
    ["☕", "Ada’s Cafe", [["Latte Landmark",3],["Bean Burst",3],["Espresso Engine",4],["Grind Glory",4],["Steamy Servings",4],["Whipped Wonder",5],["Latte Legend",5],["Sweet Sips",5],["Ada’s Aroma",5]]],
    ["⛵", "Summer Ship", [["Vessel Vision",3],["Timber Trimmings",4],["Paint Project",4],["Coastal Carpenter",4],["Ape Assistant",4],["Drill Duo",5],["Ship Shapers",5],["Wooden Wharf",5],["Seaside Squad",5]]]
  ]
};
