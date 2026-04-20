export const SUPABASE_URL = 'https://lxpoanjmobqpcqdbdcgk.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_PSLuNWv6OqCqRSIPBAIGpA_g7BwlBUO';

export const IS_PRIVATE_BUILD =
  import.meta.env?.VITE_WITHIN_REACH_BUILD === 'private' ||
  import.meta.env?.VITE_PRIVATE_BUILD === 'true' ||
  import.meta.env?.MODE === 'private';
export const ENABLE_SECRET_SECTION =
  IS_PRIVATE_BUILD && import.meta.env?.VITE_ENABLE_SECRET_SECTION !== 'false';

export const ENABLE_FUNNY_FACTS = true;
export const ARRIVAL_REVEAL_DELAY_MS = 2600;
export const MAX_NOTE_LENGTH = 300;
export const DEBUG_UI_MESSAGES = false;

export const ACCENT_BY_USER = {
  joey: '#678a5b',
  jeszi: '#8661a9',
};

export const GREETING_BY_USER = {
  joey: 'Hey Joey;',
  jeszi: 'Hey Jeszi;',
};

export const AMBIENT_LINES_SHARED = [
  'You found your way back here.',
  'A little signal made it through.',
  'This space was waiting.',
  'A quiet check-in arrived.',
  'You made it back.',
  'A familiar stop.',
  'Someone was thinking of you.',
  'A small place to pause.',
  'Another little thread held.',
  'Something gentle made its way here.',
  'This corner kept its light on.',
  'A small return.',
  'You reached the quiet part.',
  'A little trace of someone is here.',
  'Still, here you are.',
];

export const AMBIENT_LINES_PERSONALIZED = {
  joey: [
    'Jeszi left room for you here.',
    'A familiar signal found you.',
    'Something soft was waiting on the other side.',
    'You made your way back to her corner.',
    'A quiet thread pulled you here.',
  ],
  jeszi: [
    'Welcome 🌸 Kawaii Queen 🌸',
    'Joey left room for you here.',
    'A familiar signal found you.',
    'Something soft was waiting on the other side.',
    'You made your way back to this little corner.',
    'A quiet thread pulled you here.',
  ],
};

export const LANDING_SECONDARY_LINE_WEIGHTING = {
  none: 0.2,
  shared: 0.6,
  personal: 0.15,
  secret: 0.05,
};

export const SECRET_CLUE_FRAGMENT_CHANCE = 0.02;
export const SECRET_CLUE_FRAGMENTS = [
  'there is',
  'a note here',
  'if you keep',
  'returning.',
];
export const HIDDEN_LETTER_PATH = './kept.html';

export const FUNNY_FACTS_SHARED = {
  outOfTheBox: [
    'Sea otters have favorite rocks.',
    'Some cats are allergic to humans.',
    'A cloud can weigh more than a million pounds.',
    'Rats laugh when they are tickled.',
    'Honeybees can recognize human faces.',
    'There are mushrooms that glow in the dark.',
    'Sea otters hold hands so they do not drift apart.',
    'A shrimp\'s heart is in its head.',
    'Butterflies can taste with their feet.',
    'Cows tend to have best friends.',
  ],
  animalOddities: [
    'Octopuses have three hearts.',
    'Koalas have fingerprints very similar to humans.',
    'Sloths can hold their breath longer than dolphins.',
    'Wombats make cube-shaped poop.',
    'Crows can remember human faces.',
    'Some frogs freeze and thaw back out later.',
    'Elephants can recognize themselves in mirrors.',
    'Penguins sometimes propose with pebbles.',
    'Dolphins use signature whistles a bit like names.',
    'Ladybugs can smell with their feet.',
  ],
  languageOddities: [
    'The dot over a lowercase i is called a tittle.',
    'Eavesdrop comes from standing under the eaves to overhear people.',
    'Bookkeeper is one of the few common words with three double letters in a row.',
    'The longest English word typed with only the top row is typewriter.',
    'Queue is mostly just one letter waiting politely.',
    'The word salary traces back to salt.',
    'Moonbow is a real word. It is a rainbow made by moonlight.',
    'Petrichor is the smell after rain.',
    'Apricity means the warmth of the sun in winter.',
    'Liminal used to belong mostly to thresholds before the internet got hold of it.',
  ],
  spaceAndScale: [
    'Sharks existed before trees.',
    'The light from the sun takes about eight minutes to reach Earth.',
    'Venus spins the opposite direction of most planets.',
    'A day on Venus is longer than its year.',
    'The North Star will not always be the North Star.',
    'Saturn would float in water if you had a bathtub large enough.',
    'The moon has moonquakes.',
    'A teaspoon of neutron star would weigh an absurd amount.',
    'There are more possible chess games than atoms in the observable universe.',
    'The universe is still expanding, which feels a little rude to certainty.',
  ],
  dryAsides: [
    'A surprising amount of life is held together by tiny rituals.',
    'Not every strange detail needs a larger lesson.',
    'Some facts arrive like trivia. Some arrive like evidence.',
    'The world keeps making odd little choices without consulting anyone.',
    'There is no reason a crow should feel this symbolic, and yet.',
    'Some details are too specific not to matter to somebody.',
    'The universe has a habit of being quietly excessive.',
    'A lot of existence is just unlikely things continuing anyway.',
  ],
};

export const CHECK_IN_TEMPLATES = [
  '{name} was thinking of you.',
  'A little thought from {name}.',
  '{name} stopped by.',
  '{name} left a quiet check-in.',
  'A small signal from {name}.',
  '{name} found their way back here.',
  '{name} passed through here for a moment.',
  '{name} sent a little thought your way.',
  'A familiar check-in from {name}.',
  '{name} left a soft trace here.',
];

export const REACTIONS = ['❤️', '✨', '🥹', '🌙', '🐞', '🌸'];

export const FOOTER_LINES = [
  'Still here.',
  'Quietly kept.',
  'A place to return to.',
  'Held in small ways.',
  'Left open.',
  'Waiting softly.',
];

export const VAPID_PUBLIC_KEY = 'BFtJms2W7rtiu8GqF9rvu8SllB2V5530N7DeB3esHyJTrBdp9LFaxhT1RxB62UgcSec274FS8XM1YBlOVyEaosA';
 
