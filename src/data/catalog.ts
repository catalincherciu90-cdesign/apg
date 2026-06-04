// Port din legacy/catalog_piese.php — date statice pentru selectia din deviz (admin).
export const CATALOG_PIESE: Record<string, string[]> = {
  Motor: [
    'Segmenți piston (compresie)', 'Segmenți piston (ungere)', 'Bolț piston', 'Cuzineți arbore cotit',
    'Cuzineți bielă', 'Garnitură chiulasă', 'Garnitură capac', 'Garnitură baie ulei',
    'Simering arbore cotit', 'Simering ax came', 'Arcuri supape', 'Tacheți / culbutori',
    'Ghiduri supape', 'Șuruburi chiulasă',
  ],
  Transmisie: [
    'Rulmenți cutie viteze', 'Sincroane', 'Furci schimbător', 'Rulment presiune ambreiaj',
    'Disc ambreiaj', 'Burdufuri planetară', 'Vaselină articulații',
  ],
  'Suspensie & direcție': [
    'Bucșe (silent block-uri)', 'Pivoți', 'Rulmenți flanșă amortizor', 'Flanșe amortizor',
    'Burdufuri direcție', 'Cleme și prinderi metalice',
  ],
  Frânare: [
    'Kit reparație etrier (garnituri, piston)', 'Arcuri și cleme plăcuțe', 'Șuruburi disc frână',
    'Senzori ABS', 'Inele ABS',
  ],
  'Admisie & evacuare': [
    'Garnituri admisie', 'Garnituri evacuare', 'Senzor lambda', 'Actuator turbină',
    'Coliere metalice', 'Șuruburi evacuare', 'Arcuri evacuare',
  ],
  Răcire: ['O-ring-uri etanșare', 'Coliere furtune', 'Capac radiator (cu supapă)', 'Garnitură pompă apă'],
  Electric: ['Perii alternator', 'Solenoid electromotor', 'Conectori electrici', 'Siguranțe'],
  'Roți & rulare': ['Prezoane / șuruburi roată', 'Valve aer', 'Capace protecție butuc', 'Simering rulment'],
};

export const CATALOG_MANOPERA: string[] = [
  'Diagnosticare', 'Manoperă motor', 'Manoperă transmisie', 'Manoperă suspensie',
  'Manoperă frânare', 'Manoperă admisie/evacuare', 'Manoperă răcire', 'Manoperă electrică',
  'Geometrie roți', 'Altă manoperă',
];
