/* =====================================================
   SANDWICHABEND — all content of /sandwich lives here.

   ⚠️ MOCK DATA: names, dates, sandwiches, scores and comments are
   placeholders. Replace them with the real evenings.

   How to extend:
   - New person      → add to `people` (guest: true for one-off guests)
   - New evening     → add to `events` (newest last); `special: true` for specials
   - Photos          → `photos: [{ src: '/images/sandwich/…jpg', caption: '…' }]`
                        (without `src` a drawn placeholder is shown)
   - Sandwich photo  → `photo: '/images/sandwich/…jpg'` on the sandwich
   - Scores          → `scores: { <judgeId>: 1–10 }`, overall = average
   - Stats           → 1–10 on the five radar axes (see `statAxes`)
   ===================================================== */

window.SANDWICH_DATA = {
  people: [
    { id: 'thomas',  name: 'Thomas',         tagline: 'Hat die Website gebaut, also gewinnt er.', emoji: '🥪', color: '#D92525' },
    { id: 'baron',   name: 'Der Brotbaron',  tagline: 'Besitzt mehr Brotmesser als Teller.',      emoji: '🍞', color: '#FF9F1C' },
    { id: 'sensei',  name: 'Senf-Sensei',    tagline: 'Senf ist kein Gewürz, Senf ist ein Lebensstil.', emoji: '🌭', color: '#2B8255' },
    { id: 'gast',    name: 'Der Gast',       tagline: 'Kam, sah, belegte.', emoji: '🌮', color: '#1A1A1A', guest: true },
  ],

  // The five absurd radar axes (keys used in every sandwich's `stats`)
  statAxes: [
    { key: 'integrity', label: 'Strukturelle Integrität', short: 'Integrität', hint: 'Fällt es beim ersten Bissen auseinander?' },
    { key: 'sauce',     label: 'Sauce-to-Bread-Ratio',    short: 'Sauce/Brot', hint: 'Die goldene Mitte zwischen trocken und Tatort.' },
    { key: 'crunch',    label: 'Crunch-Faktor',           short: 'Crunch',     hint: 'Hört man es noch im Nebenzimmer?' },
    { key: 'heart',     label: 'Heart Attack Risk',       short: 'Herzinfarkt', hint: 'Kardiologisch bedenklich = hoher Wert.' },
    { key: 'madness',   label: 'Kreativer Wahnsinn',      short: 'Wahnsinn',   hint: 'Wie sehr hat jemand gefragt: „Warum?“' },
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

  events: [
    {
      id: 'ed1',
      edition: 'Edition #1',
      title: 'Die Ursuppe des Belags',
      date: '2024-10-12',
      host: 'thomas',
      special: false,
      location: 'Thomas’ Küche (Rauchmelder: 1× ausgelöst)',
      photos: [
        { caption: 'Die Zutatenschlacht', emoji: '🧀' },
        { caption: 'Toaster am Limit', emoji: '🔥' },
        { caption: 'Jury bei der Arbeit', emoji: '🧐' },
        { caption: 'Der Moment danach', emoji: '😵' },
      ],
      sandwiches: [
        {
          id: 'klassiker-deluxe',
          name: 'Der Klassiker Deluxe',
          creator: 'baron',
          cube: 'Sandwich',
          description: 'Sauerteig, Pastrami, Gürkchen, Senf. Ehrlich, solide, gefährlich gut.',
          scores: { thomas: 8.5, sensei: 9 },
          stats: { integrity: 9, sauce: 7, crunch: 6, heart: 6, madness: 3 },
        },
        {
          id: 'kimchi-grilled-cheese',
          name: 'Kimchi Grilled Cheese',
          creator: 'thomas',
          cube: 'Sandwich',
          description: 'Cheddar, Kimchi, Butter auf beiden Seiten. Fermentation trifft Fett.',
          scores: { baron: 7.5, sensei: 7 },
          stats: { integrity: 6, sauce: 5, crunch: 9, heart: 8, madness: 6 },
        },
        {
          id: 'nutella-leberwurst',
          name: 'Nutella-Leberwurst-Toast',
          creator: 'sensei',
          cube: 'Toast',
          description: '„Süß und herzhaft ist ein Trend.“ — Senf-Sensei, kurz vor der Katastrophe.',
          scores: { thomas: 2, baron: 1.5 },
          stats: { integrity: 7, sauce: 3, crunch: 4, heart: 7, madness: 10 },
          disaster: 'Die Jury musste kurz an die frische Luft.',
        },
      ],
      comments: [
        { author: 'baron',  text: 'Erster Abend, erster Sieg. Ich sag nur: Tradition schlägt Trend.' },
        { author: 'sensei', text: 'Ihr seid einfach nicht bereit für Nutella-Leberwurst.' },
        { author: 'thomas', text: 'Niemand ist bereit für Nutella-Leberwurst.' },
        { author: 'baron',  text: 'Der Rauchmelder hat das Kimchi-Ding übrigens mit 3/10 bewertet.' },
      ],
    },

    {
      id: 'ed2',
      edition: 'Edition #2',
      title: 'Die Rache des Senfs',
      date: '2025-10-11',
      host: 'baron',
      special: false,
      location: 'Beim Brotbaron (Teller: ausgeliehen)',
      photos: [
        { caption: 'Smash-Patty im Anflug', emoji: '🍔' },
        { caption: 'Katsu, frisch frittiert', emoji: '🍤' },
        { caption: 'Das Fundament (vorher)', emoji: '🏗️' },
        { caption: 'Das Fundament (nachher)', emoji: '💥' },
        { caption: 'Siegerpose', emoji: '🏆' },
      ],
      sandwiches: [
        {
          id: 'pulled-pork-smash',
          name: 'Pulled Pork Smash',
          creator: 'sensei',
          cube: 'Sandwich',
          description: '12 Stunden Pulled Pork, Krautsalat, drei Senfsorten. Rehabilitation in Brotform.',
          scores: { thomas: 9, baron: 8.5 },
          stats: { integrity: 6, sauce: 9, crunch: 5, heart: 9, madness: 5 },
        },
        {
          id: 'katsu-sando',
          name: 'Katsu Sando',
          creator: 'thomas',
          cube: 'Sandwich',
          description: 'Milchbrot ohne Rinde, Schnitzel, Tonkatsu-Sauce. Instagram hat applaudiert.',
          scores: { baron: 8, sensei: 8.5 },
          stats: { integrity: 8, sauce: 7, crunch: 9, heart: 6, madness: 4 },
        },
        {
          id: 'das-fundament',
          name: 'Das Fundament',
          creator: 'baron',
          cube: 'Cake',
          description: 'Fünf Etagen, sieben Brotscheiben, ein Statiker hätte abgelehnt.',
          scores: { thomas: 4, sensei: 3.5 },
          stats: { integrity: 1, sauce: 6, crunch: 3, heart: 10, madness: 9 },
          disaster: 'Kollabierte beim Anschneiden. Wurde mit dem Löffel gegessen.',
        },
      ],
      comments: [
        { author: 'sensei', text: 'Wer hat jetzt gelacht über meinen Senf? Genau. Niemand mehr.' },
        { author: 'thomas', text: 'Katsu Sando war objektiv das schönste Sandwich. Schönheit wird hier nicht belohnt.' },
        { author: 'baron',  text: 'Das Fundament war ein Konzept. Konzepte dürfen einstürzen.' },
        { author: 'sensei', text: 'Wir haben es mit dem Löffel gegessen, Baron.' },
      ],
    },

    {
      id: 'spezial1',
      edition: 'Spezial',
      title: 'Sandwichabend Spezial: Der Gast',
      date: '2026-03-14',
      host: 'sensei',
      special: true,
      guest: 'gast',
      location: 'Bei Senf-Sensei (Senfvorrat: bedenklich)',
      photos: [
        { caption: 'Der Gast betritt die Arena', emoji: '🚪' },
        { caption: 'Banh Mi Mise en Place', emoji: '🥖' },
        { caption: 'Der brotlose Frevel', emoji: '🥗' },
        { caption: 'Abstimmung per Handzeichen', emoji: '✋' },
      ],
      sandwiches: [
        {
          id: 'banh-mi-royale',
          name: 'Banh Mi Royale',
          creator: 'thomas',
          cube: 'Sandwich',
          description: 'Knuspriges Baguette, Pâté, Lemongrass-Schwein, Pickles, Koriander. Der Gast war still. Respektvoll still.',
          scores: { baron: 9, sensei: 9, gast: 9.5 },
          stats: { integrity: 7, sauce: 8, crunch: 10, heart: 5, madness: 6 },
        },
        {
          id: 'fruehstuecks-calzone',
          name: 'Frühstücks-Calzone',
          creator: 'baron',
          cube: 'Calzone',
          description: 'Rührei, Bacon und Cheddar im Pizzateig. Der Baron nennt es „Sandwich mit Dach“.',
          scores: { thomas: 7, sensei: 7.5, gast: 7 },
          stats: { integrity: 9, sauce: 4, crunch: 6, heart: 8, madness: 6 },
        },
        {
          id: 'taco-toast',
          name: 'Taco-Toast-Hybrid',
          creator: 'gast',
          cube: 'Taco',
          description: 'Toastbrot, in Taco-Form gepresst und frittiert. Regeln wurden gebeugt.',
          scores: { thomas: 6.5, baron: 6, sensei: 7 },
          stats: { integrity: 4, sauce: 6, crunch: 8, heart: 7, madness: 8 },
        },
        {
          id: 'der-brotlose',
          name: 'Der Brotlose',
          creator: 'sensei',
          cube: 'Salad',
          description: 'Ein „Sandwich“ aus Salatblättern statt Brot. Low Carb, High Betrug.',
          scores: { thomas: 3, baron: 2.5, gast: 4 },
          stats: { integrity: 2, sauce: 5, crunch: 7, heart: 1, madness: 8 },
          disaster: 'Laut Cube Rule ein Salat. Laut Jury eine Beleidigung.',
        },
      ],
      comments: [
        { author: 'gast',   text: 'Ich dachte, das wird ein entspannter Abend. Das war ein Gerichtsverfahren.' },
        { author: 'baron',  text: 'Calzone IST ein Sandwich. Die Cube Rule ist eine Meinung.' },
        { author: 'thomas', text: 'Die Cube Rule ist ein Gesetz, Baron.' },
        { author: 'sensei', text: 'Der Brotlose war ein Statement gegen Kohlenhydrat-Diktatur.' },
        { author: 'gast',   text: 'Komme nächstes Mal wieder. Mit Anwalt.' },
      ],
    },
  ],
};
