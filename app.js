// CV en poche — appli locale (aucune donnée ne quitte le téléphone).
import { parseCV, adaptItems, norm } from './parser.js';

/* ============ utilitaires ============ */
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const PX_PER_MM = 96 / 25.4, PAGE_W = 210 * PX_PER_MM;

function setPath(o, path, v) {
  const k = path.split('.'); let c = o;
  for (let i = 0; i < k.length - 1; i++) { if (c[k[i]] == null || typeof c[k[i]] !== 'object') c[k[i]] = {}; c = c[k[i]]; }
  c[k[k.length - 1]] = v;
}

const TPLS = [['classique', 'Classique'], ['moderne', 'Moderne'], ['bandeau', 'Bandeau'], ['chrono', 'Chronologie'], ['elegant', 'Élégant']];
const ACCENTS = ['#1F5BD8', '#0E6B5C', '#7A3FB5', '#C2410C', '#B3372B', '#222B45', '#0F7C9D', '#8A6A12'];
const SECS = { resume: 'Profil', domaines: 'Domaines de compétences', experiences: 'Expériences professionnelles', formations: 'Formation', competences: 'Compétences', langues: 'Langues', certifs: 'Certifications', loisirs: 'Centres d’intérêt' };
const SIDE = ['competences', 'langues', 'loisirs'];
const STATUTS = [['aenvoyer', 'À envoyer'], ['envoyee', 'Envoyée'], ['entretien', 'Entretien'], ['offre', 'Offre reçue'], ['refus', 'Refus']];
const NIV = ['—', 'Notions', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'];

/* ============ version et historique des mises à jour ============ */
const APP_VERSION = '1.3.0';
const CHANGELOG = [
  { v: '1.3.0', d: '01/11/2026', l: ['Onglets verticaux sur le bord droit (comme Comptes en ligne) partout : Réglages, éditeur, Suivi, Guide', 'Mode « Sur le côté » activé par défaut'] },
  { v: '1.2.0', d: '01/11/2026', l: ['Version de l’appli et liste des mises à jour dans Réglages', 'Bouton « Vérifier les mises à jour »'] },
  { v: '1.1.0', d: '01/11/2026', l: ['Import PDF amélioré : nom sur plusieurs lignes, titre dans la colonne de droite, ville après le code postal, puces détectées par l’indentation, formations en liste, « Informations complémentaires » classées', 'Nouvelle rubrique « Domaines de compétences » (sous-titres et puces)', 'Mise à jour automatique : l’appli prend toujours la dernière version quand le réseau est là, et reste utilisable hors connexion'] },
  { v: '1.0.1', d: '01/11/2026', l: ['Correctif : import de PDF qui ne démarrait pas (fichiers de lecture mal placés)'] },
  { v: '1.0.0', d: '01/11/2026', l: ['Première version : Mes CV, éditeur, 5 modèles, export PDF', 'Import d’un PDF avec lecture automatique des rubriques', 'Offre : analyse d’annonce et version adaptée', 'Suivi des candidatures, Guide du CV, Réglages en onglets'] },
];
async function checkUpdate() {
  try {
    const t = await fetch('app.js', { cache: 'no-store' }).then(r => r.text());
    const m = t.match(/const APP_VERSION = '([\d.]+)'/);
    if (!m) throw new Error('version');
    if (m[1] !== APP_VERSION) {
      toast(`Mise à jour ${m[1]} trouvée : rechargement…`);
      try { for (const k of await caches.keys()) await caches.delete(k); } catch { }
      setTimeout(() => location.reload(), 900);
    } else toast(`Tu as la dernière version (${APP_VERSION})`);
  } catch { toast('Vérification impossible : es-tu hors connexion ?'); }
}

/* ============ état ============ */
const KEY = 'cvpoche.v1';
const defaults = () => ({ cvs: [], jobs: [], checks: {}, set: { theme: 'auto', accent: '#1F5BD8', size: 'normal', filt: 'side', tpl: 'classique', cvAccent: '#1F5BD8', font: 'sans' } });
let S = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.cvs) { const d = defaults(); return { ...d, ...s, set: { ...d.set, ...(s.set || {}) } }; } } catch { } return defaults(); })();
if (!S.set.sideV13) { S.set.sideV13 = 1; S.set.filt = 'side'; }
S.cvs.forEach(cv => { if (!cv.order.includes('domaines')) cv.order.splice(Math.max(0, cv.order.indexOf('resume')) + 1, 0, 'domaines'); if (cv.data.domaines == null) cv.data.domaines = ''; });
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 300); }
function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Stockage plein : exporte tes données (Réglages)'); } }
addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

const ui = { tab: 'cv', ed: null, edTab: 'infos', open: {}, jobFilter: 'all', gcat: 'essentiel', stab: 'app', offre: { text: '', cvId: '', entreprise: '', poste: '', res: null, mask: true, settitle: false }, prevZoom: 1, jd: null, imp: null, sheet: null };
const curCV = () => S.cvs.find(c => c.id === ui.ed);
const touch = cv => { cv.updated = Date.now(); save(); };

function newCV(name, data) {
  return {
    id: uid(), name: name || 'Mon CV', created: Date.now(), updated: Date.now(),
    tpl: S.set.tpl, accent: S.set.cvAccent, font: S.set.font, scale: 1, photo: true,
    order: ['resume', 'domaines', 'experiences', 'formations', 'competences', 'langues', 'certifs', 'loisirs'], show: {},
    data: data || { identity: { nom: '', titre: '', email: '', tel: '', ville: '', adresse: '', site: '', linkedin: '', permis: '', naissance: '', photo: '' }, resume: '', domaines: '', experiences: [], formations: [], competences: [], langues: [], certifs: [], loisirs: '', extra: '' },
  };
}
const blank = {
  exp: () => ({ id: uid(), on: true, poste: '', entreprise: '', lieu: '', debut: '', fin: '', actuel: false, desc: '' }),
  form: () => ({ id: uid(), on: true, diplome: '', ecole: '', debut: '', fin: '', desc: '' }),
};
const LISTS = {
  experiences: blank.exp, formations: blank.form,
  competences: () => ({ id: uid(), on: true, nom: '', niveau: 0 }),
  langues: () => ({ id: uid(), on: true, nom: '', niveau: '' }),
  certifs: () => ({ id: uid(), on: true, nom: '', annee: '' }),
};
function sampleData() {
  const d = newCV().data;
  d.identity = { nom: 'Camille Dupont', titre: 'Chargée de communication digitale', email: 'camille.dupont@mail.fr', tel: '06 12 34 56 78', ville: 'Lyon', adresse: '', site: '', linkedin: 'linkedin.com/in/camilledupont', permis: 'Permis B', naissance: '', photo: '' };
  d.resume = 'Chargée de communication avec 5 ans d’expérience en agence et en entreprise. J’ai augmenté de 40 % l’audience de réseaux sociaux de marques régionales et je cherche un poste de responsable communication.';
  d.experiences = [
    { id: uid(), on: true, poste: 'Chargée de communication', entreprise: 'Agence Lumen', lieu: 'Lyon', debut: '09/2021', fin: '', actuel: true, desc: '- Gestion de 8 comptes clients et de leurs calendriers éditoriaux\n- Hausse de 40 % de l’audience Instagram en 12 mois\n- Pilotage de 3 campagnes d’emailing (taux d’ouverture de 38 %)' },
    { id: uid(), on: true, poste: 'Assistante communication', entreprise: 'Mairie de Villeurbanne', lieu: 'Villeurbanne', debut: '2019', fin: '2021', actuel: false, desc: '- Rédaction du magazine municipal (4 numéros par an)\n- Animation des réseaux sociaux de la ville' },
  ];
  d.formations = [{ id: uid(), on: true, diplome: 'Master Communication et médias numériques', ecole: 'Université Lyon 2', debut: '2017', fin: '2019', desc: '' }];
  d.competences = ['Stratégie éditoriale', 'Réseaux sociaux', 'Emailing', 'Canva', 'Suite Adobe', 'Google Analytics', 'Rédaction web'].map(n => ({ id: uid(), on: true, nom: n, niveau: 0 }));
  d.langues = [{ id: uid(), on: true, nom: 'Anglais', niveau: 'Courant (C1)' }, { id: uid(), on: true, nom: 'Espagnol', niveau: 'Intermédiaire' }];
  d.loisirs = 'Photographie, randonnée, théâtre d’improvisation';
  return d;
}

