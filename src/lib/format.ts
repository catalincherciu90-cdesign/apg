// Helperi de formatare echivalenti cu functiile PHP folosite in template-uri.

export function esc(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// echivalent number_format(n, dec) din PHP (separator zecimal '.', mii ',')
export function numberFormat(n: number | string | null | undefined, dec = 2): string {
  const num = Number(n ?? 0);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

// Formateaza 'YYYY-MM-DD' -> 'DD.MM.YYYY'
export function dateRo(d: string | null | undefined): string {
  if (!d) return '—';
  const m = String(d).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(d);
  return `${m[3]}.${m[2]}.${m[1]}`;
}

// 'HH:MM:SS' -> 'HH:MM'
export function timeShort(t: string | null | undefined): string {
  return t ? String(t).slice(0, 5) : '';
}

export function nl2br(s: string): string {
  return esc(s).replace(/\n/g, '<br>');
}

const SERVICII_LABEL: Record<string, string> = {
  revizie: 'Revizie',
  reparatie: 'Reparație mecanică',
  verificare_rampa: 'Verificare rampă',
};
export function serviciuLabel(tip: string): string {
  return SERVICII_LABEL[tip] ?? (tip ? tip[0].toUpperCase() + tip.slice(1) : '');
}

export const STATUS_LABEL: Record<string, string> = {
  asteptare: 'În așteptare',
  confirmat: 'Confirmat',
  respins: 'Respins',
  in_lucru: 'În lucru',
  finalizat: 'Finalizat',
};

export function anCurent(): number {
  return new Date().getFullYear();
}

// Data curenta in fusul Europe/Bucharest, format 'YYYY-MM-DD'
export function todayRo(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts; // en-CA produce YYYY-MM-DD
}

// Numar de zile intregi intre doua date 'YYYY-MM-DD' (b - a)
export function diffDays(a: string, b: string): number {
  const ta = Date.parse(a + 'T00:00:00Z');
  const tb = Date.parse(b + 'T00:00:00Z');
  return Math.round((tb - ta) / 86400000);
}

// Adauga zile la o data 'YYYY-MM-DD'
export function addDays(d: string, days: number): string {
  const t = Date.parse(d + 'T00:00:00Z') + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
