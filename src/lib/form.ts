// Helperi pentru parsarea numelor de câmp tip PHP: name[idx][camp] și name[cheie].

export function parseRanduri(form: FormData): Array<Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  for (const [key, value] of form.entries()) {
    const m = key.match(/^randuri\[([^\]]+)\]\[([^\]]+)\]$/);
    if (!m) continue;
    const [, idx, field] = m;
    if (!map.has(idx)) map.set(idx, {});
    map.get(idx)![field] = String(value);
  }
  return [...map.values()];
}

// Returneaza perechi { id, ordine } din câmpurile ordine[id]=valoare
export function parseOrdine(form: FormData): Array<{ id: number; ordine: number }> {
  const out: Array<{ id: number; ordine: number }> = [];
  for (const [key, value] of form.entries()) {
    const m = key.match(/^ordine\[([^\]]+)\]$/);
    if (!m) continue;
    out.push({ id: parseInt(m[1], 10), ordine: parseInt(String(value), 10) });
  }
  return out;
}

// Valorile multiple ale unui câmp (ex: permisiuni[])
export function getAll(form: FormData, name: string): string[] {
  return form.getAll(name).map((v) => String(v));
}