/* ============ rendu CV (A4, paginé) ============ */
const dateRange = (a, b, now) => [a, now ? 'Aujourd’hui' : b].filter(Boolean).join(' – ');
function listHtml(desc) {
  const lines = String(desc || '').split('\n').map(s => s.trim()).filter(Boolean);
  let out = '', ul = [];
  const flush = () => { if (ul.length) { out += '<ul>' + ul.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>'; ul = []; } };
  for (const l of lines) { if (/^[-•·*]\s+/.test(l)) ul.push(l.replace(/^[-•·*]\s+/, '')); else { flush(); out += `<p>${esc(l)}</p>`; } }
  flush(); return out;
}
const act = a => a.filter(x => x.on !== false);
function levelDots(n) { if (!n) return ''; return `<span class="lv">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'f' : ''}"></i>`).join('')}</span>`; }

function secItems(cv, k) {
  const d = cv.data, chrono = cv.tpl === 'chrono';
  if (k === 'experiences') return act(d.experiences).map(e => {
    const dt = dateRange(e.debut, e.fin, e.actuel), sub = [e.entreprise, e.lieu].filter(Boolean).join(', ');
    if (chrono) return `<div class="it tl"><div class="dt">${esc(dt)}</div><div class="bd"><b>${esc(e.poste)}</b><div class="l2">${esc(sub)}</div>${listHtml(e.desc)}</div></div>`;
    return `<div class="it"><div class="l1"><b>${esc(e.poste)}</b><span class="dt">${esc(dt)}</span></div><div class="l2">${esc(sub)}</div>${listHtml(e.desc)}</div>`;
  });
  if (k === 'formations') return act(d.formations).map(f => {
    const dt = [f.debut, f.fin].filter(Boolean).join(' – ');
    if (chrono) return `<div class="it tl"><div class="dt">${esc(dt)}</div><div class="bd"><b>${esc(f.diplome)}</b><div class="l2">${esc(f.ecole)}</div>${listHtml(f.desc)}</div></div>`;
    return `<div class="it"><div class="l1"><b>${esc(f.diplome)}</b><span class="dt">${esc(dt)}</span></div><div class="l2">${esc(f.ecole)}</div>${listHtml(f.desc)}</div>`;
  });
  return [];
}
function domGroups(cv) {
  const L = String(cv.data.domaines || '').split('\n').map(s => s.trim()).filter(Boolean), groups = [];
  let cur = null;
  const esc2 = esc;
  for (const l of L) {
    if (l.startsWith('## ')) { cur = { t: l.slice(3), li: [] }; groups.push(cur); }
    else { if (!cur) { cur = { t: '', li: [] }; groups.push(cur); } cur.li.push(l.replace(/^[-•·*]\s*/, '')); }
  }
  return groups.map(g => `<div class="it">${g.t ? `<b>${esc2(g.t)}</b>` : ''}${g.li.length ? '<ul>' + g.li.map(x => `<li>${esc2(x)}</li>`).join('') + '</ul>' : ''}</div>`);
}
function secSimple(cv, k) {
  const d = cv.data;
  if (k === 'resume') return d.resume.trim() ? `<p>${esc(d.resume).replace(/\n/g, '<br>')}</p>` : '';
  if (k === 'competences') { const l = act(d.competences).filter(c => c.nom.trim()); return l.length ? `<div class="tags">${l.map(c => `<span>${esc(c.nom)}${levelDots(c.niveau)}</span>`).join('')}</div>` : ''; }
  if (k === 'langues') { const l = act(d.langues).filter(c => c.nom.trim()); return l.length ? l.map(c => `<div class="it"><b>${esc(c.nom)}</b>${c.niveau ? ` <span class="dt">· ${esc(c.niveau)}</span>` : ''}</div>`).join('') : ''; }
  if (k === 'certifs') { const l = act(d.certifs).filter(c => c.nom.trim()); return l.length ? l.map(c => `<div class="it"><b>${esc(c.nom)}</b>${c.annee ? ` <span class="dt">· ${esc(c.annee)}</span>` : ''}</div>`).join('') : ''; }
  if (k === 'loisirs') return d.loisirs.trim() ? `<p>${esc(d.loisirs)}</p>` : '';
  return '';
}
function contacts(cv) {
  const i = cv.data.identity;
  return [i.tel, i.email, i.adresse || i.ville, i.site, i.linkedin, i.permis, i.naissance].filter(x => x && x.trim());
}
const photoHtml = cv => (cv.photo !== false && cv.data.identity.photo) ? `<div class="ph" style="background-image:url('${cv.data.identity.photo}')"></div>` : '';

function buildParts(cv) {
  const i = cv.data.identity, side = cv.tpl === 'moderne';
  const ct = contacts(cv);
  const nameBlock = `<h1 class="nm">${esc(i.nom || 'Prénom Nom')}</h1>${i.titre ? `<div class="ti">${esc(i.titre)}</div>` : ''}`;
  let head;
  const ctRow = `<div class="ct">${ct.map(c => `<span>${esc(c)}</span>`).join('')}</div>`;
  if (side) head = `<div class="blk">${nameBlock}</div>`;
  else if (cv.tpl === 'bandeau') head = `<div class="blk"><div class="band">${photoHtml(cv)}<div>${nameBlock}${ctRow}</div></div></div>`;
  else if (cv.tpl === 'elegant') head = `<div class="blk"><div class="hd">${photoHtml(cv)}${nameBlock}${ctRow}</div></div>`;
  else head = `<div class="blk"><div class="hd">${photoHtml(cv)}<div>${nameBlock}${ctRow}</div></div></div>`;

  const blocks = [head];
  const sideHtml = [];
  for (const k of cv.order) {
    if (cv.show[k] === false) continue;
    const title = `<div class="st">${esc(SECS[k])}</div>`;
    if (side && SIDE.includes(k)) { const s = secSimple(cv, k); if (s) sideHtml.push(`<div class="blk">${title}${s}</div>`); continue; }
    if (k === 'experiences' || k === 'formations' || k === 'domaines') {
      const its = k === 'domaines' ? domGroups(cv) : secItems(cv, k); if (!its.length) continue;
      blocks.push(`<div class="blk">${title}${its[0]}</div>`);
      for (let n = 1; n < its.length; n++) blocks.push(`<div class="blk">${its[n]}</div>`);
    } else { const s = secSimple(cv, k); if (s) blocks.push(`<div class="blk">${title}${s}</div>`); }
  }
  let sb = null;
  if (side) {
    const cts = `<div class="blk"><div class="st">Contact</div><div class="cts">${ct.map(c => `<div>${esc(c)}</div>`).join('')}</div></div>`;
    sb = photoHtml(cv) + (ct.length ? cts : '') + sideHtml.join('');
  }
  return { blocks, sb };
}

let measureEl;
const memo = new Map();
function renderPages(cv, nocache) {
  const key = cv.id + ':' + cv.updated + ':' + cv.tpl;
  if (!nocache && memo.has(key)) return memo.get(key);
  const { blocks, sb } = buildParts(cv);
  const cls = `pg t-${cv.tpl}${cv.font === 'serif' ? ' serif' : ''}`;
  const style = `--a:${cv.accent};--s:${cv.scale || 1}`;
  if (!measureEl) { measureEl = document.createElement('div'); measureEl.className = 'measure'; document.body.appendChild(measureEl); }
  measureEl.innerHTML = `<div class="${cls}" style="${style}">${sb != null ? '<aside class="sb"></aside>' : ''}<main class="mn"></main></div>`;
  const mn = measureEl.querySelector('main'), cs = getComputedStyle(mn);
  const cap = mn.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const hs = blocks.map(h => {
    mn.insertAdjacentHTML('beforeend', h);
    const el = mn.lastElementChild, st = getComputedStyle(el);
    return el.getBoundingClientRect().height + (parseFloat(st.marginTop) || 0) + (parseFloat(st.marginBottom) || 0);
  });
  let over = false;
  if (sb != null) {
    const as = measureEl.querySelector('aside'); as.innerHTML = sb;
    const acs = getComputedStyle(as); over = as.scrollHeight > as.clientHeight + 2 && (as.scrollHeight - parseFloat(acs.paddingTop) - parseFloat(acs.paddingBottom)) > cap + 2;
  }
  const groups = []; let cur = [], used = 0;
  blocks.forEach((b, n) => {
    const h = hs[n] || 0;
    if (cur.length && used + h > cap + 0.5) { groups.push(cur); cur = []; used = 0; }
    cur.push(b); used += h;
  });
  groups.push(cur);
  const pages = groups.map((g, n) => `<div class="${cls}" style="${style}">${sb != null ? `<aside class="sb">${n === 0 ? sb : ''}</aside>` : ''}<main class="mn">${g.join('')}</main></div>`);
  measureEl.innerHTML = '';
  const res = { pages, over };
  if (!nocache) { memo.set(key, res); if (memo.size > 40) memo.delete(memo.keys().next().value); }
  return res;
}
function thumb(cv, w, nocache) {
  const p = renderPages(cv, nocache).pages[0], k = w / PAGE_W;
  return `<div class="thumb" style="width:${w}px"><div class="tin" style="transform:scale(${k})">${p}</div></div>`;
}

/* ============ contrôle qualité ============ */
const yearOf = s => { const m = String(s || '').match(/(?:19|20)\d{2}/); return m ? +m[0] : null; };
function qualityChecks(cv) {
  const d = cv.data, i = d.identity, L = [];
  const add = (lvl, txt) => L.push({ lvl, txt });
  if (!i.nom.trim()) add('bad', 'Ajoute ton nom.'); else add('ok', 'Nom renseigné.');
  if (!i.titre.trim()) add('warn', 'Ajoute un titre (le poste visé) sous ton nom : il oriente la lecture.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.email.trim())) add('bad', 'Email manquant ou invalide.');
  else if (/\d{4,}|xx|cool|bg\b|love/i.test(i.email.split('@')[0])) add('warn', 'Adresse email peu sérieuse : préfère prenom.nom@…');
  if (!i.tel.trim()) add('warn', 'Ajoute un numéro de téléphone.');
  const r = d.resume.trim();
  if (!r) add('warn', 'Pas de profil : 2–3 lignes d’accroche aident à se démarquer.');
  else if (r.length > 600) add('warn', `Profil long (${r.length} caractères) : vise 300–450.`);
  else if (/^je\b/i.test(r)) add('warn', 'Évite de commencer le profil par « Je » : va droit au fait.');
  const ex = act(d.experiences);
  if (!ex.length) add('warn', 'Aucune expérience incluse : ajoute stages, jobs, projets ou bénévolat.');
  ex.forEach(e => {
    const n = e.poste || e.entreprise || 'Une expérience';
    if (!e.debut) add('warn', `« ${n} » : dates manquantes.`);
    if (!e.desc.trim()) add('warn', `« ${n} » : ajoute 2 à 4 puces sur tes réalisations.`);
    else if (e.desc.split('\n').filter(Boolean).length > 8) add('warn', `« ${n} » : trop de puces, garde les 5 plus utiles.`);
  });
  if (ex.length && !ex.some(e => /\d/.test(e.desc))) add('warn', 'Aucun chiffre dans tes expériences : ajoute des résultats (%, volumes, durées, taille d’équipe).');
  // ordre antichronologique + trous
  const ys = ex.map(e => yearOf(e.actuel ? '2099' : (e.fin || e.debut)));
  if (ys.length > 1 && ys.some((y, n) => n && y != null && ys[n - 1] != null && y > ys[n - 1])) add('warn', 'Expériences pas en ordre antichronologique (la plus récente en premier).');
  const sorted = ex.map(e => ({ s: yearOf(e.debut), f: e.actuel ? new Date().getFullYear() : yearOf(e.fin || e.debut) })).filter(x => x.s && x.f).sort((a, b) => b.f - a.f);
  for (let n = 0; n < sorted.length - 1; n++) if (sorted[n].s - sorted[n + 1].f >= 2) { add('warn', `Trou de ${sorted[n].s - sorted[n + 1].f} ans entre deux expériences : explique-le en une ligne si besoin.`); break; }
  if (!act(d.formations).length) add('warn', 'Aucune formation incluse.');
  const nc = act(d.competences).filter(c => c.nom.trim()).length + (String(d.domaines || '').trim() ? 6 : 0);
  if (nc < 4) add('warn', 'Peu de compétences : vise 6 à 12, choisies selon l’offre.');
  else if (nc > 15) add('warn', `${nc} compétences : trop pour être lues. Garde les 12 plus pertinentes.`);
  const txt = JSON.stringify(d).toLowerCase();
  const creux = ['dynamique', 'motivé', 'motivée', 'sérieux', 'sérieuse', 'rigoureux', 'passionné', 'passionnée'].filter(w => txt.includes(w));
  if (creux.length) add('warn', `Mots creux repérés (${creux.join(', ')}) : remplace-les par des faits.`);
  const { pages, over } = renderPages(cv);
  if (pages.length > 2) add('bad', `Le CV fait ${pages.length} pages : 1 à 2 pages maximum.`);
  else if (pages.length === 2 && ex.length < 4) add('warn', 'Le CV fait 2 pages : si tu as moins de 10 ans d’expérience, vise une page.');
  else add('ok', `Longueur correcte (${pages.length} page${pages.length > 1 ? 's' : ''}).`);
  if (over) add('warn', 'La colonne de gauche dépasse une page : retire des compétences ou loisirs.');
  const bad = L.filter(x => x.lvl === 'bad').length, warn = L.filter(x => x.lvl === 'warn').length;
  const score = Math.max(0, Math.min(100, 100 - bad * 18 - warn * 6));
  return { L: L.sort((a, b) => ({ bad: 0, warn: 1, ok: 2 }[a.lvl] - { bad: 0, warn: 1, ok: 2 }[b.lvl])), score };
}

/* ============ texte brut ============ */
function cvText(cv) {
  const d = cv.data, i = d.identity, o = [];
  o.push(i.nom, i.titre, contacts(cv).join(' | '), '');
  for (const k of cv.order) {
    if (cv.show[k] === false) continue;
    const sec = [];
    if (k === 'resume' && d.resume.trim()) sec.push(d.resume);
    if (k === 'domaines' && String(d.domaines || '').trim()) sec.push(d.domaines.replace(/^## /gm, '').replace(/^- /gm, '• '));
    if (k === 'experiences') act(d.experiences).forEach(e => sec.push(`${e.poste} — ${[e.entreprise, e.lieu].filter(Boolean).join(', ')} (${dateRange(e.debut, e.fin, e.actuel)})\n${e.desc}`));
    if (k === 'formations') act(d.formations).forEach(f => sec.push(`${f.diplome} — ${f.ecole} (${[f.debut, f.fin].filter(Boolean).join(' – ')})`));
    if (k === 'competences') { const l = act(d.competences).map(c => c.nom).filter(Boolean); if (l.length) sec.push(l.join(', ')); }
    if (k === 'langues') act(d.langues).forEach(l => sec.push(`${l.nom}${l.niveau ? ' : ' + l.niveau : ''}`));
    if (k === 'certifs') act(d.certifs).forEach(c => sec.push(`${c.nom}${c.annee ? ' (' + c.annee + ')' : ''}`));
    if (k === 'loisirs' && d.loisirs.trim()) sec.push(d.loisirs);
    if (sec.length) o.push(SECS[k].toUpperCase(), ...sec, '');
  }
  return o.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ============ analyse d'offre ============ */
const STOP = new Set(('le la les un une des de du dans en et ou pour par sur avec sans que qui quoi dont est sont etre avoir nous vous votre notre vos nos ses son sa leur leurs ce cet cette ces aux au ne pas plus mais comme ainsi afin vers chez entre sous lors tres tout tous toute toutes the and for with you your our are will have has from that this their they who not but all can any more other such into out about job work team years year experience poste profil mission missions entreprise recherche rejoindre rejoignez candidat candidature cdi cdd temps plein annee annees ans minimum souhaite souhaitez maitrise connaissance connaissances capacite capacites bon bonne niveau esprit sens equipe salaire contrat type lieu description responsabilites notre vos sera serez etes etre ete faire fait assurer participer permettre aussi egalement ainsi ensemble avoir besoin postes offre offres homme femme h f france paris').split(' '));
const stem = w => (w.length > 4 ? w.replace(/(s|x)$/, '') : w);
function kwTokens(text) {
  const out = [];
  norm(text).split(' ').forEach(w => { if (w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)) out.push(w); });
  return out;
}
function cvCorpus(cv) {
  const d = cv.data;
  const parts = [d.identity.titre, d.resume, d.loisirs, ...act(d.experiences).flatMap(e => [e.poste, e.entreprise, e.desc]), ...act(d.formations).flatMap(f => [f.diplome, f.ecole, f.desc]), ...act(d.competences).map(c => c.nom), ...act(d.langues).map(l => l.nom), ...act(d.certifs).map(c => c.nom)];
  return new Set(kwTokens(parts.join(' ')).map(stem));
}
function analyzeOffer(text, cv) {
  const freq = new Map(), show = new Map();
  kwTokens(text).forEach(w => { const s = stem(w); freq.set(s, (freq.get(s) || 0) + 1); if (!show.has(s)) show.set(s, w); });
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(b[0])).slice(0, 28);
  const set = cvCorpus(cv);
  let tot = 0, got = 0; const ok = [], miss = [];
  top.forEach(([s, f]) => { const w = Math.min(f, 4); tot += w; if (set.has(s)) { got += w; ok.push(show.get(s)); } else miss.push(show.get(s)); });
  return { score: tot ? Math.round(100 * got / tot) : 0, ok, miss, stems: top.map(t => t[0]) };
}
function hits(text, stems) { const set = new Set(kwTokens(text).map(stem)); return stems.reduce((n, s) => n + (set.has(s) ? 1 : 0), 0); }
function adaptCV(cv, res, o) {
  const c = clone(cv); c.id = uid(); c.created = c.updated = Date.now();
  c.name = `${cv.name} — ${o.entreprise || o.poste || 'adapté'}`;
  const st = res.stems;
  const stable = (arr, f) => arr.map((x, n) => [x, n]).sort((a, b) => (f(b[0]) - f(a[0])) || (a[1] - b[1])).map(x => x[0]);
  c.data.competences = stable(c.data.competences, x => hits(x.nom, st));
  if (o.mask && c.data.competences.length > 10) { let kept = 0; c.data.competences.forEach(x => { if (hits(x.nom, st) > 0) kept++; }); if (kept >= 5) c.data.competences.forEach(x => { if (hits(x.nom, st) === 0) x.on = false; }); }
  c.data.experiences.forEach(e => { const lines = e.desc.split('\n').filter(Boolean); if (lines.length > 1) e.desc = stable(lines, l => hits(l, st)).join('\n'); });
  if (o.settitle && o.poste) c.data.identity.titre = o.poste;
  return c;
}

/* ============ guide ============ */
const VERBES = ['Piloté', 'Dirigé', 'Coordonné', 'Conçu', 'Développé', 'Optimisé', 'Réduit', 'Augmenté', 'Négocié', 'Formé', 'Déployé', 'Structuré', 'Animé', 'Lancé', 'Analysé', 'Automatisé', 'Fidélisé', 'Rédigé', 'Organisé', 'Réalisé'];
const GUIDE = [
  { c: 'essentiel', t: 'La règle des 6 secondes', p: 'Un recruteur survole d’abord ton CV très vite. Il doit comprendre en un coup d’œil qui tu es et ce que tu apportes.', l: ['1 page si tu as moins de 10 ans d’expérience, 2 pages maximum', 'Ordre antichronologique : le plus récent en premier', 'Une idée par ligne, pas de pavés', 'Un CV adapté par type de poste visé'] },
  { c: 'essentiel', t: 'Structure idéale', l: ['En-tête : nom, titre, contacts', 'Profil : 2–3 lignes', 'Expériences professionnelles', 'Formation', 'Compétences et langues', 'Centres d’intérêt (court, optionnel)'] },
  { c: 'infos', t: 'L’en-tête', l: ['Nom en grand, puis le titre du poste visé', 'Téléphone, email sérieux (prenom.nom@…), ville', 'Lien LinkedIn à jour si tu en as un', 'Photo facultative en France : sobre, fond neutre, bien cadrée', 'Inutile : âge, situation familiale, nationalité, adresse complète'] },
  { c: 'profil', t: 'Écrire son profil', p: 'Trois éléments : qui tu es, ce que tu apportes (avec un chiffre), ce que tu cherches.', ba: [['Passionné et dynamique, je cherche un poste stimulant dans une entreprise innovante.', 'Technicien logistique avec 6 ans d’expérience, j’ai réduit de 15 % les erreurs de préparation. Je cherche un poste de responsable d’entrepôt.']] },
  { c: 'exp', t: 'Décrire une expérience', p: 'Formule : verbe d’action + ce que tu as fait + résultat chiffré. Trois à cinq puces par poste, les plus récentes en détail.', ba: [['Responsable de la gestion des stocks.', 'Réduit de 20 % les ruptures de stock en réorganisant les réapprovisionnements.'], ['Participation à des projets web.', 'Coordonné 12 projets web par an pour des clients grands comptes, livrés dans les délais.']] },
  { c: 'exp', t: 'Verbes d’action', p: 'Touche un verbe pour le copier, puis colle-le dans une puce.', verbes: true },
  { c: 'exp', t: 'Peu ou pas d’expérience ?', l: ['Mets en avant stages, alternance, jobs d’été, bénévolat, projets personnels', 'Décris les compétences transférables : relation client, rigueur, travail en équipe, outils', 'Place la formation avant les expériences si elle est plus parlante', 'Ajoute des réalisations concrètes : un projet, un résultat, une responsabilité'] },
  { c: 'exp', t: 'Trou dans le parcours', l: ['Reste factuel et bref : formation, congé parental, projet personnel, reconversion', 'Utilise les années plutôt que les mois si cela lisse l’ensemble', 'Prépare une réponse simple pour l’entretien'] },
  { c: 'formation', t: 'La formation', l: ['Diplôme le plus récent en premier, avec école et année', 'Inutile de lister le lycée à partir de bac+2', 'Mentionne un mémoire, une spécialité ou un projet seulement s’il est lié au poste', 'Formations courtes et certifications : dans leur section dédiée'] },
  { c: 'comp', t: 'Compétences et langues', l: ['6 à 12 compétences, choisies selon l’offre', 'Sépare techniques (outils, logiciels) et transversales', 'Évite les barres de niveau sans signification : préfère « avancé », « notions »', 'Langues avec niveau clair : A1–C2 ou courant, intermédiaire, notions'] },
  { c: 'ats', t: 'Passer les filtres automatiques (ATS)', p: 'Beaucoup d’entreprises trient les CV avec un logiciel avant lecture humaine.', l: ['Modèle simple, polices standards, pas de texte dans des images', 'Titres de section classiques : Expériences, Formation, Compétences', 'Reprends les mots-clés de l’offre tels quels (outil Offre)', 'Envoie un PDF avec du texte sélectionnable, pas une capture', 'Nomme le fichier : Prenom_Nom_CV.pdf'] },
  { c: 'erreurs', t: 'Erreurs fréquentes', l: ['Fautes d’orthographe : relis à voix haute, fais relire', 'Mots creux : dynamique, motivé, sérieux', 'Trop long, trop dense, trop de couleurs', 'Dates incohérentes, infos périmées, liens cassés', 'Mentir ou gonfler : ça se vérifie, et ça se paie en entretien'] },
  { c: 'candidature', t: 'Adapter son CV à chaque offre', l: ['Relis l’annonce et repère 5 à 8 mots-clés', 'Remonte les compétences et puces qui y répondent', 'Adapte le titre sous ton nom au poste visé', 'L’onglet Offre fait ce travail : colle l’annonce, regarde le score, crée une version'] },
  { c: 'candidature', t: 'Relancer', l: ['Compte 7 à 10 jours après l’envoi', 'Message court, poli, qui rappelle le poste visé', 'Note la date de relance dans l’onglet Suivi'] },
];
const GCATS = [['essentiel', 'Essentiel'], ['infos', 'En-tête'], ['profil', 'Profil'], ['exp', 'Expériences'], ['formation', 'Formation'], ['comp', 'Compétences'], ['ats', 'Filtres ATS'], ['erreurs', 'Erreurs'], ['candidature', 'Candidature']];
const CHECKLIST = ['Orthographe relue (et relue par quelqu’un d’autre)', 'Titre adapté au poste visé', 'Chiffres dans les expériences récentes', 'Mots-clés de l’offre présents', 'Email et téléphone corrects', '1 page (2 maximum)', 'PDF lisible, texte sélectionnable', 'Nom du fichier : Prenom_Nom_CV.pdf'];

/* ============ interface ============ */
const app = $('#app');
const ICONS = {
  cv: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  offre: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M8.5 11l2 2 3-3.5"/>',
  suivi: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  guide: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  regl: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
};
const TABS = [['cv', 'Mes CV'], ['offre', 'Offre'], ['suivi', 'Suivi'], ['guide', 'Guide'], ['regl', 'Réglages']];
function renderNav() {
  const nav = $('#nav');
  nav.hidden = !!ui.ed;
  nav.innerHTML = `<div class="in">${TABS.map(([k, l]) => `<button class="${ui.tab === k ? 'on' : ''}" data-act="nav" data-v="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>${l}</button>`).join('')}</div>`;
}
function render() {
  const y = window.scrollY;
  renderNav();
  app.innerHTML = ui.ed && curCV() ? viewEditor(curCV()) : ({ cv: tabCV, offre: tabOffre, suivi: tabSuivi, guide: tabGuide, regl: tabRegl }[ui.tab])();
  window.scrollTo(0, y);
}
function toast(m) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600);
}
function openSheet(html) {
  ui.sheet = true;
  $('#layer').innerHTML = `<div id="sheetbg"><div id="sheet"><div class="grab"></div>${html}</div></div>`;
}
function closeSheet() { ui.sheet = null; $('#layer').innerHTML = ''; }
const fmtDate = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/* ---- onglet Mes CV ---- */
function tabCV() {
  const n = S.cvs.length;
  return `<div class="wrap">
  <div class="top"><span class="app">CV en poche</span><span class="chip">${S.jobs.length} candidature${S.jobs.length > 1 ? 's' : ''}</span></div>
  <section class="card hero"><div class="lbl">Mes CV</div><div class="big">${n}</div>
    <div class="sub">${n ? 'Touche un CV pour le modifier, ou importe-en un nouveau.' : 'Importe ton CV actuel en PDF : chaque rubrique devient modifiable.'}</div>
    <div class="row2"><button class="btn solid" data-act="importpdf">Importer un PDF</button><button class="btn" data-act="newcv">Nouveau CV</button></div></section>
  ${n ? S.cvs.slice().sort((a, b) => b.updated - a.updated).map(cvCard).join('') : `<div class="card empty"><b>Rien pour l’instant</b><div class="small">Tes CV restent sur ton téléphone : pas de compte, pas de pub, pas d’envoi.</div></div>`}
  </div>`;
}
function cvCard(cv) {
  const pg = renderPages(cv).pages.length;
  return `<div class="card cvcard">${thumb(cv, 84)}
   <div class="info"><div class="nm">${esc(cv.name)}</div>
   <div class="small muted">${esc(cv.data.identity.nom || 'Sans nom')} · ${pg} page${pg > 1 ? 's' : ''} · ${fmtDate(cv.updated)}</div>
   <div class="chips"><span class="chip">${esc((TPLS.find(t => t[0] === cv.tpl) || [])[1] || '')}</span>${cv.review ? '<span class="chip warn">À vérifier</span>' : ''}</div>
   <div class="acts"><button class="btn sm" data-act="edit" data-id="${cv.id}">Modifier</button><button class="btn sm ghost" data-act="prev" data-id="${cv.id}">Aperçu / PDF</button><button class="ib sm" data-act="cvmenu" data-id="${cv.id}" aria-label="Plus">⋯</button></div></div></div>`;
}

/* ---- éditeur ---- */
const ET = [['infos', 'Infos'], ['parcours', 'Parcours'], ['formation', 'Formation'], ['comp', 'Compétences'], ['plus', 'Plus'], ['style', 'Style'], ['controle', 'Contrôle']];
function viewEditor(cv) {
  const body = { infos: edInfos, parcours: edParcours, formation: edFormation, comp: edComp, plus: edPlus, style: edStyle, controle: edControle }[ui.edTab](cv);
  return `<div class="wrap">
   <div class="edhead"><div class="edtitle"><button class="ib" data-act="back" aria-label="Retour">←</button><input data-p="name" value="${esc(cv.name)}" aria-label="Nom du CV"><button class="ib" data-act="cvmenu" data-id="${cv.id}" aria-label="Plus">⋯</button></div>
   <div class="scrollx vt">${ET.map(([k, l]) => `<button class="${ui.edTab === k ? 'on' : ''}" data-act="edtab" data-v="${k}">${l}</button>`).join('')}</div></div>
   ${cv.review ? `<div class="banner"><span>CV importé : vérifie chaque rubrique, la lecture automatique peut se tromper. Le texte non classé est dans « Plus ».</span><button class="btn sm ghost" data-act="dismiss">OK</button></div>` : ''}
   ${body}</div>
   <div class="edbar"><div class="in"><button class="btn" data-act="prev" data-id="${cv.id}">Aperçu et PDF</button></div></div>`;
}
const fld = (cv, label, path, ph = '', type = 'text') => `<label class="f">${label}<input type="${type}" data-p="${path}" value="${esc(path.split('.').reduce((o, k) => o?.[k], cv))}" placeholder="${esc(ph)}" autocomplete="off"></label>`;
function edInfos(cv) {
  const i = cv.data.identity;
  return `<div class="card"><div class="rowline"><div class="photo" style="${i.photo ? `background-image:url('${i.photo}')` : ''}">${i.photo ? '' : '👤'}</div>
   <div class="chips"><button class="btn sm ghost" data-act="photo">${i.photo ? 'Changer' : 'Ajouter une photo'}</button>${i.photo ? '<button class="btn sm ghost" data-act="rmphoto">Retirer</button>' : ''}</div></div>
   ${fld(cv, 'Nom complet', 'data.identity.nom', 'Prénom Nom')}
   ${fld(cv, 'Titre / poste visé', 'data.identity.titre', 'Ex. Chef de projet digital')}
   <div class="grid2">${fld(cv, 'Téléphone', 'data.identity.tel', '06 00 00 00 00', 'tel')}${fld(cv, 'Email', 'data.identity.email', 'prenom.nom@mail.fr', 'email')}</div>
   <div class="grid2">${fld(cv, 'Ville', 'data.identity.ville', 'Lyon')}${fld(cv, 'Permis', 'data.identity.permis', 'Permis B')}</div>
   ${fld(cv, 'Adresse complète (facultatif)', 'data.identity.adresse', 'Remplace la ville si renseignée')}
   <div class="grid2">${fld(cv, 'LinkedIn', 'data.identity.linkedin', 'linkedin.com/in/…')}${fld(cv, 'Site / portfolio', 'data.identity.site', 'https://…')}</div>
   ${fld(cv, 'Âge / naissance (facultatif)', 'data.identity.naissance', '')}</div>
   <div class="card"><h2>Profil</h2><div class="small muted">2–3 lignes : qui tu es, ce que tu apportes, ce que tu cherches.</div>
   <label class="f"><textarea data-p="data.resume" rows="5">${esc(cv.data.resume)}</textarea></label></div>`;
}
function itemTools(l, it, idx, len) {
  return `<div class="tools"><label class="swrow" style="gap:8px"><span class="small">Inclure dans ce CV</span><span class="sw"><input type="checkbox" data-l="${l}" data-i="${it.id}" data-k="on" data-r="1" ${it.on !== false ? 'checked' : ''}><i></i></span></label>
   <div class="row2"><button class="ib sm" data-act="mv" data-l="${l}" data-i="${it.id}" data-d="-1" ${idx === 0 ? 'disabled' : ''}>↑</button><button class="ib sm" data-act="mv" data-l="${l}" data-i="${it.id}" data-d="1" ${idx === len - 1 ? 'disabled' : ''}>↓</button><button class="ib sm" data-act="delitem" data-l="${l}" data-i="${it.id}" aria-label="Supprimer">🗑</button></div></div>`;
}
const li = (l, it, k, label, ph = '', type = 'text') => `<label class="f">${label}<input type="${type}" data-l="${l}" data-i="${it.id}" data-k="${k}" value="${esc(it[k])}" placeholder="${esc(ph)}"></label>`;
function edParcours(cv) {
  const L = cv.data.experiences;
  return `<div class="small muted">Désactive une expérience pour l’exclure de ce CV sans la perdre.</div>
  ${L.map((e, n) => `<details class="item ${e.on === false ? 'off' : ''}" data-d="${e.id}" ${ui.open[e.id] ? 'open' : ''}><summary><div class="st"><b>${esc(e.poste || 'Nouvelle expérience')}</b><span>${esc([e.entreprise, dateRange(e.debut, e.fin, e.actuel)].filter(Boolean).join(' · '))}</span></div>${e.on === false ? '<span class="chip">masquée</span>' : ''}<span class="muted">▾</span></summary>
   <div class="body">${li('experiences', e, 'poste', 'Poste', 'Ex. Responsable d’équipe')}${li('experiences', e, 'entreprise', 'Entreprise', '')}${li('experiences', e, 'lieu', 'Lieu', '')}
   <div class="grid2">${li('experiences', e, 'debut', 'Début', 'MM/AAAA')}${e.actuel ? '<div></div>' : li('experiences', e, 'fin', 'Fin', 'MM/AAAA')}</div>
   <label class="swrow"><span>Poste actuel</span><span class="sw"><input type="checkbox" data-l="experiences" data-i="${e.id}" data-k="actuel" data-r="1" ${e.actuel ? 'checked' : ''}><i></i></span></label>
   <label class="f">Missions et résultats (une puce par ligne, commence par « - »)<textarea rows="6" data-l="experiences" data-i="${e.id}" data-k="desc">${esc(e.desc)}</textarea></label>
   ${itemTools('experiences', e, n, L.length)}</div></details>`).join('')}
  <button class="btn" data-act="add" data-l="experiences">+ Ajouter une expérience</button>`;
}
function edFormation(cv) {
  const L = cv.data.formations;
  return `${L.map((f, n) => `<details class="item ${f.on === false ? 'off' : ''}" data-d="${f.id}" ${ui.open[f.id] ? 'open' : ''}><summary><div class="st"><b>${esc(f.diplome || 'Nouvelle formation')}</b><span>${esc([f.ecole, [f.debut, f.fin].filter(Boolean).join(' – ')].filter(Boolean).join(' · '))}</span></div>${f.on === false ? '<span class="chip">masquée</span>' : ''}<span class="muted">▾</span></summary>
   <div class="body">${li('formations', f, 'diplome', 'Diplôme / formation', '')}${li('formations', f, 'ecole', 'École / organisme', '')}
   <div class="grid2">${li('formations', f, 'debut', 'Début', 'AAAA')}${li('formations', f, 'fin', 'Fin', 'AAAA')}</div>
   <label class="f">Détails (facultatif)<textarea rows="3" data-l="formations" data-i="${f.id}" data-k="desc">${esc(f.desc)}</textarea></label>
   ${itemTools('formations', f, n, L.length)}</div></details>`).join('')}
  <button class="btn" data-act="add" data-l="formations">+ Ajouter une formation</button>`;
}
function edComp(cv) {
  const d = cv.data;
  return `<div class="card"><h2>Domaines de compétences</h2><div class="small muted">Texte libre : « ## Titre » pour un sous-titre, puis une puce par ligne (« - »). Laisse vide si tu n’en as pas besoin.</div><label class="f"><textarea data-p="data.domaines" rows="10">${esc(cv.data.domaines || '')}</textarea></label></div>
  <div class="card"><h2>Compétences</h2><div class="small muted">Coche celles à garder dans ce CV. Choisis-les selon l’offre visée.</div>
   <div>${d.competences.map(c => `<div class="skill"><input type="checkbox" data-l="competences" data-i="${c.id}" data-k="on" data-r="1" ${c.on !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)"><input class="t" data-l="competences" data-i="${c.id}" data-k="nom" value="${esc(c.nom)}"><select data-l="competences" data-i="${c.id}" data-k="niveau" data-num="1">${NIV.map((n, v) => `<option value="${v}" ${+c.niveau === v ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="ib sm" data-act="delitem" data-l="competences" data-i="${c.id}">✕</button></div>`).join('')}</div>
   <div class="row2"><input id="newskill" class="skill-in" placeholder="Ajouter (séparées par des virgules)" style="flex:1;min-width:0;border:1px solid var(--line);background:var(--bg);border-radius:10px;padding:10px 12px"><button class="btn sm" data-act="addskill">Ajouter</button></div></div>
  <div class="card"><h2>Langues</h2>
   ${d.langues.map(c => `<div class="skill"><input type="checkbox" data-l="langues" data-i="${c.id}" data-k="on" data-r="1" ${c.on !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)"><input class="t" data-l="langues" data-i="${c.id}" data-k="nom" value="${esc(c.nom)}" placeholder="Langue"><input class="t" data-l="langues" data-i="${c.id}" data-k="niveau" value="${esc(c.niveau)}" placeholder="Niveau" style="max-width:130px"><button class="ib sm" data-act="delitem" data-l="langues" data-i="${c.id}">✕</button></div>`).join('')}
   <button class="btn sm ghost" data-act="add" data-l="langues">+ Langue</button></div>
  <div class="card"><h2>Certifications et habilitations</h2>
   ${d.certifs.map(c => `<div class="skill"><input type="checkbox" data-l="certifs" data-i="${c.id}" data-k="on" data-r="1" ${c.on !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)"><input class="t" data-l="certifs" data-i="${c.id}" data-k="nom" value="${esc(c.nom)}" placeholder="Intitulé"><input class="t" data-l="certifs" data-i="${c.id}" data-k="annee" value="${esc(c.annee)}" placeholder="Année" style="max-width:84px"><button class="ib sm" data-act="delitem" data-l="certifs" data-i="${c.id}">✕</button></div>`).join('')}
   <button class="btn sm ghost" data-act="add" data-l="certifs">+ Certification</button></div>`;
}
function edPlus(cv) {
  return `<div class="card"><h2>Centres d’intérêt</h2><div class="small muted">Court et concret : 3 à 5 éléments.</div><label class="f"><textarea data-p="data.loisirs" rows="3">${esc(cv.data.loisirs)}</textarea></label></div>
  <div class="card"><h2>Texte non classé</h2><div class="small muted">Lignes de l’import que l’appli n’a pas su placer. Récupère ce qui t’est utile, puis vide la zone. Cette zone n’apparaît pas sur le CV.</div><label class="f"><textarea data-p="data.extra" rows="7">${esc(cv.data.extra)}</textarea></label></div>`;
}
function edStyle(cv) {
  return `<div class="card"><h2>Modèle</h2><div class="tplgrid">${TPLS.map(([k, n]) => `<button class="${cv.tpl === k ? 'on' : ''}" data-act="tpl" data-v="${k}">${thumb({ ...cv, tpl: k, updated: cv.updated }, 84, true)}<span>${n}</span></button>`).join('')}</div></div>
  <div class="card"><h2>Couleur</h2><div class="pal">${ACCENTS.map(c => `<button class="${cv.accent === c ? 'on' : ''}" style="background:${c}" data-act="cvacc" data-v="${c}" aria-label="${c}"></button>`).join('')}<input type="color" data-p="accent" value="${cv.accent}" style="width:40px;height:40px;border:0;background:none;padding:0"></div></div>
  <div class="card"><h2>Texte</h2><div class="seg"><button class="${cv.font !== 'serif' ? 'on' : ''}" data-act="cvfont" data-v="sans">Sans empattement</button><button class="${cv.font === 'serif' ? 'on' : ''}" data-act="cvfont" data-v="serif">Avec empattement</button></div>
   <label class="f">Taille du texte : <span class="muted small">réduis-la pour tenir sur une page</span><input type="range" min="0.82" max="1.15" step="0.01" data-p="scale" data-num="1" value="${cv.scale || 1}"></label>
   <label class="swrow"><span>Afficher la photo</span><span class="sw"><input type="checkbox" data-p="photo" ${cv.photo !== false ? 'checked' : ''}><i></i></span></label></div>
  <div class="card"><h2>Rubriques</h2><div class="small muted">Ordre et visibilité. ${cv.tpl === 'moderne' ? 'Dans ce modèle, compétences, langues et loisirs restent dans la colonne de gauche.' : ''}</div>
   ${cv.order.map((k, n) => `<div class="skill"><span style="flex:1">${SECS[k]}</span><span class="sw"><input type="checkbox" data-p="show.${k}" ${cv.show[k] !== false ? 'checked' : ''}><i></i></span><button class="ib sm" data-act="secmv" data-k="${k}" data-d="-1" ${n === 0 ? 'disabled' : ''}>↑</button><button class="ib sm" data-act="secmv" data-k="${k}" data-d="1" ${n === cv.order.length - 1 ? 'disabled' : ''}>↓</button></div>`).join('')}</div>`;
}
function edControle(cv) {
  const { L, score } = qualityChecks(cv);
  return `<div class="card"><div class="rowline"><div class="ring" style="--p:${score}"><b>${score}</b></div><div><h2>Contrôle du CV</h2><div class="small muted">Vérifications automatiques : complétude, longueur, chiffres, dates, mots creux.</div></div></div>
  <div>${L.map(x => `<div class="check"><span class="dot ${x.lvl}"></span><span>${esc(x.txt)}</span></div>`).join('')}</div></div>`;
}

/* ---- onglet Offre ---- */
function tabOffre() {
  const o = ui.offre, res = o.res;
  if (!o.cvId || !S.cvs.some(c => c.id === o.cvId)) o.cvId = S.cvs[0]?.id || '';
  if (!S.cvs.length) return `<div class="wrap"><div class="top"><span class="app">Offre</span></div><div class="card empty"><b>Crée d’abord un CV</b><div class="small">L’analyse compare une annonce avec ton CV.</div><button class="btn" data-act="nav" data-v="cv" style="margin-top:8px">Aller aux CV</button></div></div>`;
  return `<div class="wrap"><div class="top"><span class="app">Offre</span></div>
  <div class="card"><h2>Adapter son CV à une annonce</h2><div class="small muted">Colle l’annonce : l’appli repère les mots-clés et ce qui manque à ton CV.</div>
   <label class="f">CV à comparer<select data-u="offre.cvId">${S.cvs.map(c => `<option value="${c.id}" ${c.id === o.cvId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
   <div class="grid2"><label class="f">Poste<input data-u="offre.poste" value="${esc(o.poste)}" placeholder="Ex. Chef de projet"></label><label class="f">Entreprise<input data-u="offre.entreprise" value="${esc(o.entreprise)}"></label></div>
   <label class="f">Texte de l’annonce<textarea data-u="offre.text" rows="8" placeholder="Colle ici l’annonce…">${esc(o.text)}</textarea></label>
   <button class="btn" data-act="analyze">Analyser</button></div>
  ${res ? `<div class="card"><div class="rowline"><div class="ring" style="--p:${res.score}"><b>${res.score}%</b></div><div><h2>Correspondance</h2><div class="small muted">Part des mots-clés de l’annonce présents dans ton CV.</div></div></div>
   <div><b class="small">Déjà présents</b><div class="kw" style="margin-top:6px">${res.ok.length ? res.ok.map(w => `<span class="chip ok">${esc(w)}</span>`).join('') : '<span class="muted small">Aucun</span>'}</div></div>
   <div><b class="small">Absents de ton CV</b> <span class="small muted">· touche un mot pour l’ajouter aux compétences</span><div class="kw" style="margin-top:6px">${res.miss.length ? res.miss.map(w => `<span class="chip warn" data-act="addkw" data-w="${esc(w)}">+ ${esc(w)}</span>`).join('') : '<span class="muted small">Rien d’important ne manque.</span>'}</div></div>
   <div class="small muted">N’ajoute un mot que si tu maîtrises vraiment le sujet.</div></div>
  <div class="card"><h2>Créer une version adaptée</h2><div class="small muted">Copie ton CV et remonte en premier ce qui répond à l’annonce.</div>
   <label class="swrow"><span>Masquer les compétences sans rapport</span><span class="sw"><input type="checkbox" data-u="offre.mask" ${o.mask ? 'checked' : ''}><i></i></span></label>
   <label class="swrow"><span>Mettre le poste visé en titre</span><span class="sw"><input type="checkbox" data-u="offre.settitle" ${o.settitle ? 'checked' : ''}><i></i></span></label>
   <div class="row2"><button class="btn" data-act="adapt">Créer la version</button><button class="btn ghost" data-act="tojob">Ajouter au suivi</button></div></div>` : ''}</div>`;
}

/* ---- onglet Suivi ---- */
function tabSuivi() {
  const f = ui.jobFilter, today = new Date().toISOString().slice(0, 10);
  const cnt = k => S.jobs.filter(j => j.statut === k).length;
  const list = S.jobs.filter(j => f === 'all' || j.statut === f).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.created - a.created);
  const due = S.jobs.filter(j => j.statut === 'envoyee' && j.relance && j.relance <= today).length;
  return `<div class="wrap"><div class="top"><span class="app">Suivi</span><button class="btn sm" data-act="newjob">+ Candidature</button></div>
  ${due ? `<div class="banner"><span>${due} relance${due > 1 ? 's' : ''} à faire.</span></div>` : ''}
  <div class="withfilt"><div class="catbar vt"><button class="${f === 'all' ? 'on' : ''}" data-act="jf" data-v="all">Toutes<span> ${S.jobs.length}</span></button>${STATUTS.map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="jf" data-v="${k}">${l}<span> ${cnt(k)}</span></button>`).join('')}</div>
  <div class="card">${list.length ? list.map(j => {
    const cv = S.cvs.find(c => c.id === j.cvId), st = (STATUTS.find(s => s[0] === j.statut) || [, ''])[1];
    const late = j.statut === 'envoyee' && j.relance && j.relance < today, tod = j.statut === 'envoyee' && j.relance === today;
    return `<button class="job" data-act="editjob" data-id="${j.id}"><div class="l1"><b>${esc(j.poste || 'Poste')}</b><span class="chip ${j.statut === 'refus' ? 'bad' : j.statut === 'offre' ? 'ok' : ''}">${st}</span></div>
     <div class="small muted">${esc(j.entreprise || '—')}${j.date ? ' · envoyée le ' + fmtDate(j.date) : ''}${cv ? ' · ' + esc(cv.name) : ''}</div>${late ? '<span class="chip bad">Relance dépassée</span>' : tod ? '<span class="chip warn">Relance aujourd’hui</span>' : j.relance && j.statut === 'envoyee' ? `<span class="small muted">Relance le ${fmtDate(j.relance)}</span>` : ''}</button>`;
  }).join('') : '<div class="empty small">Aucune candidature ici.</div>'}</div></div></div>`;
}
function jobSheet(j) {
  ui.jd = { ...j };
  openSheet(`<div class="sh"><h2>${j.created ? 'Candidature' : 'Nouvelle candidature'}</h2><button class="ib" data-act="closesheet">✕</button></div>
  <div class="grid2"><label class="f">Poste<input data-u="jd.poste" value="${esc(j.poste)}"></label><label class="f">Entreprise<input data-u="jd.entreprise" value="${esc(j.entreprise)}"></label></div>
  <label class="f">Lien de l’annonce<input data-u="jd.url" value="${esc(j.url)}" placeholder="https://…"></label>
  <div class="grid2"><label class="f">Statut<select data-u="jd.statut">${STATUTS.map(([k, l]) => `<option value="${k}" ${j.statut === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <label class="f">CV envoyé<select data-u="jd.cvId"><option value="">—</option>${S.cvs.map(c => `<option value="${c.id}" ${j.cvId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label></div>
  <div class="grid2"><label class="f">Date d’envoi<input type="date" data-u="jd.date" value="${esc(j.date)}"></label><label class="f">Relance prévue<input type="date" data-u="jd.relance" value="${esc(j.relance)}"></label></div>
  <label class="f">Notes<textarea data-u="jd.notes" rows="3">${esc(j.notes)}</textarea></label>
  <div class="row2"><button class="btn" data-act="savejob" style="flex:1">Enregistrer</button>${j.created ? `<button class="btn danger" data-act="deljob" data-id="${j.id}">Supprimer</button>` : ''}${j.url ? `<a class="btn ghost" href="${esc(j.url)}" target="_blank" rel="noopener" style="text-decoration:none;text-align:center">Voir l’annonce</a>` : ''}</div>`);
}
const newJob = () => ({ id: uid(), poste: '', entreprise: '', url: '', statut: 'aenvoyer', cvId: S.cvs[0]?.id || '', date: '', relance: '', notes: '', offre: '', created: 0 });

/* ---- onglet Guide ---- */
function tabGuide() {
  const g = ui.gcat;
  return `<div class="wrap"><div class="top"><span class="app">Guide du CV</span></div>
  <div class="withfilt"><div class="catbar vt">${GCATS.map(([k, l]) => `<button class="${g === k ? 'on' : ''}" data-act="gcat" data-v="${k}">${l}</button>`).join('')}</div>
  <div style="display:flex;flex-direction:column;gap:14px">${GUIDE.filter(x => x.c === g).map(x => `<div class="card tip"><h3>${x.t}</h3>${x.p ? `<p>${x.p}</p>` : ''}${x.l ? `<ul>${x.l.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}${x.ba ? x.ba.map(b => `<div class="ba"><div class="no"><b>À éviter</b>${b[0]}</div><div class="yes"><b>Mieux</b>${b[1]}</div></div>`).join('') : ''}${x.verbes ? `<div class="chips">${VERBES.map(v => `<button data-act="copyverb" data-w="${v}">${v}</button>`).join('')}</div>` : ''}</div>`).join('')}
  ${g === 'candidature' ? `<div class="card"><h3>Avant d’envoyer</h3>${CHECKLIST.map((c, n) => `<button class="cl ${S.checks[n] ? 'on' : ''}" data-act="cl" data-n="${n}"><span class="cb">${S.checks[n] ? '✓' : ''}</span><span>${c}</span></button>`).join('')}<button class="btn sm ghost" data-act="clreset">Réinitialiser</button></div>` : ''}</div></div></div>`;
}

/* ---- onglet Réglages ---- */
function tabRegl() {
  const t = ui.stab, s = S.set;
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${s[k] === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (t === 'app') body = `<div class="card"><h2>Thème</h2>${seg('theme', [['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']])}<h2>Couleur de l’appli</h2><div class="pal">${ACCENTS.map(c => `<button class="${s.accent === c ? 'on' : ''}" style="background:${c}" data-act="set" data-k="accent" data-v="${c}"></button>`).join('')}</div>
   <h2>Taille du texte</h2>${seg('size', [['small', 'Petit'], ['normal', 'Normal'], ['big', 'Grand']])}
   <h2>Onglets de filtres</h2>${seg('filt', [['top', 'En haut'], ['side', 'Sur le côté']])}</div>`;
  if (t === 'cv') body = `<div class="card"><h2>Modèle par défaut</h2><div class="seg">${TPLS.map(([k, n]) => `<button class="${s.tpl === k ? 'on' : ''}" data-act="set" data-k="tpl" data-v="${k}">${n}</button>`).join('')}</div>
   <h2>Couleur par défaut</h2><div class="pal">${ACCENTS.map(c => `<button class="${s.cvAccent === c ? 'on' : ''}" style="background:${c}" data-act="set" data-k="cvAccent" data-v="${c}"></button>`).join('')}</div>
   <h2>Police par défaut</h2>${seg('font', [['sans', 'Sans empattement'], ['serif', 'Avec empattement']])}<div class="small muted">S’applique aux nouveaux CV.</div></div>`;
  if (t === 'data') { const kb = Math.round(JSON.stringify(S).length / 1024); body = `<div class="card"><h2>Sauvegarde</h2><div class="small muted">Tout est stocké sur cet appareil (${kb} Ko). Exporte régulièrement un fichier pour ne rien perdre ou pour passer d’un téléphone à l’autre.</div>
   <button class="btn" data-act="expjson">Exporter mes données</button><button class="btn ghost" data-act="impjson">Importer un fichier</button></div>
   <div class="card"><h2>Zone dangereuse</h2><button class="btn danger" data-act="resetall">Tout effacer</button></div>`; }
  if (t === 'about') body = `<div class="card"><h2>CV en poche</h2><div class="small">Gratuit, sans publicité, sans compte, hors connexion. Tes CV ne quittent jamais ton appareil : la lecture des PDF se fait sur ton téléphone.</div>
   <div class="small muted">Import PDF : la lecture est automatique mais pas parfaite, vérifie toujours le résultat. Les PDF scannés (images) ne sont pas lisibles.</div>
   <div class="small muted">Astuce : pour enregistrer en PDF, ouvre l’aperçu puis « Imprimer / PDF » et choisis « Enregistrer au format PDF ». Sur iPhone, ouvre l’appli dans Safari si l’impression ne s’ouvre pas.</div></div>`;
  if (t === 'maj') body = `<div class="card"><h2>Version ${APP_VERSION}</h2><div class="small muted">Dernière mise à jour : ${CHANGELOG[0].d}</div><button class="btn" data-act="checkupd">Vérifier les mises à jour</button></div>
   ${CHANGELOG.map(c => `<div class="card tip"><h3>Version ${c.v} <span class="chip">${c.d}</span></h3><ul>${c.l.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}`;
  return `<div class="wrap"><div class="top"><span class="app">Réglages</span><span class="chip">v${APP_VERSION}</span></div>
  <div class="scrollx vt">${[['app', 'Apparence'], ['cv', 'Modèles'], ['data', 'Données'], ['maj', 'Mises à jour'], ['about', 'À propos']].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="stab" data-v="${k}">${l}</button>`).join('')}</div>${body}</div>`;
}

/* ============ aperçu / impression ============ */
function openPreview(cv) {
  ui.prevId = cv.id;
  drawPreview();
}
function drawPreview() {
  const cv = S.cvs.find(c => c.id === ui.prevId); if (!cv) return;
  const { pages } = renderPages(cv);
  const w = Math.min(innerWidth - 24, 760) * ui.prevZoom, k = w / PAGE_W, h = w * 297 / 210;
  let el = $('#prev');
  if (!el) { el = document.createElement('div'); el.id = 'prev'; document.body.appendChild(el); }
  const sc = el.querySelector('.scroll'), st = sc ? sc.scrollTop : 0;
  el.innerHTML = `<div class="bar"><button class="btn sm ghost" data-act="closeprev">✕ Fermer</button><span class="small muted">${pages.length} page${pages.length > 1 ? 's' : ''}</span><div class="row2"><button class="ib sm" data-act="prevzoom" data-d="-1">−</button><button class="ib sm" data-act="prevzoom" data-d="1">+</button><button class="btn sm" data-act="print">Imprimer / PDF</button><button class="btn sm ghost" data-act="copytxt">Copier le texte</button></div></div>
   <div class="scroll">${pages.map(p => `<div class="pgbox" style="width:${w}px;height:${h}px"><div class="pg-in" style="transform:scale(${k});transform-origin:0 0;width:${PAGE_W}px">${p}</div></div>`).join('')}</div>`;
  el.querySelector('.scroll').scrollTop = st;
}
function printCV(cv) {
  $('#printRoot').innerHTML = renderPages(cv).pages.join('');
  const t = document.title; document.title = (cv.data.identity.nom ? cv.data.identity.nom.replace(/\s+/g, '_') + '_CV' : cv.name.replace(/\s+/g, '_'));
  const back = () => { document.title = t; $('#printRoot').innerHTML = ''; removeEventListener('afterprint', back); };
  addEventListener('afterprint', back);
  setTimeout(() => print(), 120);
}

/* ============ import PDF ============ */
async function importPdf(file) {
  toast('Lecture du PDF…');
  try {
    const pdfjs = await import('./pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.min.mjs', import.meta.url).href;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let n = 1; n <= Math.min(doc.numPages, 6); n++) {
      const p = await doc.getPage(n), vp = p.getViewport({ scale: 1 });
      pages.push({ width: vp.width, items: adaptItems(await p.getTextContent()) });
    }
    const r = parseCV(pages);
    ui.imp = { r, name: (r.ok && r.data.identity.nom ? 'CV ' + r.data.identity.nom.split(' ')[0] : file.name.replace(/\.pdf$/i, '')), file: file.name };
    showImport();
  } catch (e) { console.error(e); toast('Impossible de lire ce PDF'); }
}
function showImport() {
  const { r, name } = ui.imp;
  if (!r.ok) { openSheet(`<div class="sh"><h2>Aucun texte trouvé</h2><button class="ib" data-act="closesheet">✕</button></div><div class="small">Ce PDF ressemble à un scan (image) : la lecture automatique ne peut pas y trouver de texte. Utilise un PDF exporté depuis Word, Canva ou une autre appli, ou crée ton CV de zéro.</div><button class="btn" data-act="newcv">Créer un CV vide</button>`); return; }
  const s = r.stats, ok = v => v ? '<span class="chip ok">trouvé</span>' : '<span class="chip warn">manquant</span>';
  openSheet(`<div class="sh"><h2>Résultat de la lecture</h2><button class="ib" data-act="closesheet">✕</button></div>
  <div class="small muted">Ce que l’appli a reconnu. Tu pourras tout corriger ensuite.</div>
  <div class="card" style="gap:2px">
   ${[['Nom', s.nom, r.data.identity.nom], ['Titre', s.titre, r.data.identity.titre], ['Email', s.email, r.data.identity.email], ['Téléphone', s.tel, r.data.identity.tel], ['Ville', s.ville, r.data.identity.ville]].map(([l, v, t]) => `<div class="check"><span style="flex:1"><b>${l}</b><div class="small muted">${esc(t || '')}</div></span>${ok(v)}</div>`).join('')}
   ${[['Expériences', s.experiences], ['Formations', s.formations], ['Compétences', s.competences], ['Domaines de compétences', s.domaines], ['Langues', s.langues], ['Certifications', s.certifs]].map(([l, n]) => `<div class="check"><span style="flex:1"><b>${l}</b></span><span class="chip ${n ? 'ok' : 'warn'}">${n}</span></div>`).join('')}</div>
  <label class="f">Nom du CV<input data-u="imp.name" value="${esc(name)}"></label>
  <button class="btn" data-act="doimport">Créer le CV et vérifier</button>`);
}
function doImport() {
  const { r, name } = ui.imp, d = r.data;
  const cv = newCV(name || 'CV importé', {
    identity: d.identity, resume: d.resume, domaines: d.domaines || '', loisirs: d.loisirs, extra: d.extra,
    experiences: d.experiences.map(e => ({ id: uid(), on: true, ...e })), formations: d.formations.map(e => ({ id: uid(), on: true, ...e })),
    competences: d.competences.map(e => ({ id: uid(), on: true, ...e })), langues: d.langues.map(e => ({ id: uid(), on: true, ...e })), certifs: d.certifs.map(e => ({ id: uid(), on: true, ...e })),
  });
  cv.review = true; cv.source = ui.imp.file;
  S.cvs.push(cv); save(); closeSheet(); ui.imp = null; ui.ed = cv.id; ui.edTab = 'infos'; render(); scrollTo(0, 0);
}

/* ============ photo ============ */
function readPhoto(file) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 320;
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 320, 320);
    const cv = curCV(); cv.data.identity.photo = c.toDataURL('image/jpeg', .85); URL.revokeObjectURL(url); touch(cv); render();
  };
  img.onerror = () => toast('Image illisible'); img.src = url;
}

/* ============ événements ============ */
const val = el => el.type === 'checkbox' ? el.checked : (el.dataset.num ? Number(el.value) : el.value);
document.addEventListener('input', e => {
  const el = e.target, cv = ui.ed ? curCV() : null;
  if (el.dataset.u) { setPath(ui, el.dataset.u, val(el)); return; }
  if (!cv) return;
  if (el.dataset.p) { setPath(cv, el.dataset.p, val(el)); if (el.dataset.p === 'name') { /* nom du CV */ } touch(cv); }
  else if (el.dataset.l) { const it = cv.data[el.dataset.l].find(x => x.id === el.dataset.i); if (it) { it[el.dataset.k] = val(el); touch(cv); } }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'fPdf' && el.files[0]) { importPdf(el.files[0]); el.value = ''; return; }
  if (el.id === 'fPhoto' && el.files[0]) { readPhoto(el.files[0]); el.value = ''; return; }
  if (el.id === 'fJson' && el.files[0]) { importJson(el.files[0]); el.value = ''; return; }
  if (el.dataset.r) render();
  if (el.dataset.p && /^show\./.test(el.dataset.p) || el.dataset.p === 'photo') { /* déjà enregistré */ }
});
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.d) ui.open[d.dataset.d] = d.open; }, true);

const ACT = {
  nav: v => { ui.tab = v; ui.ed = null; render(); scrollTo(0, 0); },
  closesheet: () => closeSheet(),
  newcv: () => { closeSheet(); openSheet(`<div class="sh"><h2>Nouveau CV</h2><button class="ib" data-act="closesheet">✕</button></div><label class="f">Nom du CV<input data-u="nn" value="" placeholder="Ex. CV chef de projet"></label>
    <div class="row2"><button class="btn" data-act="docreate" data-v="blank" style="flex:1">CV vide</button><button class="btn ghost" data-act="docreate" data-v="sample" style="flex:1">Avec un exemple</button></div>`); ui.nn = ''; },
  docreate: v => { const cv = newCV(ui.nn || 'Mon CV', v === 'sample' ? sampleData() : null); S.cvs.push(cv); save(); closeSheet(); ui.ed = cv.id; ui.edTab = 'infos'; render(); scrollTo(0, 0); },
  importpdf: () => $('#fPdf').click(),
  doimport: () => doImport(),
  edit: (v, el) => { ui.ed = el.dataset.id; ui.edTab = 'infos'; render(); scrollTo(0, 0); },
  back: () => { ui.ed = null; render(); },
  edtab: v => { ui.edTab = v; render(); scrollTo(0, 0); },
  dismiss: () => { const cv = curCV(); delete cv.review; touch(cv); render(); },
  prev: (v, el) => { const id = el.dataset.id; openPreview(S.cvs.find(c => c.id === id)); },
  closeprev: () => { $('#prev')?.remove(); ui.prevId = null; },
  prevzoom: (v, el) => { ui.prevZoom = Math.max(.6, Math.min(2.2, ui.prevZoom + (+el.dataset.d) * .3)); drawPreview(); },
  print: () => printCV(S.cvs.find(c => c.id === ui.prevId)),
  copytxt: () => { navigator.clipboard?.writeText(cvText(S.cvs.find(c => c.id === ui.prevId))).then(() => toast('Texte copié'), () => toast('Copie impossible')); },
  cvmenu: (v, el) => {
    const cv = S.cvs.find(c => c.id === el.dataset.id); ui.mid = cv.id; ui.rn = cv.name;
    openSheet(`<div class="sh"><h2>${esc(cv.name)}</h2><button class="ib" data-act="closesheet">✕</button></div><label class="f">Renommer<input data-u="rn" value="${esc(cv.name)}"></label>
     <button class="btn" data-act="dorename">Enregistrer le nom</button><button class="btn ghost" data-act="dup">Dupliquer</button><button class="btn ghost" data-act="dltxt">Télécharger en texte</button><button class="btn danger" data-act="delcv">Supprimer ce CV</button>`);
  },
  dorename: () => { const cv = S.cvs.find(c => c.id === ui.mid); cv.name = ui.rn || cv.name; touch(cv); closeSheet(); render(); },
  dup: () => { const cv = S.cvs.find(c => c.id === ui.mid), c = clone(cv); c.id = uid(); c.name = cv.name + ' (copie)'; c.created = c.updated = Date.now(); S.cvs.push(c); save(); closeSheet(); toast('CV dupliqué'); render(); },
  dltxt: () => { const cv = S.cvs.find(c => c.id === ui.mid); download(cv.name.replace(/\s+/g, '_') + '.txt', cvText(cv), 'text/plain'); closeSheet(); },
  delcv: () => { if (!confirm('Supprimer ce CV définitivement ?')) return; S.cvs = S.cvs.filter(c => c.id !== ui.mid); if (ui.ed === ui.mid) ui.ed = null; save(); closeSheet(); render(); },
  add: (v, el) => { const cv = curCV(), l = el.dataset.l, it = LISTS[l](); cv.data[l].push(it); ui.open[it.id] = true; touch(cv); render(); },
  delitem: (v, el) => { const cv = curCV(), l = el.dataset.l; if (['experiences', 'formations'].includes(l) && !confirm('Supprimer cet élément ?')) return; cv.data[l] = cv.data[l].filter(x => x.id !== el.dataset.i); touch(cv); render(); },
  mv: (v, el) => { const cv = curCV(), a = cv.data[el.dataset.l], n = a.findIndex(x => x.id === el.dataset.i), m = n + (+el.dataset.d); if (m < 0 || m >= a.length) return; [a[n], a[m]] = [a[m], a[n]]; touch(cv); render(); },
  addskill: () => { const inp = $('#newskill'), cv = curCV(); const names = inp.value.split(/[,;\n]/).map(s => s.trim()).filter(Boolean); if (!names.length) return; names.forEach(n => cv.data.competences.push({ id: uid(), on: true, nom: n, niveau: 0 })); touch(cv); render(); },
  photo: () => $('#fPhoto').click(),
  rmphoto: () => { const cv = curCV(); cv.data.identity.photo = ''; touch(cv); render(); },
  tpl: v => { const cv = curCV(); cv.tpl = v; touch(cv); render(); },
  cvacc: v => { const cv = curCV(); cv.accent = v; touch(cv); render(); },
  cvfont: v => { const cv = curCV(); cv.font = v; touch(cv); render(); },
  secmv: (v, el) => { const cv = curCV(), n = cv.order.indexOf(el.dataset.k), m = n + (+el.dataset.d); if (m < 0 || m >= cv.order.length) return; [cv.order[n], cv.order[m]] = [cv.order[m], cv.order[n]]; touch(cv); render(); },
  analyze: () => { const o = ui.offre, cv = S.cvs.find(c => c.id === o.cvId); if (!o.text.trim() || !cv) { toast('Colle d’abord l’annonce'); return; } o.res = analyzeOffer(o.text, cv); render(); },
  addkw: (v, el) => { const o = ui.offre, cv = S.cvs.find(c => c.id === o.cvId), w = el.dataset.w; cv.data.competences.push({ id: uid(), on: true, nom: w.charAt(0).toUpperCase() + w.slice(1), niveau: 0 }); touch(cv); o.res = analyzeOffer(o.text, cv); toast(`« ${w} » ajouté aux compétences`); render(); },
  adapt: () => { const o = ui.offre, cv = S.cvs.find(c => c.id === o.cvId); if (!o.res) return; const c = adaptCV(cv, o.res, o); S.cvs.push(c); save(); ui.ed = c.id; ui.edTab = 'comp'; toast('Version adaptée créée'); render(); scrollTo(0, 0); },
  tojob: () => { const o = ui.offre, j = newJob(); j.poste = o.poste; j.entreprise = o.entreprise; j.cvId = o.cvId; j.offre = o.text; jobSheet(j); },
  newjob: () => jobSheet(newJob()),
  editjob: (v, el) => jobSheet(S.jobs.find(j => j.id === el.dataset.id)),
  savejob: () => { const j = { ...ui.jd }; if (!j.poste.trim() && !j.entreprise.trim()) { toast('Indique au moins le poste ou l’entreprise'); return; } const n = S.jobs.findIndex(x => x.id === j.id); if (j.statut === 'envoyee' && !j.relance && j.date) { const d = new Date(j.date); d.setDate(d.getDate() + 8); j.relance = d.toISOString().slice(0, 10); } if (n >= 0) S.jobs[n] = j; else { j.created = Date.now(); S.jobs.push(j); } save(); closeSheet(); ui.tab = ui.tab === 'offre' ? 'suivi' : ui.tab; render(); },
  deljob: (v, el) => { if (!confirm('Supprimer cette candidature ?')) return; S.jobs = S.jobs.filter(j => j.id !== el.dataset.id); save(); closeSheet(); render(); },
  jf: v => { ui.jobFilter = v; render(); },
  gcat: v => { ui.gcat = v; render(); },
  copyverb: (v, el) => { navigator.clipboard?.writeText(el.dataset.w); toast(`« ${el.dataset.w} » copié`); },
  cl: (v, el) => { const n = el.dataset.n; S.checks[n] = !S.checks[n]; save(); render(); },
  clreset: () => { S.checks = {}; save(); render(); },
  stab: v => { ui.stab = v; render(); },
  set: (v, el) => { S.set[el.dataset.k] = v; save(); applySettings(); render(); },
  checkupd: () => checkUpdate(),
  expjson: () => download('cv-en-poche-sauvegarde.json', JSON.stringify(S), 'application/json'),
  impjson: () => $('#fJson').click(),
  resetall: () => { if (!confirm('Effacer tous les CV, candidatures et réglages ?') || !confirm('Dernière confirmation : cette action est définitive.')) return; S = defaults(); saveNow(); ui.ed = null; applySettings(); render(); },
};
document.addEventListener('click', e => {
  if (e.target.id === 'sheetbg') { closeSheet(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = ACT[el.dataset.act]; if (!f) return;
  e.stopPropagation(); f(el.dataset.v, el);
});

function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function importJson(file) {
  try {
    const j = JSON.parse(await file.text()); if (!j || !Array.isArray(j.cvs)) throw 0;
    const merge = confirm('OK = fusionner avec tes données actuelles\nAnnuler = tout remplacer');
    if (merge) { const ids = new Set(S.cvs.map(c => c.id)); j.cvs.forEach(c => { if (!ids.has(c.id)) S.cvs.push(c); }); const jid = new Set(S.jobs.map(x => x.id)); (j.jobs || []).forEach(x => { if (!jid.has(x.id)) S.jobs.push(x); }); }
    else { const d = defaults(); S = { ...d, ...j, set: { ...d.set, ...(j.set || {}) } }; }
    saveNow(); applySettings(); render(); toast('Données importées');
  } catch { toast('Fichier non reconnu'); }
}

/* ============ réglages visuels ============ */
function applySettings() {
  const r = document.documentElement, s = S.set;
  if (s.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', s.theme);
  const dark = s.theme === 'dark' || (s.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  r.style.setProperty('--accent', dark ? `color-mix(in srgb, ${s.accent} 62%, #fff)` : s.accent);
  r.style.setProperty('--accent-ink', dark ? '#06122B' : '#fff');
  r.style.setProperty('--accent-soft', `color-mix(in srgb, ${s.accent} ${dark ? 26 : 14}%, var(--surface))`);
  document.body.classList.toggle('big', s.size === 'big'); document.body.classList.toggle('small', s.size === 'small');
  document.body.classList.toggle('filt-side', s.filt === 'side');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.accent);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applySettings);

applySettings();
render();
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { }));
