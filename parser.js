// parser.js — lecture locale d'un CV PDF : items pdf.js -> champs structurés.
// Pur JS (aucune dépendance DOM) : utilisé par l'appli et par les tests Node.

export const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const HEADS = {
  experiences: ['experience professionnelle', 'experiences professionnelles', 'experience', 'experiences', 'parcours professionnel', 'emplois', 'emploi', 'work experience', 'professional experience', 'employment history', 'experience pro', 'missions', 'carriere', 'historique professionnel'],
  formations: ['formation', 'formations', 'education', 'etudes', 'diplomes', 'parcours scolaire', 'parcours academique', 'formation et diplomes', 'scolarite', 'cursus', 'parcours de formation'],
  competences: ['competences', 'competences cles', 'skills', 'savoir faire', 'competences techniques', 'outils', 'technologies', 'key skills', 'aptitudes', 'expertises', 'domaines de competences', 'logiciels', 'competences professionnelles', 'atouts', 'qualites'],
  langues: ['langues', 'languages', 'langue'],
  loisirs: ['loisirs', 'centres d interet', 'centres d interets', 'interets', 'hobbies', 'interests', 'activites', 'passions', 'vie associative'],
  resume: ['profil', 'resume', 'a propos', 'about', 'about me', 'objectif', 'summary', 'profile', 'presentation', 'objectif professionnel', 'mon profil', 'profil professionnel', 'qui suis je'],
  certifs: ['certifications', 'certificats', 'habilitations', 'formations complementaires', 'certification', 'distinctions', 'permis et habilitations', 'diplomes et certifications'],
  contact: ['contact', 'coordonnees', 'informations', 'informations personnelles', 'infos', 'me contacter', 'details', 'etat civil', 'infos perso'],
};
const HEADMAP = {};
Object.entries(HEADS).forEach(([k, arr]) => arr.forEach(a => { HEADMAP[a] = k; }));

export function headingOf(line) {
  const n = norm(line);
  if (!n || n.length > 36) return null;
  return HEADMAP[n] || null;
}

// ---------- lignes à partir des items pdf.js ----------
// item: {str, x, y, w, size}
function buildLines(items) {
  const its = items.filter(i => i.str && i.str.trim() !== '' || i.str === ' ').filter(i => i.str.trim() !== '');
  its.sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const lines = [];
  for (const it of its) {
    const last = lines[lines.length - 1];
    const tol = Math.max(2, Math.min(it.size, last ? last.size : it.size) * 0.45);
    if (last && Math.abs(last.y - it.y) <= tol) last.items.push(it);
    else lines.push({ y: it.y, size: it.size, items: [it] });
  }
  return lines.map(l => {
    l.items.sort((a, b) => a.x - b.x);
    let text = '', prev = null, size = 0, x = Infinity;
    for (const it of l.items) {
      if (prev) {
        const gap = it.x - (prev.x + prev.w);
        const sz = Math.max(it.size, 1);
        if (gap > sz * 2.5) text += '\t';
        else if (!/\s$/.test(text) && !/^\s/.test(it.str) && gap > sz * 0.18) text += ' ';
      }
      text += it.str;
      prev = it; size = Math.max(size, it.size); x = Math.min(x, it.x);
    }
    return { text: text.replace(/[ ]{2,}/g, ' ').trim(), size, x, y: l.y };
  }).filter(l => l.text);
}

// Détection d'une gouttière verticale (CV à 2 colonnes).
function detectGutter(items, pageW) {
  if (items.length < 14) return null;
  const B = 4, n = Math.ceil(pageW / B) + 1;
  const cov = new Array(n).fill(0);
  for (const it of items) {
    const a = Math.max(0, Math.floor(it.x / B)), b = Math.min(n - 1, Math.floor((it.x + it.w) / B));
    for (let i = a; i <= b; i++) cov[i]++;
  }
  const lo = Math.floor(n * 0.18), hi = Math.floor(n * 0.82);
  const lim = Math.max(1, Math.floor(items.length * 0.04));
  let best = null, i = lo;
  while (i <= hi) {
    if (cov[i] <= lim) {
      let j = i; while (j <= hi && cov[j] <= lim) j++;
      const w = j - i;
      if (w >= 3 && (!best || w > best.w)) best = { a: i, w };
      i = j;
    } else i++;
  }
  if (!best) return null;
  const gx = (best.a + best.w / 2) * B;
  const left = items.filter(it => it.x + it.w / 2 < gx).length;
  const right = items.length - left;
  if (left < items.length * 0.15 || right < items.length * 0.15) return null;
  return gx;
}

