import type { Env } from '../types';

// Inserează categoria „Reparații și mentenanță sistem răcire" în lista de
// prețuri, o singură dată (doar dacă nu există deja). Prețurile sunt
// orientative — se pot ajusta din Admin → Prețuri.
let done = false;
export async function ensurePretRacire(env: Env): Promise<void> {
  if (done) return;
  const CAT = 'Reparații și mentenanță sistem răcire';
  try {
    const exists = await env.DB.prepare('SELECT id FROM preturi WHERE categorie = ? LIMIT 1').bind(CAT).first();
    if (!exists) {
      const items: Array<[string, number, number, string]> = [
        ['Înlocuire pompă de apă', 200, 1, ''],
        ['Înlocuire termostat', 100, 1, ''],
        ['Înlocuire radiator răcire', 200, 1, ''],
        ['Schimb furtune și coliere răcire', 100, 1, ''],
        ['Schimb antigel (spălare + lichid)', 120, 1, ''],
        ['Verificare și presurizare sistem răcire', 80, 0, 'diagnoză'],
      ];
      const row = await env.DB.prepare('SELECT MAX(ordine) AS m FROM preturi').first<{ m: number }>();
      let o = row?.m ?? 0;
      for (const [nume, pret, includePiese, nota] of items) {
        await env.DB.prepare('INSERT INTO preturi (categorie, nume, pret_de_la, include_piese, nota, ordine) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(CAT, nume, pret, includePiese, nota, ++o)
          .run();
      }
    }
    done = true;
  } catch {
    /* tabela indisponibilă — ignoră */
  }
}
