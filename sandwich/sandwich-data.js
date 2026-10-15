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
     · scores: { <judgeId>: 1–10 }       → overall = average, decides the winner
     · stats: { integrity, sauce, crunch, heart, madness } 1–10 → radar chart
     · disaster: '…'                     → shown in the Hall of Shame
   ===================================================== */

window.SANDWICH_DATA = {
  people: [
    { id: 'thomas',   name: 'Thomas',   color: '#D92525' },
    { id: 'leon',     name: 'Leon',     color: '#FF9F1C' },
    { id: 'nils',     name: 'Nils',     color: '#2B8255' },
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

  // Oldest first. Known: the winners. TODO: the other sandwich names (and anything else you remember).
  events: [
    {
      id: 'ed1',
      edition: '2024',
      title: 'Sandwichabend 2024',
      winner: 'ed1-nils',
      sandwiches: [
        { id: 'ed1-thomas', name: null,            creator: 'thomas' },
        { id: 'ed1-leon',   name: null,            creator: 'leon' },
        { id: 'ed1-nils',   name: 'Tuna-Sandwich', creator: 'nils' },
      ],
    },
    {
      id: 'spezial1',
      edition: '2025 · Gast-Edition',
      title: 'Sandwichabend 2025 · Gast-Edition',
      special: true,
      guest: 'jeanette',
      winner: 'sp1-nils',
      sandwiches: [
        { id: 'sp1-thomas',   name: null,            creator: 'thomas' },
        { id: 'sp1-leon',     name: null,            creator: 'leon' },
        { id: 'sp1-nils',     name: 'Tuna Sandwich', creator: 'nils' },
        { id: 'sp1-jeanette', name: null,            creator: 'jeanette' },
      ],
    },
    {
      id: 'ed2',
      edition: '2026',
      title: 'Sandwichabend 2026',
      winner: 'ed2-thomas',
      sandwiches: [
        { id: 'ed2-thomas', name: 'Taco Sandwich', creator: 'thomas' },
        { id: 'ed2-leon',   name: null,            creator: 'leon' },
        { id: 'ed2-nils',   name: null,            creator: 'nils' },
      ],
    },
  ],
};