export function pagesToLines(pages) {
  // pages: [{width, items:[...]}] -> liste de colonnes [{lines, page}]
  const cols = [];
  pages.forEach((pg, pi) => {
    const gx = detectGutter(pg.items, pg.width);
    if (gx == null) { cols.push({ page: pi, lines: buildLines(pg.items) }); return; }
    const span = [], L = [], R = [];
    for (const it of pg.items) {
      if (it.x < gx && it.x + it.w > gx + 6) span.push(it);
      else if (it.x + it.w / 2 < gx) L.push(it);
      else R.push(it);
    }
    if (span.length) cols.push({ page: pi, lines: buildLines(span) });
    cols.push({ page: pi, lines: buildLines(L) });
    cols.push({ page: pi, lines: buildLines(R) });
  });
  return cols;
}

// ---------- dates ----------
const MOIS = 'janvier|janv|jan|février|fevrier|févr|fevr|fév|fev|feb|mars|mar|avril|avr|apr|mai|may|juin|jun|juillet|juil|jul|août|aout|aoû|aug|septembre|sept|sep|octobre|oct|novembre|nov|décembre|decembre|déc|dec';
const Y = '(?:19|20)\\d{2}';
const D = `(?:(?:0?[1-9]|1[0-2])\\s*[\\/.\\-]\\s*${Y}|(?:${MOIS})\\.?\\s+${Y}|${Y})`;
const PRES = "pr[ée]sent|aujourd['’]hui|actuel(?:lement)?|en cours|ce jour|current|now|today|maintenant";
const RANGE = new RegExp(`(${D})\\s*(?:[-–—→>]|à|au|to|jusqu['’]à|jusqu['’]au)\\s*(${D}|${PRES})`, 'i');
const SINCE = new RegExp(`(?:depuis|since|from)\\s+(${D})`, 'i');
const SINGLE = new RegExp(`\\b(${D})\\b`, 'i');
const isPres = s => new RegExp(`^(?:${PRES})$`, 'i').test(String(s).trim());

function cleanSep(s) { return s.replace(/^[\s\-–—|:,•·()\[\]]+|[\s\-–—|:,•·()\[\]]+$/g, '').replace(/\(\s*\)/g, '').trim(); }

export function parseDate(line, allowSingle) {
  let m = line.match(RANGE);
  if (m) {
    const rest = cleanSep(line.replace(m[0], ' ').replace(/\t/g, ' '));
    const pres = isPres(m[2]);
    return { start: m[1].trim(), end: pres ? '' : m[2].trim(), actuel: pres, rest };
  }
  m = line.match(SINCE);
  if (m) return { start: m[1].trim(), end: '', actuel: true, rest: cleanSep(line.replace(m[0], ' ')) };
  if (allowSingle) {
    m = line.match(SINGLE);
    if (m) {
      const rest = cleanSep(line.replace(m[0], ' ').replace(/\t/g, ' '));
      // une année isolée au milieu d'une phrase n'est pas une date d'entrée
      if (rest.length > 70) return null;
      return { start: '', end: m[1].trim(), actuel: false, rest, single: true };
    }
  }
  return null;
}

// ---------- puces et descriptions ----------
const BUL = /^(?:[•·▪●○◦■□✓✔►▶➢➤→*•●-]\s*|[-–—]\s+)/;
const isBullet = l => BUL.test(l);

