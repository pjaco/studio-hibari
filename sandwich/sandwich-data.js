/* =====================================================
   SANDWICHABEND — all content of /sandwich lives here.

   Everything except a person per sandwich is optional. Missing
   fields simply aren't shown (no date → "Datum folgt", no scores →
   no winner/ranking, no photos → no gallery, …).

   How to extend:
   - Person          → `people` (guest: true for one-off guests)
   - Evening         → `events`, in order (oldest first); `special: true` for specials
     · date: 'YYYY-MM-DD'        · host: <personId>        · guest: <personId>
     · location: '…'             · winner: <sandwichId>   (if known without scores)
     · photos: [{ src: '/images/sandwich/…jpg', caption: '…' }]
     · comments: [{ author: <personId>, text: '…' }]
   - Sandwich        → inside an evening's `sandwiches`
     · name: '…' (null = "Name folgt")   · creator: <personId>   (required)
     · cube: 'Sandwich' | 'Toast' | 'Taco' | 'Sushi' | 'Quiche' | 'Calzone' | 'Salad' | 'Cake'
     · description: '…'                  · photo: '/images/sandwich/…jpg'
     · score: 8.7                        → final score (if only the total is known)
     · scores: { <judgeId>: 1–10 }       → overall = average (used when there's no score)
     · favoriteVotes: 2                  → favourite-sandwich votes, break a tie on score
     · stats: { integrity, sauce, crunch, heart, madness } 1–10 → radar chart
     · disaster: '…'                     → shown in the Hall of Shame
   ===================================================== */

window.SANDWICH_DATA = {
  // Each person keeps their colour everywhere (avatars, charts).
  // Green / yellow / red were checked for colour-blind separation.
  people: [
    { id: 'thomas',   name: 'Thomas',   color: '#2B8255' },  // green (Pickle)
    { id: 'leon',     name: 'Leon',     color: '#E0A800' },  // yellow (mustard)
    { id: 'nils',     name: 'Nils',     color: '#D92525' },  // red (Ketchup)
    { id: 'jeanette', name: 'Jeanette', color: '#E4D5BC', guest: true },
  ],

  // The five absurd radar axes (keys used in a sandwich's `stats`)
  statAxes: [
    { key: 'integrity', label: 'Strukturelle Integrität', short: 'Integrität',  hint: 'Fällt es beim ersten Bissen auseinander?' },
    { key: 'sauce',     label: 'Sauce-to-Bread-Ratio',    short: 'Sauce/Brot',  hint: 'Die goldene Mitte zwischen trocken und Tatort.' },
    { key: 'crunch',    label: 'Crunch-Faktor',           short: 'Crunch',      hint: 'Hört man es noch im Nebenzimmer?' },
    { key: 'heart',     label: 'Heart Attack Risk',       short: 'Herzinfarkt', hint: 'Kardiologisch bedenklich = hoher Wert.' },
    { key: 'madness',   label: 'Kreativer Wahnsinn',      short: 'Wahnsinn',    hint: 'Wie sehr hat jemand gefragt: „Warum?“' },
  ],

  // Cube Rule of Food — classified by where the starch is
  cubeRule: {
    Salad:    'Keine Stärke. Nur Belag. Mutig.',
    Toast:    'Stärke nur unten.',
    Sandwich: 'Stärke oben und unten.',
    Taco:     'Stärke unten und an zwei Seiten.',
    Sushi:    'Stärke an vier Seiten, Enden offen.',
    Quiche:   'Stärke unten und an allen vier Seiten.',
    Calzone:  'Rundum in Stärke gehüllt.',
    Cake:     'Stärke oben, unten, irgendwie überall. Fragwürdig.',
  },

  // House rules, in the order they were introduced. since / reason are optional.
  rules: [
    {
      title: 'Kein Sandwich doppelt',
      text: 'Niemand darf zweimal mit demselben Sandwich antreten. Wer schon mit einem Sandwich angetreten ist, muss sich etwas Neues einfallen lassen.',
      since: 2025,
      reason: 'Nils hat 2023 und 2024 beide Male mit seinem Tuna Sandwich gewonnen.',
    },
    {
      title: 'Die Lieblingssandwich-Regel',
      text: 'Haben mehrere Sandwiches dieselbe Punktzahl, gewinnt das Sandwich mit den meisten Stimmen als Lieblingssandwich.',
      since: 2025,
      reason: '2025 lagen Taco Sandwich und BGT gleichauf bei 8,7 Punkten. Das Taco Sandwich bekam 2 Lieblings-Votes, das BGT 1.',
    },
  ],

  // Oldest first. TODO: the missing sandwich names (and anything else you remember).
  events: [
    {
      id: 'ed1',
      edition: '2023',
      title: 'Sandwichabend 2023',
      winner: 'ed1-nils',
      sandwiches: [
        { id: 'ed1-thomas', name: null,            creator: 'thomas' },
        { id: 'ed1-leon',   name: null,            creator: 'leon' },
        { id: 'ed1-nils',   name: 'Tuna Sandwich', creator: 'nils' },
      ],
    },
    {
      id: 'spezial1',
      edition: '2024 · Gast-Edition',
      title: 'Sandwichabend 2024 · Gast-Edition',
      special: true,
      guest: 'jeanette',
      winner: 'sp1-nils',
      sandwiches: [
        { id: 'sp1-thomas',   name: 'Klassiker Sandwich',      creator: 'thomas',   description: 'Kochschinken, Ketchup, Käse.' },
        { id: 'sp1-leon',     name: null,                      creator: 'leon' },
        { id: 'sp1-nils',     name: 'Tuna Sandwich',           creator: 'nils' },
        { id: 'sp1-jeanette', name: 'Tomate-Mozzarella-Pesto', creator: 'jeanette', description: 'Tomate, Mozzarella, Pesto.' },
      ],
    },
    {
      id: 'ed2',
      edition: '2025',
      title: 'Sandwichabend 2025',
      // No explicit winner: Taco Sandwich and BGT tie on 8.7, the favourite votes decide
      sandwiches: [
        { id: 'ed2-thomas', name: 'Taco Sandwich',              creator: 'thomas', score: 8.7, favoriteVotes: 2 },
        { id: 'ed2-leon',   name: 'Klassiker Advanced',         creator: 'leon',   score: 7,   description: 'Kochschinken, Ketchup, Käse und Gurken.' },
        { id: 'ed2-nils',   name: 'Black Garlic Turkey (BGT)',  creator: 'nils',   score: 8.7, favoriteVotes: 1 },
      ],
    },
  ],
};