function mergeDesc(lines) {
  const out = [];
  for (const raw of lines) {
    const l = raw.replace(/\t/g, ' ').trim();
    if (!l) continue;
    if (isBullet(l)) { out.push('- ' + l.replace(BUL, '').trim()); continue; }
    const last = out[out.length - 1];
    if (last && !/[.!?:;]$/.test(last) && /^[a-zà-ÿ0-9(]/.test(l)) out[out.length - 1] = last + ' ' + l;
    else out.push(l);
  }
  return out.join('\n');
}

const headerish = l => l && l.length <= 90 && !isBullet(l) && !/[.!?]$/.test(l.trim());

const COMPANY_HINT = /\b(sas|sarl|sa|inc|ltd|gmbh|group|groupe|corp|societe|société|entreprise|cabinet|agence|mairie|ministère|ministere|armée|armee|université|universite)\b/i;

function splitHeader(lines) {
  const parts = [];
  lines.forEach(l => String(l).split(/\t| \| | [–—-] | @ |\s+chez\s+/i).forEach(p => { p = cleanSep(p); if (p) parts.push(p); }));
  let [a = '', b = '', c = ''] = parts;
  if (a && b && COMPANY_HINT.test(a) && !COMPANY_HINT.test(b)) [a, b] = [b, a];
  if (b && !c) { const m = b.match(/^(.+?),\s*([^,\d]{2,24})$/); if (m) { b = m[1].trim(); c = m[2].trim(); } }
  return { a, b, c, rest: parts.slice(3).join(' · ') };
}

// Découpe une section en entrées (une par ligne de date).
function splitEntries(lines, allowSingle) {
  const info = lines.map(l => parseDate(l, allowSingle));
  const idx = []; info.forEach((d, i) => { if (d) idx.push(i); });
  if (!idx.length) return { entries: [], leftover: lines.slice() };

  // nombre de lignes d'en-tête avant la première date (mode "titre puis date")
  let H = 0;
  { let k = idx[0] - 1; while (k >= 0 && H < 2 && headerish(lines[k]) && !info[k]) { H++; k--; } }
  const before = H > 0 && !(info[idx[0]].rest && info[idx[0]].rest.length >= 3 && idx[0] === 0);
  const entries = []; let leftover = [];

  idx.forEach((di, n) => {
    const d = info[di];
    const nextDi = idx[n + 1] ?? lines.length;
    let head = [], from, to;
    if (before) {
      // titre(s) juste avant la date
      let hs = 0, k = di - 1;
      const floor = n === 0 ? -1 : idx[n - 1];
      while (k > floor && hs < H && headerish(lines[k]) && !info[k]) { hs++; k--; }
      head = lines.slice(di - hs, di);
      if (d.rest) head.push(d.rest);
      from = di + 1;
      // les lignes d'en-tête de l'entrée suivante sont retirées de la description
      let hn = 0, kk = nextDi - 1;
      if (n + 1 < idx.length) { while (kk > di && hn < H && headerish(lines[kk]) && !info[kk]) { hn++; kk--; } }
      to = nextDi - hn;
      if (n === 0 && di - hs > 0) leftover = leftover.concat(lines.slice(0, di - hs));
    } else {
      if (d.rest) head.push(d.rest);
      from = di + 1;
      const maxHead = d.rest ? 1 : 2;
      let hs = 0;
      while (hs < maxHead && from < nextDi && headerish(lines[from]) && !info[from]) { head.push(lines[from]); from++; hs++; }
      to = nextDi;
      if (n === 0 && di > 0) leftover = leftover.concat(lines.slice(0, di));
    }
    entries.push({ d, head, desc: lines.slice(from, to) });
  });
  return { entries, leftover };
}

// ---------- niveaux / langues ----------
const LANGS = ['francais', 'anglais', 'espagnol', 'allemand', 'italien', 'portugais', 'arabe', 'chinois', 'mandarin', 'japonais', 'russe', 'neerlandais', 'turc', 'polonais', 'coreen', 'hindi', 'creole', 'kabyle', 'berbere', 'grec', 'roumain', 'suedois', 'norvegien', 'danois', 'finnois', 'hebreu', 'persan', 'vietnamien', 'langue des signes', 'lsf',
  'french', 'english', 'spanish', 'german', 'italian', 'portuguese', 'arabic', 'chinese', 'japanese', 'russian', 'dutch', 'turkish', 'polish', 'korean'];
const LEVEL_WORDS = /^(?:langue maternelle|maternelle|natif|native|bilingue|courant|courante|fluent|professionnel(?:le)?|interm[ée]diaire|intermediate|scolaire|notions?|d[ée]butant|debutant|beginner|avanc[ée]e?|advanced|bon niveau|niveau (?:bon|moyen|avance)|[abc][12](?:\s*[-–]\s*[abc][12])?|toeic.*|toefl.*|ielts.*|lu,? [ée]crit,? parl[ée])$/i;

function levelOf(word) {
  const w = norm(word);
  if (/expert|natif|native|maternelle|bilingue|c2|c1/.test(w)) return 5;
  if (/avance|confirme|courant|fluent|advanced|b2|professionnel/.test(w)) return 4;
  if (/intermediaire|moyen|b1|bon/.test(w)) return 3;
  if (/scolaire|a2|debutant|beginner|notion/.test(w)) return 2;
  if (/a1/.test(w)) return 1;
  return 0;
}

function tokens(lines) {
  const out = [];
  for (let l of lines) {
    l = l.replace(/\t/g, ' , ');
    const c = l.match(/^([^:]{2,28}):\s*(.+)$/);
    if (c && /[,;|•·]/.test(c[2])) l = c[2];
    l.split(/\s*[,;•·▪●|-]\s*|\s+[-–—]\s+/).forEach(t => {
      t = t.replace(BUL, '').trim();
      if (t && t.length <= 48) out.push(t);
    });
  }
  const seen = new Set();
  return out.filter(t => { const k = norm(t); if (!k || seen.has(k)) return false; seen.add(k); return true; });
}

function parseLangues(lines) {
  const toks = [];
  lines.forEach(l => l.replace(/\t/g, ' , ').split(/\s*[,;•·▪●|\uE000-\uF8FF]\s*/).forEach(t => { t = t.replace(BUL, '').trim(); if (t) toks.push(t); }));
  const res = [];
  for (const t of toks) {
    if (LEVEL_WORDS.test(t) && res.length && !res[res.length - 1].niveau) { res[res.length - 1].niveau = t; continue; }
    const m = t.match(/^([A-Za-zÀ-ÿ'’]+(?: des signes)?)\s*(?:[:\-–—(]\s*)?(.*)$/);
    if (!m) continue;
    const name = m[1].trim();
    const known = LANGS.includes(norm(name));
    if (!known && !/^[A-ZÀ-Ý]/.test(name)) continue;
    res.push({ nom: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), niveau: cleanSep(m[2]) });
  }
  return res.filter(l => l.nom.length > 2);
}

// ---------- identité ----------
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE = /(?:\+33\s?\(?0?\)?\s?|0033\s?|\b0)[1-9](?:[\s.\-]?\d{2}){4}/;
const PHONE2 = /\+?\d[\d\s.\-()]{8,16}\d/;
const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[\w\-\/%]+/i;
const URLX = /(?:https?:\/\/|www\.)[^\s]+/i;
const POSTAL = /\b(\d{5})\s+([A-ZÀ-Ý][\p{L}'’ \-]{1,30})/u;

function extractIdentity(headLines, contactLines, allFirstPage) {
  const id = { nom: '', titre: '', email: '', tel: '', ville: '', adresse: '', site: '', linkedin: '', permis: '', naissance: '', photo: '' };
  const left = [];
  const pool = headLines.concat(contactLines);
  for (const l of pool) {
    let t = l.text.replace(/\t/g, '  ');
    let used = false;
    let m;
    if (!id.email && (m = t.match(EMAIL))) { id.email = m[0]; t = t.replace(m[0], ' '); used = true; }
    if (!id.linkedin && (m = t.match(LINKEDIN))) { id.linkedin = m[0].replace(/^https?:\/\//, ''); t = t.replace(m[0], ' '); used = true; }
    if (!id.site && (m = t.match(URLX))) { id.site = m[0]; t = t.replace(m[0], ' '); used = true; }
    if (!id.tel && ((m = t.match(PHONE)) || (m = t.match(PHONE2)))) { id.tel = m[0].trim(); t = t.replace(m[0], ' '); used = true; }
    if (!id.permis && (m = t.match(/permis\s*[:\-]?\s*([ABCDE]\b[\w+ ]{0,6})?/i))) { id.permis = ('Permis ' + (m[1] || 'B')).trim(); used = true; t = t.replace(m[0], ' '); }
    if (!id.naissance && (m = t.match(/(\d{1,2}\s*[\/.]\s*\d{1,2}\s*[\/.]\s*(?:19|20)\d{2}|\d{2}\s*ans)/))) { id.naissance = m[0]; used = true; t = t.replace(m[0], ' '); }
    if (!id.ville && (m = t.match(POSTAL))) {
      id.ville = m[2].trim(); id.adresse = cleanSep(t.slice(0, m.index) + ' ' + m[1] + ' ' + m[2]); used = true; t = '';
    }
    t = cleanSep(t.replace(/^(?:t[ée]l|tel|mobile|e-?mail|mail|adresse|phone|linkedin|site)\s*[.:]?\s*/i, ''));
    if (!used || t.length > 3) left.push({ ...l, text: t || l.text, used });
  }
  // nom et titre : plus grosse police de la page 1, hors coordonnées
  const cand = allFirstPage.filter(l => l.text.length >= 3 && l.text.length <= 44 && !EMAIL.test(l.text) && !PHONE.test(l.text) && !URLX.test(l.text) && !/\d{3,}/.test(l.text) && !headingOf(l.text));
  cand.sort((a, b) => (b.size - a.size) || (b.y - a.y));
  const nameLine = cand[0];
  if (nameLine) {
    id.nom = nameLine.text.replace(/\t/g, ' ');
    // titre : ligne la plus proche sous le nom, taille inférieure, texte non contact
    const below = allFirstPage.filter(l => l.y < nameLine.y && nameLine.y - l.y < nameLine.size * 5 && l !== nameLine && l.text.length <= 80 && l.text.length >= 4 && !EMAIL.test(l.text) && !PHONE.test(l.text) && !URLX.test(l.text) && !POSTAL.test(l.text) && !headingOf(l.text) && !/\d{4}/.test(l.text));
    below.sort((a, b) => b.y - a.y);
    if (below[0]) id.titre = below[0].text.replace(/\t/g, ' ');
  }
  return { id, left, nameLine };
}

// ---------- parseur principal ----------
export function parseCV(pages) {
  const cols = pagesToLines(pages);
  const total = cols.reduce((n, c) => n + c.lines.length, 0);
  if (total < 3) return { ok: false, reason: 'no-text', data: null, stats: {}, raw: {} };

  // sections
  const sec = { header: [], contact: [], resume: [], experiences: [], formations: [], competences: [], langues: [], loisirs: [], certifs: [] };
  const first = cols.filter(c => c.page === 0).flatMap(c => c.lines);
  for (const col of cols) {
    let cur = 'header';
    for (const l of col.lines) {
      const h = headingOf(l.text);
      if (h) { cur = h; continue; }
      (sec[cur] || sec.header).push(l);
    }
  }
  const { id, left, nameLine } = extractIdentity(sec.header, sec.contact, first);
  const extra = [];

  // résumé : section dédiée, sinon phrases longues de l'en-tête
  let resumeLines = sec.resume.map(l => l.text);
  const headLeft = left.filter(l => l.text !== id.nom && l.text !== id.titre && l !== nameLine);
  if (!resumeLines.length) {
    const longs = headLeft.filter(l => l.text.length > 70).map(l => l.text);
    if (longs.length) resumeLines = longs;
  }
  headLeft.forEach(l => { if (l.text.length > 2 && !resumeLines.includes(l.text) && !l.used) extra.push(l.text); });
  const resume = resumeLines.map(s => s.replace(/\t/g, ' ')).join(' ').replace(/\s+/g, ' ').trim();

  // expériences
  const ex = splitEntries(sec.experiences.map(l => l.text), false);
  const experiences = ex.entries.map(e => {
    const h = splitHeader(e.head);
    return {
      poste: h.a, entreprise: h.b, lieu: h.c, debut: e.d.start || e.d.end || '', fin: e.d.start ? e.d.end : '', actuel: !!e.d.actuel,
      desc: mergeDesc(h.rest ? [h.rest, ...e.desc] : e.desc),
    };
  });
  if (ex.leftover.length) ex.leftover.forEach(l => extra.push(l));
  if (!ex.entries.length && sec.experiences.length) {
    const t = mergeDesc(sec.experiences.map(l => l.text));
    experiences.push({ poste: 'Expérience (à compléter)', entreprise: '', lieu: '', debut: '', fin: '', actuel: false, desc: t });
  }

  // formations
  const fo = splitEntries(sec.formations.map(l => l.text), true);
  const formations = fo.entries.map(e => {
    const h = splitHeader(e.head);
    return { diplome: h.a, ecole: h.b || h.c, debut: e.d.single ? '' : (e.d.start || ''), fin: e.d.single ? e.d.end : (e.d.end || (e.d.actuel ? '' : '')), desc: mergeDesc(e.desc) };
  });
  if (fo.leftover.length) fo.leftover.forEach(l => extra.push(l));
  if (!fo.entries.length && sec.formations.length) {
    sec.formations.forEach(l => formations.push({ diplome: l.text.replace(/\t/g, ' '), ecole: '', debut: '', fin: '', desc: '' }));
  }

  // compétences / langues / loisirs / certifs
  const competences = tokens(sec.competences.map(l => l.text)).map(t => {
    const m = t.match(/^(.*?)\s*[:(\-–]\s*([A-Za-zÀ-ÿ0-9 ]{3,20})\)?$/);
    if (m && levelOf(m[2])) return { nom: m[1].trim(), niveau: levelOf(m[2]) };
    return { nom: t, niveau: 0 };
  }).filter(c => c.nom && c.nom.length > 1);
  const langues = parseLangues(sec.langues.map(l => l.text));
  const loisirs = tokens(sec.loisirs.map(l => l.text)).join(', ');
  const certifs = sec.certifs.map(l => l.text.replace(/\t/g, ' ')).filter(t => t.length > 2).map(t => {
    const y = t.match(/\b(?:19|20)\d{2}\b/);
    return { nom: cleanSep(t.replace(y ? y[0] : '', '')), annee: y ? y[0] : '' };
  });

  // contact restant (adresse etc.) : à garder dans "extra" si utile
  const data = {
    identity: id, resume, experiences, formations, competences, langues, loisirs, certifs,
    extra: [...new Set(extra.map(s => String(s).replace(/\t/g, ' ').trim()).filter(s => s.length > 2))].join('\n'),
  };
  const stats = {
    nom: !!id.nom, titre: !!id.titre, email: !!id.email, tel: !!id.tel, ville: !!id.ville,
    resume: !!resume, experiences: experiences.length, formations: formations.length, competences: competences.length, langues: langues.length,
  };
  const raw = Object.fromEntries(Object.entries(sec).map(([k, v]) => [k, v.map(l => l.text)]));
  return { ok: true, data, stats, raw, columns: cols.length };
}

// Adaptateur pdf.js -> items {str,x,y,w,size}
export function adaptItems(textContent) {
  return textContent.items.filter(i => typeof i.str === 'string').map(i => ({
    str: i.str, x: i.transform[4], y: i.transform[5], w: i.width || 0,
    size: Math.hypot(i.transform[2], i.transform[3]) || i.height || 10,
  }));
}
