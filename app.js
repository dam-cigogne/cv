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
const ACCENTS = ['#1F5BD8', '#0E6B5C', '#7A3FB5', '#C2410C', '#B3372B', '#222B45', '#0F7C9D', '#8A6A12', '#2563EB', '#0891B2', '#059669', '#65A30D', '#CA8A04', '#EA580C', '#DC2626', '#DB2777', '#9333EA', '#4F46E5', '#475569', '#111111'];
const SHORT = { resume: 'Profil', domaines: 'Domaines', experiences: 'Expériences', formations: 'Formations', competences: 'Compétences', langues: 'Langues', certifs: 'Certifications', loisirs: 'Loisirs' };
const SECS = { resume: 'Profil', domaines: 'Domaines de compétences', experiences: 'Expériences professionnelles', formations: 'Formation', competences: 'Compétences', langues: 'Langues', certifs: 'Certifications', loisirs: 'Centres d’intérêt' };
const SIDE = ['competences', 'langues', 'loisirs'];
const STATUTS = [['aenvoyer', 'À envoyer'], ['envoyee', 'Envoyée'], ['entretien', 'Entretien'], ['offre', 'Offre reçue'], ['refus', 'Refus']];
const NIV = ['—', 'Notions', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'];

/* ============ version et historique des mises à jour ============ */
const APP_VERSION = '1.9.0';
const CHANGELOG = [
  { v: '1.9.0', d: '02/11/2026', l: ['Nouveau : aide IA facultative (Réglages > IA), désactivée par défaut', 'IA : écrire ou améliorer le profil, réécrire les puces d’une expérience', 'IA : lettre de motivation et préparation d’entretien depuis une annonce (onglet Offre)'] },
  { v: '1.8.4', d: '02/11/2026', l: ['Réglages > Métiers : aide automatique pour créer un métier (mots-clés et domaine suggérés d’après le nom, ton CV ou une annonce collée)'] },
  { v: '1.8.3', d: '02/11/2026', l: ['Guide : nouvelle rubrique « Onglet Offre » avec le fonctionnement détaillé (calcul des pourcentages, analyse d’annonce, version adaptée, suivi)', 'Onglet Offre : bouton « Comment ça marche ? » en haut'] },
  { v: '1.8.2', d: '01/11/2026', l: ['Agenda : bouton « Copier le code » pour envoyer les rendez-vous directement dans l’appli AgenDam (sans passer par le navigateur)', 'Rendez-vous envoyés plus complets : statut, lien de l’offre, entreprise, notes'] },
  { v: '1.8.1', d: '01/11/2026', l: ['Onglets du côté : largeur fixe, le texte est enfin visible en entier sur iPad', 'Téléphone en mode paysage : même disposition que l’iPad (options à gauche, CV à droite, barre du milieu réglable)'] },
  { v: '1.8.0', d: '01/11/2026', l: ['Offre : « Métiers qui te correspondent » — une centaine de métiers classés selon ton CV (aéronautique très détaillé), avec les mots-clés qui collent et ceux à acquérir, et un bouton pour créer un CV adapté', 'Réglages > Métiers : choisis un ou plusieurs domaines, masque des métiers, ajoute les tiens', 'iPad : les onglets ne cachent plus le CV (colonne dédiée à droite) et la barre du milieu se glisse de gauche à droite pour régler la taille', 'Onglets verticaux compatibles avec les anciens iPad et iPhone', 'Suivi : date, heure, durée et lieu des entretiens', 'Suivi > 📅 Agenda : envoi des entretiens et relances vers AgenDam par un lien, ou en fichier .ics pour Apple, Outlook, Google'] },
  { v: '1.7.0', d: '01/11/2026', l: ['Offre : tu choisis les sites d’emploi — masquer, supprimer, ajouter les tiens (colle l’adresse d’une recherche, l’appli la transforme), réinitialiser'] },
  { v: '1.6.0', d: '01/11/2026', l: ['Sauvegarde : l’export ouvre maintenant la feuille de partage sur iPhone et iPad (Enregistrer dans Fichiers, AirDrop, Mail…)', 'Offre : « Trouver des offres » ouvre les grands sites d’emploi avec ta recherche déjà remplie', 'Offre : bouton « Coller l’annonce » depuis le presse-papiers'] },
  { v: '1.5.1', d: '01/11/2026', l: ['Recadrage photo : le cadre ne s’écrase plus sur iPhone et iPad', 'Champs texte qui s’agrandissent tout seuls : les longs intitulés restent lisibles en entier'] },
  { v: '1.5.0', d: '01/11/2026', l: ['Photo : le recadrage marche maintenant sur iPhone et iPad (glisser, appui long, pincer pour zoomer)', 'Glisser-déposer des rubriques réparé sur iPhone et iPad', 'Mode démo : faux CV, vraies annonces, suivi complet — on le quitte d’un bouton et tes données reviennent', 'Guide du CV complété : mise en page, langues et loisirs, situations (reconversion, débutant, militaire, senior, anglais), lettre de motivation, entretien, LinkedIn', 'Suivi : bouton pour relire et analyser l’annonce d’une candidature', 'Réglages > Mises à jour : message « Application à jour · version X » (ou « Mise à jour disponible »), vérifié à chaque ouverture', 'Onglets du côté : un onglet par carte, comme Comptes en ligne'] },
  { v: '1.4.0', d: '01/11/2026', l: ['Écran partagé : le vrai CV à côté (ou au-dessus) des options, mis à jour en direct, poignée pour redimensionner', 'Mise en page : rubriques à déplacer par appui long, colonne principale ou latérale, taille par rubrique, deux colonnes sur tous les modèles', 'Option « Une seule page » : le texte se règle tout seul', 'Bouton ✨ Auto : choisit le meilleur modèle et la meilleure mise en page (annulable)', '20 couleurs de CV + couleur libre', 'Recadrage de la photo : appui long puis glisser pour la déplacer, curseur de zoom'] },
  { v: '1.3.0', d: '01/11/2026', l: ['Onglets verticaux sur le bord droit (comme Comptes en ligne) partout : Réglages, éditeur, Suivi, Guide', 'Mode « Sur le côté » activé par défaut'] },
  { v: '1.2.0', d: '01/11/2026', l: ['Version de l’appli et liste des mises à jour dans Réglages', 'Bouton « Vérifier les mises à jour »'] },
  { v: '1.1.0', d: '01/11/2026', l: ['Import PDF amélioré : nom sur plusieurs lignes, titre dans la colonne de droite, ville après le code postal, puces détectées par l’indentation, formations en liste, « Informations complémentaires » classées', 'Nouvelle rubrique « Domaines de compétences » (sous-titres et puces)', 'Mise à jour automatique : l’appli prend toujours la dernière version quand le réseau est là, et reste utilisable hors connexion'] },
  { v: '1.0.1', d: '01/11/2026', l: ['Correctif : import de PDF qui ne démarrait pas (fichiers de lecture mal placés)'] },
  { v: '1.0.0', d: '01/11/2026', l: ['Première version : Mes CV, éditeur, 5 modèles, export PDF', 'Import d’un PDF avec lecture automatique des rubriques', 'Offre : analyse d’annonce et version adaptée', 'Suivi des candidatures, Guide du CV, Réglages en onglets'] },
];
const hhmm = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
async function checkUpdate(silent) {
  ui.upd = { st: 'wait' }; if (!silent && ui.tab === 'regl') render();
  try {
    const t = await fetch('app.js', { cache: 'no-store' }).then(r => r.text());
    const m = t.match(/const APP_VERSION = '([\d.]+)'/);
    if (!m) throw new Error('version');
    if (m[1] !== APP_VERSION) {
      ui.upd = { st: 'new', v: m[1], t: hhmm() };
      if (!silent) { toast(`Mise à jour ${m[1]} trouvée : rechargement…`); applyUpdate(); } else toast(`Mise à jour ${m[1]} disponible (Réglages > Mises à jour)`);
    } else { ui.upd = { st: 'ok', v: APP_VERSION, t: hhmm() }; if (!silent) toast(`Application à jour : version ${APP_VERSION}`); }
  } catch { ui.upd = { st: 'err', t: hhmm() }; if (!silent) toast('Vérification impossible : es-tu hors connexion ?'); }
  if (ui.tab === 'regl' && !ui.ed) render();
}
async function applyUpdate() {
  try { for (const k of await caches.keys()) await caches.delete(k); } catch { }
  try { const rs = await navigator.serviceWorker?.getRegistrations(); for (const r of rs || []) await r.update(); } catch { }
  setTimeout(() => location.reload(), 700);
}

/* ============ état ============ */
const KEY = 'cvpoche.v1';
const defaults = () => ({ cvs: [], jobs: [], checks: {}, set: { theme: 'auto', accent: '#1F5BD8', size: 'normal', filt: 'side', tpl: 'classique', cvAccent: '#1F5BD8', font: 'sans' } });
let S = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.cvs) { const d = defaults(); return { ...d, ...s, set: { ...d.set, ...(s.set || {}) } }; } } catch { } return defaults(); })();
if (!S.set.sideV13) { S.set.sideV13 = 1; S.set.filt = 'side'; }
S.cvs.forEach(cv => { cv.col = cv.col || {}; cv.sz = cv.sz || {}; if (!cv.order.includes('domaines')) cv.order.splice(Math.max(0, cv.order.indexOf('resume')) + 1, 0, 'domaines'); if (cv.data.domaines == null) cv.data.domaines = ''; });
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 300); }
function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Stockage plein : exporte tes données (Réglages)'); } }
addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

const ui = { tab: 'cv', ed: null, edTab: 'infos', open: {}, jobFilter: 'all', gcat: 'essentiel', stab: 'app', offre: { text: '', cvId: '', entreprise: '', poste: '', res: null, mask: true, settitle: false }, prevZoom: 1, jd: null, imp: null, sheet: null };
ui.lh = 42; ui.lz = 1; ui.lw = 46; document.documentElement.style.setProperty('--lw', '46%'); ui.so = { q: '', l: '' };
const curCV = () => S.cvs.find(c => c.id === ui.ed);
const touch = cv => { cv.updated = Date.now(); save(); };

function newCV(name, data) {
  return {
    id: uid(), name: name || 'Mon CV', created: Date.now(), updated: Date.now(),
    tpl: S.set.tpl, accent: S.set.cvAccent, font: S.set.font, scale: 1, photo: true, one: false, cols: false, col: {}, sz: {},
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
  d.domaines = '## Communication\n- Plan éditorial et calendrier de publication\n- Gestion de communauté\n## Outils\n- Suite Adobe, Canva, Google Analytics';
  d.certifs = [{ id: uid(), on: true, nom: 'Certification Google Analytics', annee: '2022' }];
  d.experiences.push({ id: uid(), on: true, poste: 'Stagiaire communication', entreprise: 'Office du tourisme', lieu: 'Annecy', debut: '2018', fin: '2018', actuel: false, desc: '- Animation des réseaux sociaux\n- Reportages photo' });
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

const isMod = cv => cv.tpl === 'moderne';
const twoCol = cv => isMod(cv) || !!cv.cols;
const colOf = (cv, k) => twoCol(cv) ? ((cv.col && cv.col[k]) || (SIDE.includes(k) ? 'side' : 'main')) : 'main';
const szOf = (cv, k) => (cv.sz && cv.sz[k]) || 1;

function buildParts(cv, sc) {
  sc = sc || cv.scale || 1;
  const i = cv.data.identity, mod = isMod(cv);
  const ct = contacts(cv);
  const bs = k => { const z = szOf(cv, k); return z !== 1 ? ` style="--s:${(sc * z).toFixed(3)}"` : ''; };
  const nameBlock = `<h1 class="nm">${esc(i.nom || 'Prénom Nom')}</h1>${i.titre ? `<div class="ti">${esc(i.titre)}</div>` : ''}`;
  let head;
  const ctRow = `<div class="ct">${ct.map(c => `<span>${esc(c)}</span>`).join('')}</div>`;
  if (mod) head = `<div class="blk">${nameBlock}</div>`;
  else if (cv.tpl === 'bandeau') head = `<div class="blk"><div class="band">${photoHtml(cv)}<div>${nameBlock}${ctRow}</div></div></div>`;
  else if (cv.tpl === 'elegant') head = `<div class="blk"><div class="hd">${photoHtml(cv)}${nameBlock}${ctRow}</div></div>`;
  else head = `<div class="blk"><div class="hd">${photoHtml(cv)}<div>${nameBlock}${ctRow}</div></div></div>`;

  const blocks = [head];
  const sideHtml = [];
  for (const k of cv.order) {
    if (cv.show[k] === false) continue;
    const title = `<div class="st">${esc(SECS[k])}</div>`;
    if (colOf(cv, k) === 'side') {
      const s = (k === 'experiences' || k === 'formations') ? secItems(cv, k).join('') : k === 'domaines' ? domGroups(cv).join('') : secSimple(cv, k);
      if (s) sideHtml.push(`<div class="blk"${bs(k)}>${title}${s}</div>`);
      continue;
    }
    if (k === 'experiences' || k === 'formations' || k === 'domaines') {
      const its = k === 'domaines' ? domGroups(cv) : secItems(cv, k); if (!its.length) continue;
      blocks.push(`<div class="blk"${bs(k)}>${title}${its[0]}</div>`);
      for (let n = 1; n < its.length; n++) blocks.push(`<div class="blk"${bs(k)}>${its[n]}</div>`);
    } else { const s = secSimple(cv, k); if (s) blocks.push(`<div class="blk"${bs(k)}>${title}${s}</div>`); }
  }
  let sb = null;
  if (mod) {
    const cts = `<div class="blk"><div class="st">Contact</div><div class="cts">${ct.map(c => `<div>${esc(c)}</div>`).join('')}</div></div>`;
    sb = photoHtml(cv) + (ct.length ? cts : '') + sideHtml.join('');
  } else if (cv.cols && sideHtml.length) sb = sideHtml.join('');
  return { blocks, sb };
}

let measureEl;
const memo = new Map();
function buildPages(cv, sc, tight) {
  const { blocks, sb } = buildParts(cv, sc), mod = isMod(cv);
  const cls = `pg t-${cv.tpl}${cv.font === 'serif' ? ' serif' : ''}${tight ? ' tight' : ''}${sb != null && !mod ? ' lt' : ''}`;
  const style = `--a:${cv.accent};--s:${sc}`;
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
  const pages = groups.map((g, n) => `<div class="${cls}" style="${style}">${sb != null && (mod || n === 0) ? `<aside class="sb">${n === 0 ? sb : ''}</aside>` : ''}<main class="mn">${g.join('')}</main></div>`);
  measureEl.innerHTML = '';
  return { pages, over };
}
function renderPages(cv, nocache) {
  const key = [cv.id, cv.updated, cv.tpl, cv.one ? 1 : 0, cv.cols ? 1 : 0].join(':');
  if (!nocache && memo.has(key)) return memo.get(key);
  const base = cv.scale || 1; let res;
  if (!cv.one) res = { ...buildPages(cv, base, false), sc: base, fit: true };
  else {
    const tries = [];
    for (let s = base; s >= 0.84; s -= 0.02) tries.push([Math.round(s * 100) / 100, false]);
    for (let s = Math.min(base, 0.92); s >= 0.7; s -= 0.02) tries.push([Math.round(s * 100) / 100, true]);
    for (const [s, t] of tries) {
      res = { ...buildPages(cv, s, t), sc: s, tight: t };
      res.fit = res.pages.length === 1 && !res.over;
      if (res.fit) break;
    }
  }
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
  { c: 'offre', t: 'L’onglet Offre : vue d’ensemble', p: 'Cet onglet t’aide à trouver des postes, à comparer une annonce avec ton CV et à préparer une candidature. Tout est calculé sur ton appareil : ton CV et les annonces ne sont envoyés nulle part. L’appli ne se connecte pas aux sites d’emploi : tu ouvres l’annonce toi-même, puis tu la colles ici.', l: ['1. Métiers qui te correspondent : des idées de métiers classées d’après ton CV', '2. Trouver des offres : un site d’emploi s’ouvre avec ta recherche déjà remplie', '3. Adapter son CV à une annonce : tu colles l’annonce, l’appli la compare à ton CV', '4. Créer une version adaptée du CV, puis ajouter la candidature au Suivi'] },
  { c: 'offre', t: 'Métiers qui te correspondent', p: 'L’appli connaît une liste de métiers, chacun avec ses mots-clés typiques. Elle cherche ces mots dans tout ton CV : titre, profil, domaines, expériences, formations, compétences, langues et loisirs.', l: ['Un métier n’apparaît que si au moins 2 de ses mots-clés sont trouvés dans ton CV', 'Plus ton CV est détaillé, plus le classement est juste : un CV vide ne donne presque rien', 'Le CV utilisé est indiqué en haut de la carte (le premier de ta liste)', 'Dans Réglages > Métiers, choisis un ou plusieurs domaines : les métiers de ces domaines passent devant', '« Montrer uniquement ces domaines » masque tous les autres métiers'] },
  { c: 'offre', t: 'Lire les pourcentages', p: 'Le pourcentage mesure la part des mots-clés du métier que l’on retrouve dans ton CV. 100 % veut dire « ton CV parle déjà de tout ce qui caractérise ce métier », pas « tu seras embauché ».', l: ['Dans ton CV : les mots-clés du métier déjà présents chez toi', 'À mettre en avant ou acquérir : les mots-clés absents. Si tu maîtrises le sujet, ajoute-les à ton CV ; sinon, c’est une piste de formation', 'Les domaines choisis donnent un petit bonus (+15 %), les autres une petite réduction (−20 %)', 'Un score moyen n’est pas un mauvais signe : il peut simplement montrer que ton CV n’emploie pas les mêmes mots que le métier'] },
  { c: 'offre', t: 'Les boutons d’un métier', l: ['Chercher des offres : met le métier dans la recherche « Trouver des offres » juste en dessous', 'CV pour ce métier : crée une copie de ton CV avec ce métier en titre, à compléter (profil, compétences)', '✕ : masque ce métier de la liste', 'Choisir les domaines : ouvre Réglages > Métiers'] },
  { c: 'offre', t: 'Trouver des offres', p: 'Choisis un métier et une ville : tu touches un site (France Travail, Indeed…) et il s’ouvre avec ta recherche déjà faite.', l: ['« Gérer les sites » : ajoute tes sites favoris ou retire ceux dont tu ne te sers pas', 'Ouvre l’annonce qui t’intéresse et copie tout son texte', 'Reviens dans l’appli : « Coller l’annonce » remplit la zone de texte avec ce que tu as copié', 'Si le collage automatique ne marche pas, maintiens le doigt dans la zone et choisis « Coller »'] },
  { c: 'offre', t: 'Analyser une annonce', p: 'Avec « Analyser », l’appli relève les 28 mots-clés les plus importants de l’annonce (ceux qui reviennent le plus souvent, hors mots courants) et regarde lesquels sont dans le CV choisi.', l: ['Le pourcentage = part des mots-clés de l’annonce présents dans ton CV (un mot répété compte plus, jusqu’à 4 fois)', 'Déjà présents : à garder en évidence', 'Absents de ton CV : touche un mot pour l’ajouter aux compétences', 'N’ajoute un mot que si tu maîtrises vraiment le sujet : tu devras en parler en entretien', 'Choisis bien le CV à comparer : le score change d’un CV à l’autre', 'Ce score est une aide, pas un verdict : lis aussi l’annonce toi-même (expérience demandée, lieu, contrat)'] },
  { c: 'offre', t: 'Créer une version adaptée', p: 'Le bouton copie ton CV et remonte en premier ce qui répond à l’annonce. Ton CV d’origine n’est jamais modifié.', l: ['Les compétences qui correspondent à l’annonce passent en tête', 'Dans chaque expérience, les puces qui parlent de l’annonce passent en premier', '« Masquer les compétences sans rapport » : cache celles qui ne servent pas (seulement si ton CV en a plus de 10 et qu’au moins 5 correspondent). Tu peux les réafficher ensuite', '« Mettre le poste visé en titre » : le titre du CV devient le poste que tu as saisi', 'Le CV créé porte le nom de l’entreprise ou du poste : retrouve-le dans Mes CV et relis-le avant l’envoi'] },
  { c: 'offre', t: 'Après : le suivi des candidatures', p: '« Ajouter au suivi » enregistre la candidature (poste, entreprise, CV utilisé, texte de l’annonce) dans l’onglet Suivi.', l: ['Suivi : statut (à envoyer, envoyée, entretien, offre, refus), date d’envoi, date de relance, notes', 'Les relances dépassées ou du jour sont signalées', 'Ajoute la date, l’heure et le lieu d’un entretien dans la fiche : il apparaît dans Agenda', 'Agenda : « Copier le code pour AgenDam » envoie les rendez-vous vers ton appli AgenDam, ou exporte un fichier .ics (Apple, Google, Outlook)'] },
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
  { c: 'plus', t: 'Langues', l: ['Utilise l’échelle européenne A1 à C2, ou : notions, intermédiaire, courant, bilingue', 'Ajoute un test si tu en as un : TOEIC, TOEFL, IELTS, DELF, DELE, Goethe', 'Ne surévalue pas : l’entretien peut se tenir dans cette langue', 'La langue maternelle se précise seulement si elle n’est pas évidente'] },
  { c: 'plus', t: 'Centres d’intérêt', p: 'Court (3 à 5 éléments), concret, et si possible utile : il montre une personnalité, pas un remplissage.', ba: [['Lecture, cinéma, voyages.', 'Football en club (capitaine depuis 3 ans), bénévole aux Restos du Cœur, randonnée en montagne.']] },
  { c: 'plus', t: 'Certifications, permis, habilitations', l: ['Section dédiée avec intitulé, organisme et année', 'Permis B si le poste demande de se déplacer', 'Habilitations utiles au poste : SST, CACES, habilitation électrique, secourisme, sûreté', 'Retire ce qui est périmé ou sans rapport', 'Bénévolat et projets personnels : 1 ou 2 lignes avec un résultat'] },
  { c: 'plus', t: 'Références', l: ['« Références disponibles sur demande » est inutile : on te les demandera', 'Prépare 2 personnes prêtes à répondre (ancien manager, tuteur) et préviens-les', 'Ne donne leurs coordonnées qu’à la demande du recruteur'] },
  { c: 'forme', t: 'Mise en page lisible', l: ['Marges d’au moins 1,5 cm, texte entre 10 et 11 pt', 'Une ou deux polices maximum, une seule couleur d’accent', 'Titres de section bien visibles, gras réservé aux postes et diplômes', 'Espaces réguliers entre les blocs : le CV doit respirer', 'Exporte en PDF : la mise en page ne bouge pas chez le recruteur'] },
  { c: 'forme', t: 'Longueur et densité', l: ['1 page jusqu’à 10 ans d’expérience, 2 pages au-delà', 'Une 2e page doit être au moins à moitié remplie, sinon resserre', 'Jamais de page 3', 'Option « Une seule page » : l’appli règle le texte pour toi', 'Supprime ce qui ne sert pas le poste visé'] },
  { c: 'forme', t: 'Cohérence', l: ['Un seul format de dates partout : 09/2021 – 03/2024', 'Temps du passé pour les postes terminés, présent pour le poste actuel', 'Même ponctuation et même style de puces', 'Même ordre dans chaque expérience : poste, entreprise, lieu, dates'] },
  { c: 'cas', t: 'Débutant, stage, alternance', l: ['Formation en premier, avec spécialité et projets marquants', 'Alternance : précise le rythme, la durée et les missions', 'Jobs d’été, bénévolat, associations : montre ta fiabilité', 'Indique ta disponibilité : dates de début, durée du stage'] },
  { c: 'cas', t: 'Reconversion', l: ['Titre tourné vers le métier visé, pas vers l’ancien', 'Profil : explique le lien entre ton parcours et ce nouveau métier', 'Mets les compétences transférables en tête', 'Formation récente avant les expériences si elle est parlante', 'Condense les anciens postes qui n’ont pas de rapport'] },
  { c: 'cas', t: 'Armée, police, fonction publique vers le privé', p: 'Le recruteur ne connaît pas toujours les grades, sigles et unités : traduis tout en compétences civiles.', l: ['« Chef de section » devient : encadrement de 25 personnes, planification, gestion de budget et de matériel', 'Remplace les sigles par des mots clairs, ou explique-les entre parenthèses', 'Décris des missions et des résultats : sécurité, logistique, formation, gestion de crise, relation avec des partenaires', 'Mets en avant diplômes, brevets, habilitations et formations reconnus dans le civil', 'Titre sous ton nom : le poste civil visé', 'Les armées proposent un accompagnement à la reconversion (Défense Mobilité) : renseigne-toi auprès de ton unité'] },
  { c: 'cas', t: 'Plus de 15 ans d’expérience', l: ['Détaille surtout les 10 à 15 dernières années', 'Résume le début de carrière en une ligne par poste', 'Mets des réalisations chiffrées et des responsabilités (équipe, budget)', 'Le CV peut aller sur 2 pages', 'Garde des compétences à jour : outils récents, formations suivies'] },
  { c: 'cas', t: 'CV en anglais', l: ['Traduis les titres : Work experience, Education, Skills, Languages', 'Pas de photo, d’âge ni de situation familiale dans les pays anglo-saxons', 'Adapte les diplômes : explique-les (ex. « Licence = Bachelor’s degree »)', 'Verbes d’action au passé pour les postes terminés', 'Une page est la norme aux États-Unis, une à deux au Royaume-Uni'] },
  { c: 'lettre', t: 'La lettre de motivation', p: 'Une page maximum, 150 à 250 mots, écrite pour cette entreprise et pas une autre.', l: ['Paragraphe 1 : pourquoi cette entreprise et ce poste', 'Paragraphe 2 : pourquoi toi, avec 2 exemples chiffrés tirés de ton CV', 'Paragraphe 3 : ce que tu peux leur apporter, ta disponibilité, la demande d’entretien', 'Adresse-la à une personne si tu as son nom', 'Ne recopie pas ton CV : complète-le', 'Termine par une formule de politesse simple'] },
  { c: 'lettre', t: 'Le mail de candidature', l: ['Objet clair : Candidature – Intitulé du poste – Prénom Nom', 'Corps en 3 à 5 lignes : poste visé, ce que tu apportes, pièces jointes', 'CV en PDF nommé Prenom_Nom_CV.pdf', 'Signature avec téléphone et lien LinkedIn', 'Relis et vérifie le destinataire avant d’envoyer'] },
  { c: 'entretien', t: 'Préparer l’entretien', l: ['Relis l’offre et ton CV : tu dois pouvoir expliquer chaque ligne', 'Renseigne-toi sur l’entreprise : activité, clients, actualité', 'Prépare 3 réalisations à raconter avec la méthode STAR', 'Prépare 3 questions à poser : équipe, missions, évolution', 'Vérifie le trajet, l’heure et la tenue la veille'] },
  { c: 'entretien', t: 'La méthode STAR', p: 'Pour répondre à « Parlez-moi d’une situation où… » en 1 à 2 minutes.', l: ['Situation : le contexte en une phrase', 'Tâche : ton rôle et l’objectif', 'Action : ce que tu as fait, toi, étape par étape', 'Résultat : le chiffre ou l’effet concret obtenu'] },
  { c: 'entretien', t: 'Questions classiques', l: ['« Parlez-moi de vous » : 1 à 2 minutes : présent, passé, ce que tu cherches', '« Pourquoi nous ? » : cite des éléments précis de l’entreprise', '« Points forts, points faibles » : un exemple vrai, et ce que tu fais pour progresser', '« Prétentions salariales » : donne une fourchette basée sur le marché du poste', '« Pourquoi quitter votre poste ? » : reste positif, parle de ce que tu cherches', 'Après : un mail de remerciement sous 24 h'] },
  { c: 'web', t: 'LinkedIn', l: ['Photo sobre, titre qui décrit ce que tu fais et pour qui, pas seulement ton poste', 'Résumé court avec les mots-clés de ton métier', 'Expériences cohérentes avec ton CV, avec des réalisations', 'Compétences et recommandations : demande-en 2 ou 3', 'URL personnalisée à mettre dans l’en-tête du CV'] },
  { c: 'web', t: 'Image en ligne et recherche d’emploi', l: ['Cherche ton nom sur un moteur de recherche : les recruteurs le font', 'Passe en privé les profils personnels qui ne servent pas', 'Adresse mail sérieuse : prenom.nom@…', 'Combine annonces (France Travail, Indeed, Apec, LinkedIn), candidatures spontanées et réseau', 'Crée des alertes, parle de ta recherche autour de toi : beaucoup de postes se trouvent par recommandation'] },
  { c: 'ats', t: 'Passer les filtres automatiques (ATS)', p: 'Beaucoup d’entreprises trient les CV avec un logiciel avant lecture humaine.', l: ['Modèle simple, polices standards, pas de texte dans des images', 'Titres de section classiques : Expériences, Formation, Compétences', 'Reprends les mots-clés de l’offre tels quels (outil Offre)', 'Envoie un PDF avec du texte sélectionnable, pas une capture', 'Nomme le fichier : Prenom_Nom_CV.pdf'] },
  { c: 'erreurs', t: 'Erreurs fréquentes', l: ['Fautes d’orthographe : relis à voix haute, fais relire', 'Mots creux : dynamique, motivé, sérieux', 'Trop long, trop dense, trop de couleurs', 'Dates incohérentes, infos périmées, liens cassés', 'Mentir ou gonfler : ça se vérifie, et ça se paie en entretien'] },
  { c: 'candidature', t: 'Adapter son CV à chaque offre', l: ['Relis l’annonce et repère 5 à 8 mots-clés', 'Remonte les compétences et puces qui y répondent', 'Adapte le titre sous ton nom au poste visé', 'L’onglet Offre fait ce travail : colle l’annonce, regarde le score, crée une version'] },
  { c: 'candidature', t: 'Relancer', l: ['Compte 7 à 10 jours après l’envoi', 'Message court, poli, qui rappelle le poste visé', 'Note la date de relance dans l’onglet Suivi'] },
];
const GCATS = [['essentiel', 'Essentiel'], ['offre', 'Onglet Offre'], ['infos', 'En-tête'], ['profil', 'Profil'], ['exp', 'Expériences'], ['formation', 'Formation'], ['comp', 'Compétences'], ['plus', 'Langues, loisirs'], ['forme', 'Mise en page'], ['cas', 'Situations'], ['ats', 'Filtres ATS'], ['erreurs', 'Erreurs'], ['candidature', 'Candidature'], ['lettre', 'Lettre, mail'], ['entretien', 'Entretien'], ['web', 'LinkedIn, web']];
const CHECKLIST = ['Lettre ou mail personnalisé pour cette entreprise', 'Orthographe relue (et relue par quelqu’un d’autre)', 'Titre adapté au poste visé', 'Chiffres dans les expériences récentes', 'Mots-clés de l’offre présents', 'Email et téléphone corrects', '1 page (2 maximum)', 'PDF lisible, texte sélectionnable', 'Nom du fichier : Prenom_Nom_CV.pdf'];

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
function wrapVt() {
  document.querySelectorAll('.vt button').forEach(b => { if (!(b.firstElementChild && b.firstElementChild.classList.contains('vl'))) { const sp = document.createElement('span'); sp.className = 'vl'; while (b.firstChild) sp.appendChild(b.firstChild); b.appendChild(sp); } });
}
function render() {
  const y = window.scrollY, fs = $('.edform')?.scrollTop || 0, ls = $('#lps')?.scrollTop || 0;
  renderNav(); document.body.classList.toggle('demo', !!S.demo);
  let db = $('#demobar'); if (S.demo) { if (!db) { db = document.createElement('div'); db.id = 'demobar'; document.body.appendChild(db); } db.innerHTML = '<span>Mode démo · données fictives</span><button data-act="demoquit">Quitter la démo</button>'; } else if (db) db.remove();
  app.innerHTML = ui.ed && curCV() ? viewEditor(curCV()) : ({ cv: tabCV, offre: tabOffre, suivi: tabSuivi, guide: tabGuide, regl: tabRegl }[ui.tab])();
  window.scrollTo(0, y);
  if (ui.ed && curCV()) {
    const f = $('.edform'); if (f && !ui.resetForm) f.scrollTop = fs; ui.resetForm = 0;
    updLive(); const l = $('#lps'); if (l) l.scrollTop = ls; growAll();
  }
  wrapVt();
}
/* ============ aide IA (facultative) ============ */
const AI = () => S.set.ai || (S.set.ai = { on: false, url: '', token: '' });
const aiOn = () => !!(AI().on && AI().url);
function cvPlain(cv) {
  const d = cv.data, L = [];
  const id = d.identity; if (id.titre) L.push('Titre : ' + id.titre);
  if (d.resume) L.push('Profil : ' + d.resume);
  act(d.experiences).forEach(e => L.push(`Expérience : ${e.poste || ''} – ${e.entreprise || ''} (${[e.debut, e.actuel ? 'aujourd’hui' : e.fin].filter(Boolean).join(' → ')})\n${e.desc || ''}`));
  act(d.formations).forEach(f => L.push(`Formation : ${f.diplome || ''} – ${f.ecole || ''}`));
  const c = act(d.competences).map(x => x.nom).filter(Boolean); if (c.length) L.push('Compétences : ' + c.join(', '));
  const l = act(d.langues).map(x => x.nom).filter(Boolean); if (l.length) L.push('Langues : ' + l.join(', '));
  return L.join('\n').slice(0, 5500);
}
async function aiCall(task, input) {
  const c = AI();
  if (!aiOn()) { toast('Active l’IA dans Réglages > IA'); return null; }
  if (ui.aiBusy) return null;
  ui.aiBusy = true; toast('IA en cours… (quelques secondes)');
  try {
    const r = await fetch(c.url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-token': c.token || '' }, body: JSON.stringify({ task, input }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.text) { toast(j.error || 'L’IA ne répond pas (code ' + r.status + ')'); return null; }
    return j;
  } catch (e) { toast('Connexion impossible : vérifie l’adresse du relais'); return null; }
  finally { ui.aiBusy = false; }
}
function aiSheet(title, text, apply) {
  ui.aiRes = { apply };
  openSheet(`<div class="sh"><h2>${esc(title)}</h2><button class="ib" data-act="closesheet">✕</button></div>
   <div class="small muted">Relis et corrige avant d’utiliser : l’IA peut se tromper et ne connaît que ton CV.</div>
   <textarea id="aiTxt" rows="12">${esc(text)}</textarea>
   <div class="row2">${apply ? `<button class="btn" data-act="aiuse" style="flex:1">Utiliser ce texte</button>` : ''}<button class="btn ghost" data-act="aicopy" style="flex:1">Copier</button></div>`);
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
    <div class="row2"><button class="btn solid" data-act="importpdf">Importer un PDF</button><button class="btn" data-act="newcv">Nouveau CV</button></div>${S.demo ? '' : '<button class="btn ghost sm" data-act="demo" style="margin-top:10px">Essayer le mode démo</button>'}</section>
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
  const undo = ui.undo && ui.undo.id === cv.id, side = S.set.filt === 'side';
  const tabsHtml = `<div class="scrollx vt${side ? ' edrail' : ''}">${ET.map(([k, l]) => `<button class="${ui.edTab === k ? 'on' : ''}" data-act="edtab" data-v="${k}">${l}</button>`).join('')}</div>`;
  return `<div class="edsplit" style="--lh:${ui.lh}vh">
   <div class="edhead"><div class="edtitle"><button class="ib" data-act="back" aria-label="Retour">←</button><input data-p="name" value="${esc(cv.name)}" aria-label="Nom du CV"><button class="ib" data-act="cvmenu" data-id="${cv.id}" aria-label="Plus">⋯</button></div>
   ${side ? '' : tabsHtml}</div>
   <div class="livepane"><div class="lp-bar"><span id="lpinfo"></span><span class="lpb"><button class="btn sm" data-act="auto">✨ Auto</button>${undo ? '<button class="btn sm ghost" data-act="undoauto">↶ Annuler</button>' : ''}<button class="ib sm" data-act="lzoom" data-d="-1" aria-label="Réduire">−</button><button class="ib sm" data-act="lzoom" data-d="1" aria-label="Agrandir">+</button><button class="ib sm" data-act="prev" data-id="${cv.id}" aria-label="Plein écran">⤢</button></span></div><div class="lp-s" id="lps"></div></div>
   <div class="handle" aria-label="Redimensionner"><i></i></div>
   <div class="edform">${cv.review ? `<div class="banner"><span>CV importé : vérifie chaque rubrique, la lecture automatique peut se tromper. Le texte non classé est dans « Plus ».</span><button class="btn sm ghost" data-act="dismiss">OK</button></div>` : ''}${body}</div><div class="vhandle" aria-label="Régler la largeur"><i></i></div>${side ? tabsHtml : ''}</div>
   <div class="edbar"><div class="in"><button class="btn" data-act="prev" data-id="${cv.id}">Plein écran et PDF</button></div></div>`;
}
const fld = (cv, label, path, ph = '', type = 'text') => { const v = path.split('.').reduce((o, k) => o?.[k], cv); return type === 'text' ? `<label class="f">${label}<textarea class="ag" rows="1" data-p="${path}" placeholder="${esc(ph)}" autocomplete="off">${esc(v)}</textarea></label>` : `<label class="f">${label}<input type="${type}" data-p="${path}" value="${esc(v)}" placeholder="${esc(ph)}" autocomplete="off"></label>`; };
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
   <label class="f"><textarea data-p="data.resume" rows="5">${esc(cv.data.resume)}</textarea></label>${aiOn() ? '<button class="btn sm ghost" data-act="aiprofil">✨ Écrire ou améliorer avec l’IA</button>' : ''}</div>`;
}
function itemTools(l, it, idx, len) {
  return `<div class="tools"><label class="swrow" style="gap:8px"><span class="small">Inclure dans ce CV</span><span class="sw"><input type="checkbox" data-l="${l}" data-i="${it.id}" data-k="on" data-r="1" ${it.on !== false ? 'checked' : ''}><i></i></span></label>
   <div class="row2"><button class="ib sm" data-act="mv" data-l="${l}" data-i="${it.id}" data-d="-1" ${idx === 0 ? 'disabled' : ''}>↑</button><button class="ib sm" data-act="mv" data-l="${l}" data-i="${it.id}" data-d="1" ${idx === len - 1 ? 'disabled' : ''}>↓</button><button class="ib sm" data-act="delitem" data-l="${l}" data-i="${it.id}" aria-label="Supprimer">🗑</button></div></div>`;
}
const li = (l, it, k, label, ph = '', type = 'text') => type === 'text' ? `<label class="f">${label}<textarea class="ag" rows="1" data-l="${l}" data-i="${it.id}" data-k="${k}" placeholder="${esc(ph)}">${esc(it[k])}</textarea></label>` : `<label class="f">${label}<input type="${type}" data-l="${l}" data-i="${it.id}" data-k="${k}" value="${esc(it[k])}" placeholder="${esc(ph)}"></label>`;
const grow = el => { el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; };
const growAll = () => document.querySelectorAll('.edform textarea').forEach(el => { if (el.offsetParent !== null) grow(el); });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList?.contains('ag')) { e.preventDefault(); e.target.blur(); } });
document.addEventListener('input', e => { if (e.target.matches?.('.edform textarea')) grow(e.target); });
function edParcours(cv) {
  const L = cv.data.experiences;
  return `<div class="small muted">Désactive une expérience pour l’exclure de ce CV sans la perdre.</div>
  ${L.map((e, n) => `<details class="item ${e.on === false ? 'off' : ''}" data-d="${e.id}" ${ui.open[e.id] ? 'open' : ''}><summary><div class="st"><b>${esc(e.poste || 'Nouvelle expérience')}</b><span>${esc([e.entreprise, dateRange(e.debut, e.fin, e.actuel)].filter(Boolean).join(' · '))}</span></div>${e.on === false ? '<span class="chip">masquée</span>' : ''}<span class="muted">▾</span></summary>
   <div class="body">${li('experiences', e, 'poste', 'Poste', 'Ex. Responsable d’équipe')}${li('experiences', e, 'entreprise', 'Entreprise', '')}${li('experiences', e, 'lieu', 'Lieu', '')}
   <div class="grid2">${li('experiences', e, 'debut', 'Début', 'MM/AAAA')}${e.actuel ? '<div></div>' : li('experiences', e, 'fin', 'Fin', 'MM/AAAA')}</div>
   <label class="swrow"><span>Poste actuel</span><span class="sw"><input type="checkbox" data-l="experiences" data-i="${e.id}" data-k="actuel" data-r="1" ${e.actuel ? 'checked' : ''}><i></i></span></label>
   <label class="f">Missions et résultats (une puce par ligne, commence par « - »)<textarea rows="6" data-l="experiences" data-i="${e.id}" data-k="desc">${esc(e.desc)}</textarea></label>${aiOn() ? `<button class="btn sm ghost" data-act="aipuces" data-i="${e.id}">✨ Améliorer les puces avec l’IA</button>` : ''}
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
function layItem(cv, k, two) {
  const z = szOf(cv, k);
  return `<div class="dragc${cv.show[k] === false ? ' off' : ''}" data-k="${k}"><span class="gp">⋮⋮</span><span class="dn">${SHORT[k] || SECS[k]}${z !== 1 ? ` <small>${Math.round(z * 100)} %</small>` : ''}</span>
   <button class="ib sm" data-act="szm" data-k="${k}" data-d="-1" aria-label="Plus petit">A−</button><button class="ib sm" data-act="szm" data-k="${k}" data-d="1" aria-label="Plus grand">A+</button>
   <button class="ib sm" data-act="eye" data-k="${k}" aria-label="Afficher ou masquer">${cv.show[k] === false ? '🚫' : '👁'}</button>${two ? `<button class="ib sm" data-act="colmv" data-k="${k}" aria-label="Changer de colonne">⇄</button>` : ''}</div>`;
}
function layCard(cv) {
  const two = twoCol(cv);
  const zone = (id, label, keys) => `<div class="dropz" data-z="${id}"><div class="small muted zl">${label}</div>${keys.map(k => layItem(cv, k, two)).join('')}</div>`;
  const main = cv.order.filter(k => colOf(cv, k) === 'main'), side = cv.order.filter(k => colOf(cv, k) === 'side');
  return `<div class="card"><h2>Mise en page</h2><div class="small muted">Appui long sur une rubrique puis glisse pour la déplacer${two ? ' (d’une colonne à l’autre aussi)' : ''}. A− / A+ : taille de la rubrique. 👁 : afficher ou masquer.</div>
   ${two ? zone('main', 'Colonne principale', main) + zone('side', 'Colonne latérale', side) : zone('main', 'Ordre des rubriques', main)}</div>`;
}
function edStyle(cv) {
  return `<div class="card"><h2>Modèle</h2><div class="tplgrid">${TPLS.map(([k, n]) => `<button class="${cv.tpl === k ? 'on' : ''}" data-act="tpl" data-v="${k}">${thumb({ ...cv, tpl: k, updated: cv.updated }, 84, true)}<span>${n}</span></button>`).join('')}</div>
   ${cv.tpl !== 'moderne' ? `<label class="swrow"><span>Deux colonnes (colonne latérale)</span><span class="sw"><input type="checkbox" data-p="cols" data-r="1" ${cv.cols ? 'checked' : ''}><i></i></span></label>` : ''}
   <label class="swrow"><span>Une seule page (réglage automatique)</span><span class="sw"><input type="checkbox" data-p="one" data-r="1" ${cv.one ? 'checked' : ''}><i></i></span></label>
   <button class="btn ghost" data-act="auto">✨ Auto : meilleur modèle et mise en page</button></div>
  <div class="card"><h2>Couleur</h2><div class="pal">${ACCENTS.map(c => `<button class="${cv.accent === c ? 'on' : ''}" style="background:${c}" data-act="cvacc" data-v="${c}" aria-label="${c}"></button>`).join('')}<label class="cpick" aria-label="Couleur libre"><input type="color" data-p="accent" value="${/^#[0-9a-f]{6}$/i.test(cv.accent) ? cv.accent : '#1F5BD8'}"><span>＋</span></label></div></div>
  <div class="card"><h2>Texte</h2><div class="seg"><button class="${cv.font !== 'serif' ? 'on' : ''}" data-act="cvfont" data-v="sans">Sans empattement</button><button class="${cv.font === 'serif' ? 'on' : ''}" data-act="cvfont" data-v="serif">Avec empattement</button></div>
   <label class="f">Taille du texte ${cv.one ? '<span class="muted small">(réduite automatiquement si besoin)</span>' : ''}<input type="range" min="0.82" max="1.15" step="0.01" data-p="scale" data-num="1" value="${cv.scale || 1}"></label>
   <label class="swrow"><span>Afficher la photo</span><span class="sw"><input type="checkbox" data-p="photo" ${cv.photo !== false ? 'checked' : ''}><i></i></span></label>
   ${cv.data.identity.photo ? '<button class="btn ghost sm" data-act="crop">Recadrer la photo</button>' : ''}</div>
  ${layCard(cv)}`;
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
  const cv0 = S.cvs.find(c => c.id === o.cvId) || S.cvs[0], so = ui.so;
  if (!so.q && !so.init) { so.init = 1; so.q = cv0?.data.identity.titre || ''; so.l = cv0?.data.identity.ville || ''; }
  const mj = matchJobs(cv0), nShow = ui.mjAll ? 20 : 8, dn = (S.set.doms || []).map(k => (DOMS.find(x => x[0] === k) || [, ''])[1]).filter(Boolean);
  return `<div class="wrap"><div class="top"><span class="app">Offre</span></div>
  <div class="card"><div class="rowline" style="justify-content:space-between"><h2>Métiers qui te correspondent</h2><button class="btn sm ghost" data-act="offhelp">Comment ça marche ?</button></div><div class="small muted">Classés d’après le CV « ${esc(cv0?.name || '')} ». ${dn.length ? 'Domaines choisis : ' + esc(dn.join(', ')) + '.' : 'Aucun domaine choisi : tous les métiers sont classés.'} <button class="btn sm ghost" data-act="gomet" style="margin-top:6px">Choisir les domaines</button></div>
   ${mj.length ? mj.slice(0, nShow).map(m => `<div class="mj"><div class="l1"><b>${esc(m.n)}</b><span class="chip ${m.pct >= 70 ? 'ok' : ''}">${m.pct} %</span></div>
    <div class="bar"><i style="width:${m.pct}%"></i></div>
    <div class="small"><span class="muted">Dans ton CV :</span> ${m.ok.slice(0, 6).map(esc).join(', ')}</div>${m.ko.length ? `<div class="small muted">À mettre en avant ou acquérir : ${m.ko.slice(0, 4).map(esc).join(', ')}</div>` : ''}
    <div class="row2"><button class="btn sm ghost" data-act="mjsearch" data-v="${esc(m.n)}">Chercher des offres</button><button class="btn sm ghost" data-act="mjcv" data-v="${esc(m.n)}">CV pour ce métier</button><button class="ib sm" data-act="mjhide" data-v="${esc(m.n)}" aria-label="Masquer">✕</button></div></div>`).join('') + (mj.length > 8 ? `<button class="btn ghost sm" data-act="mjmore">${ui.mjAll ? 'Voir moins' : 'Voir plus de métiers'}</button>` : '') : '<div class="empty small">Complète ton CV (compétences, expériences) pour obtenir des pistes.</div>'}</div>
  <div class="card" id="sojobs"><h2>Trouver des offres</h2><div class="small muted">Choisis un métier et une ville : un site s’ouvre avec ta recherche déjà faite. Ouvre l’annonce, copie son texte, puis reviens ici et touche « Coller l’annonce ».</div>
   <div class="grid2"><label class="f">Métier<input data-u="so.q" value="${esc(so.q)}" placeholder="Ex. chargé de communication"></label><label class="f">Ville<input data-u="so.l" value="${esc(so.l)}" placeholder="Ex. Lyon"></label></div>
   <div class="chips">${getSites().filter(x => !x.off).map(x => `<button class="btn sm ghost" data-act="jobsite" data-v="${x.id}">${esc(x.n)}</button>`).join('')}<button class="btn sm ghost" data-act="sites">⚙ Gérer les sites</button></div></div>
  <div class="card"><h2>Adapter son CV à une annonce</h2><div class="small muted">Colle l’annonce : l’appli repère les mots-clés et ce qui manque à ton CV.</div>
   <label class="f">CV à comparer<select data-u="offre.cvId">${S.cvs.map(c => `<option value="${c.id}" ${c.id === o.cvId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
   <div class="grid2"><label class="f">Poste<input data-u="offre.poste" value="${esc(o.poste)}" placeholder="Ex. Chef de projet"></label><label class="f">Entreprise<input data-u="offre.entreprise" value="${esc(o.entreprise)}"></label></div>
   <label class="f">Texte de l’annonce<textarea data-u="offre.text" rows="8" placeholder="Colle ici l’annonce…">${esc(o.text)}</textarea></label>
   <div class="row2"><button class="btn ghost" data-act="pasteoffre" style="flex:1">Coller l’annonce</button><button class="btn" data-act="analyze" style="flex:1">Analyser</button></div></div>
  ${res ? `<div class="card"><div class="rowline"><div class="ring" style="--p:${res.score}"><b>${res.score}%</b></div><div><h2>Correspondance</h2><div class="small muted">Part des mots-clés de l’annonce présents dans ton CV.</div></div></div>
   <div><b class="small">Déjà présents</b><div class="kw" style="margin-top:6px">${res.ok.length ? res.ok.map(w => `<span class="chip ok">${esc(w)}</span>`).join('') : '<span class="muted small">Aucun</span>'}</div></div>
   <div><b class="small">Absents de ton CV</b> <span class="small muted">· touche un mot pour l’ajouter aux compétences</span><div class="kw" style="margin-top:6px">${res.miss.length ? res.miss.map(w => `<span class="chip warn" data-act="addkw" data-w="${esc(w)}">+ ${esc(w)}</span>`).join('') : '<span class="muted small">Rien d’important ne manque.</span>'}</div></div>
   <div class="small muted">N’ajoute un mot que si tu maîtrises vraiment le sujet.</div></div>
  ${aiOn() ? `<div class="card"><h2>Aide IA</h2><div class="small muted">Utilise le CV « ${esc((S.cvs.find(c => c.id === o.cvId) || {}).name || '')} » et l’annonce collée.</div><div class="row2"><button class="btn ghost" data-act="ailettre" style="flex:1">✨ Lettre de motivation</button><button class="btn ghost" data-act="aientretien" style="flex:1">✨ Préparer l’entretien</button></div></div>` : ''}
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
  return `<div class="wrap"><div class="top"><span class="app">Suivi</span><span class="row2"><button class="btn sm ghost" data-act="agenda">📅 Agenda</button><button class="btn sm" data-act="newjob">+ Candidature</button></span></div>
  ${due ? `<div class="banner"><span>${due} relance${due > 1 ? 's' : ''} à faire.</span></div>` : ''}
  <div class="withfilt"><div class="catbar vt"><button class="${f === 'all' ? 'on' : ''}" data-act="jf" data-v="all">Toutes<span> ${S.jobs.length}</span></button>${STATUTS.map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="jf" data-v="${k}">${l}<span> ${cnt(k)}</span></button>`).join('')}</div>
  <div class="card">${list.length ? list.map(j => {
    const cv = S.cvs.find(c => c.id === j.cvId), st = (STATUTS.find(s => s[0] === j.statut) || [, ''])[1];
    const late = j.statut === 'envoyee' && j.relance && j.relance < today, tod = j.statut === 'envoyee' && j.relance === today;
    return `<button class="job" data-act="editjob" data-id="${j.id}"><div class="l1"><b>${esc(j.poste || 'Poste')}</b><span class="chip ${j.statut === 'refus' ? 'bad' : j.statut === 'offre' ? 'ok' : ''}">${st}</span></div>
     <div class="small muted">${esc(j.entreprise || '—')}${j.date ? ' · envoyée le ' + fmtDate(j.date) : ''}${cv ? ' · ' + esc(cv.name) : ''}</div>${late ? '<span class="chip bad">Relance dépassée</span>' : tod ? '<span class="chip warn">Relance aujourd’hui</span>' : j.relance && j.statut === 'envoyee' ? `<span class="small muted">Relance le ${fmtDate(j.relance)}</span>` : ''}${j.rdv ? `<div class="small"><b>📅 Entretien le ${fmtDate(j.rdv.slice(0, 10))} à ${esc(j.rdv.slice(11, 16).replace(':', ' h '))}</b>${j.rdvLieu ? ' · ' + esc(j.rdvLieu) : ''}</div>` : ''}</button>`;
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
  <div class="grid2"><label class="f">Entretien : date et heure<input type="datetime-local" data-u="jd.rdv" value="${esc(j.rdv || '')}"></label><label class="f">Durée (minutes)<input type="number" inputmode="numeric" min="15" step="15" data-u="jd.rdvDur" data-num="1" value="${j.rdvDur || 60}"></label></div>
  <label class="f">Lieu ou lien visio de l’entretien<input data-u="jd.rdvLieu" value="${esc(j.rdvLieu || '')}" placeholder="Adresse, Teams, Zoom…"></label>
  <label class="f">Notes<textarea data-u="jd.notes" rows="3">${esc(j.notes)}</textarea></label>
  ${j.offre ? `<button class="btn ghost" data-act="jobanalyze" data-id="${j.id}">Relire et analyser l’annonce</button>` : ''}
  <div class="row2"><button class="btn" data-act="savejob" style="flex:1">Enregistrer</button>${j.created ? `<button class="btn danger" data-act="deljob" data-id="${j.id}">Supprimer</button>` : ''}${j.url ? `<a class="btn ghost" href="${esc(j.url)}" target="_blank" rel="noopener" style="text-decoration:none;text-align:center">Voir l’annonce</a>` : ''}</div>`);
}
const newJob = () => ({ id: uid(), poste: '', entreprise: '', url: '', statut: 'aenvoyer', cvId: S.cvs[0]?.id || '', date: '', relance: '', notes: '', offre: '', created: 0, rdv: '', rdvDur: 60, rdvLieu: '' });

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
  if (t === 'met') { const doms = S.set.doms || [], mj = ui.mj || (ui.mj = { n: '', k: '', d: '' }); body = `<div class="card"><h2>Mes domaines</h2><div class="small muted">Choisis un ou plusieurs domaines : les métiers de ces domaines passent devant dans l’onglet Offre.</div>
    <div class="chips">${DOMS.map(([k, n]) => `<button class="${doms.includes(k) ? 'on' : ''}" data-act="domtoggle" data-v="${k}">${doms.includes(k) ? '✓ ' : ''}${esc(n)}</button>`).join('')}</div>
    <button class="btn sm ${S.set.onlyDoms ? '' : 'ghost'}" data-act="onlydoms">${S.set.onlyDoms ? '☑' : '☐'} Montrer uniquement ces domaines</button></div>
   <div class="card"><h2>Ajouter un métier</h2><div class="small muted">Donne un nom et des mots-clés (séparés par des virgules) : il sera classé comme les autres. Ou laisse l’appli te proposer le tout, puis corrige.</div>
    <div class="chips"><button class="btn sm ghost" data-act="mjsug" data-v="name">✨ D’après le nom</button><button class="btn sm ghost" data-act="mjsug" data-v="cv">✨ D’après mon CV</button><button class="btn sm ghost" data-act="mjsug" data-v="offre">✨ D’après l’annonce collée</button></div>
    <label class="f">Nom du métier<input data-u="mj.n" value="${esc(mj.n)}" placeholder="Ex. Responsable maintenance hélicoptères"></label>
    <label class="f">Mots-clés<textarea data-u="mj.k" rows="2" placeholder="maintenance, helicoptere, hangar, encadrement…">${esc(mj.k)}</textarea></label>
    <label class="f">Domaine<select data-u="mj.d"><option value="">—</option>${DOMS.map(([k, n]) => `<option value="${k}" ${mj.d === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <button class="btn" data-act="mjadd">Ajouter</button>
    ${(S.set.myJobs || []).map(x => `<div class="skill"><span style="flex:1">${esc(x.n)}</span><button class="ib sm" data-act="mjdel" data-v="${esc(x.n)}" aria-label="Retirer">✕</button></div>`).join('')}</div>
   ${(S.set.hideJobs || []).length ? `<div class="card"><h2>Métiers masqués</h2>${S.set.hideJobs.map(x => `<div class="skill"><span style="flex:1">${esc(x)}</span><button class="btn sm ghost" data-act="mjunhide" data-v="${esc(x)}">Réafficher</button></div>`).join('')}</div>` : ''}`; }
  if (t === 'cv') body = `<div class="card"><h2>Modèle par défaut</h2><div class="seg">${TPLS.map(([k, n]) => `<button class="${s.tpl === k ? 'on' : ''}" data-act="set" data-k="tpl" data-v="${k}">${n}</button>`).join('')}</div>
   <h2>Couleur par défaut</h2><div class="pal">${ACCENTS.map(c => `<button class="${s.cvAccent === c ? 'on' : ''}" style="background:${c}" data-act="set" data-k="cvAccent" data-v="${c}"></button>`).join('')}</div>
   <h2>Police par défaut</h2>${seg('font', [['sans', 'Sans empattement'], ['serif', 'Avec empattement']])}<div class="small muted">S’applique aux nouveaux CV.</div></div>`;
  if (t === 'data') { const kb = Math.round(JSON.stringify(S).length / 1024); body = `<div class="card"><h2>Mode démo</h2><div class="small muted">Charge un faux CV, de vraies annonces et un suivi complet pour tout essayer. Tes données sont mises de côté et reviennent quand tu quittes la démo.</div>${S.demo ? '<button class="btn" data-act="demoquit">Quitter la démo</button>' : '<button class="btn ghost" data-act="demo">Lancer la démo</button>'}</div><div class="card"><h2>Sauvegarde</h2><div class="small muted">Tout est stocké sur cet appareil (${kb} Ko). Exporte régulièrement un fichier pour ne rien perdre ou pour passer d’un téléphone à l’autre.</div>
   <button class="btn" data-act="expjson">Exporter mes données</button><button class="btn ghost" data-act="impjson">Importer un fichier</button></div>
   <div class="card"><h2>Zone dangereuse</h2><button class="btn danger" data-act="resetall">Tout effacer</button></div>`; }
  if (t === 'ia') { const c = AI(); if (ui.aiu == null) { ui.aiu = c.url || ''; ui.ait = c.token || ''; } body = `<div class="card"><h2>Aide IA (facultative)</h2>
    <div class="small muted">L’IA réécrit tes puces, ton profil, écrit une lettre de motivation et prépare l’entretien. Elle passe par un petit relais que tu héberges toi-même (Cloudflare).</div>
    <div class="updst">🔒 Quand tu utilises un bouton IA, le texte concerné (CV, annonce) est envoyé à ton relais puis au modèle d’IA. Sans l’IA activée, rien ne quitte ton appareil.</div>
    <button class="btn sm ${c.on ? '' : 'ghost'}" data-act="aitoggle">${c.on ? '☑ IA activée' : '☐ IA désactivée : touche pour activer'}</button>
    <label class="f">Adresse du relais<input data-u="aiu" value="${esc(ui.aiu)}" placeholder="https://cv-ia.ton-compte.workers.dev" autocapitalize="off" autocorrect="off"></label>
    <label class="f">Mot de passe du relais<input data-u="ait" type="password" value="${esc(ui.ait)}" autocapitalize="off" autocorrect="off"></label>
    <div class="row2"><button class="btn" data-act="aisave" style="flex:1">Enregistrer</button><button class="btn ghost" data-act="aitest" style="flex:1">Tester</button></div></div>`; }
  if (t === 'about') body = `<div class="card"><h2>CV en poche</h2><div class="small">Gratuit, sans publicité, sans compte, hors connexion. Tes CV ne quittent jamais ton appareil : la lecture des PDF se fait sur ton téléphone.</div>
   <div class="small muted">Import PDF : la lecture est automatique mais pas parfaite, vérifie toujours le résultat. Les PDF scannés (images) ne sont pas lisibles.</div>
   <div class="small muted">Astuce : pour enregistrer en PDF, ouvre l’aperçu puis « Imprimer / PDF » et choisis « Enregistrer au format PDF ». Sur iPhone, ouvre l’appli dans Safari si l’impression ne s’ouvre pas.</div></div>`;
  if (t === 'maj') { const u = ui.upd || {}; const stat = u.st === 'ok' ? `<div class="updst ok">✅ Application à jour · version ${APP_VERSION}<small>Vérifié à ${u.t}</small></div>` : u.st === 'new' ? `<div class="updst nw">⬆ Mise à jour disponible · version ${u.v}<small>Tu as la version ${APP_VERSION}</small><button class="btn sm" data-act="applyupd">Mettre à jour maintenant</button></div>` : u.st === 'err' ? `<div class="updst er">Vérification impossible (hors connexion ?)<small>Version installée : ${APP_VERSION}</small></div>` : `<div class="updst">Vérification…</div>`; body = `<div class="card"><h2>Version ${APP_VERSION}</h2>${stat}<div class="small muted">Dernière mise à jour : ${CHANGELOG[0].d}</div><button class="btn" data-act="checkupd">Vérifier les mises à jour</button></div>
   ${CHANGELOG.map(c => `<div class="card tip"><h3>Version ${c.v} <span class="chip">${c.d}</span></h3><ul>${c.l.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}`; }
  return `<div class="wrap"><div class="top"><span class="app">Réglages</span><span class="chip">v${APP_VERSION}</span></div>
  <div class="scrollx vt">${[['app', 'Apparence'], ['cv', 'Modèles'], ['met', 'Métiers'], ['data', 'Données'], ['ia', 'IA'], ['maj', 'Mises à jour'], ['about', 'À propos']].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="stab" data-v="${k}">${l}</button>`).join('')}</div>${body}</div>`;
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
    const k = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const cv = curCV(); cv.data.identity.photoSrc = c.toDataURL('image/jpeg', .85); touch(cv); openCrop(cv.data.identity.photoSrc);
  };
  img.onerror = () => toast('Image illisible'); img.src = url;
}
const CF = 260;
function openCrop(src) {
  const im = new Image();
  im.onload = () => {
    ui.crop = { im, w: im.naturalWidth, h: im.naturalHeight, x: 0, y: 0, z: 1 };
    openSheet(`<div class="sh"><h2>Recadrer la photo</h2><button class="ib" data-act="closesheet">✕</button></div>
     <div class="small muted">Glisse la photo pour la déplacer (appui long possible), pince avec deux doigts ou utilise le curseur pour zoomer. Le cercle montre ce qui sera visible.</div>
     <div id="cropf"><img id="cropi" src="${src}" alt="" draggable="false"></div>
     <label class="f">Zoom<input type="range" id="cropz" min="1" max="3" step="0.01" value="1"></label>
     <div class="row2"><button class="btn ghost" data-act="closesheet" style="flex:1">Annuler</button><button class="btn" data-act="cropok" style="flex:1">Valider</button></div>`);
    cropApply();
  };
  im.src = src;
}
function cropApply() {
  const c = ui.crop, img = $('#cropi'); if (!c || !img) return;
  const bs = CF / Math.min(c.w, c.h) * c.z, dw = c.w * bs, dh = c.h * bs;
  c.x = Math.max(-(dw - CF) / 2, Math.min((dw - CF) / 2, c.x)); c.y = Math.max(-(dh - CF) / 2, Math.min((dh - CF) / 2, c.y));
  img.style.cssText = `width:${dw}px;height:${dh}px;left:${CF / 2 - dw / 2 + c.x}px;top:${CF / 2 - dh / 2 + c.y}px`;
}
let cg = null;
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse') return;
  const f = e.target.closest('#cropf'); if (!f || !ui.crop) return;
  cg = { sx: e.clientX, sy: e.clientY, ox: ui.crop.x, oy: ui.crop.y, on: e.pointerType === 'mouse' };
  if (cg.on) f.classList.add('grab');
  else cg.t = setTimeout(() => { if (cg) { cg.on = true; f.classList.add('grab'); navigator.vibrate?.(20); } }, 280);
});
document.addEventListener('pointermove', e => {
  if (!cg || e.pointerType !== 'mouse') return;
  const dx = e.clientX - cg.sx, dy = e.clientY - cg.sy;
  if (!cg.on) { if (Math.hypot(dx, dy) > 10) { clearTimeout(cg.t); cg = null; } return; }
  ui.crop.x = cg.ox + dx; ui.crop.y = cg.oy + dy; cropApply();
});
const cgEnd = () => { if (cg) { clearTimeout(cg.t); cg = null; $('#cropf')?.classList.remove('grab'); } };
document.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') cgEnd(); });
/* tactile (iPhone / iPad) : événements touch, plus fiables que les pointeurs */
const cropClamp = z => Math.max(1, Math.min(3, z));
document.addEventListener('touchstart', e => {
  const f = e.target.closest('#cropf'); if (!f || !ui.crop) return;
  const t = e.touches;
  if (t.length === 2) { clearTimeout(cg && cg.t); cg = { pinch: true, d0: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1, z0: ui.crop.z }; f.classList.add('grab'); return; }
  const p = t[0]; cg = { sx: p.clientX, sy: p.clientY, ox: ui.crop.x, oy: ui.crop.y, on: false };
  cg.t = setTimeout(() => { if (cg && !cg.pinch) { cg.on = true; f.classList.add('grab'); navigator.vibrate?.(20); } }, 250);
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!cg || !e.target.closest('#cropf')) return;
  e.preventDefault(); const t = e.touches;
  if (cg.pinch) { if (t.length < 2) return; ui.crop.z = cropClamp(cg.z0 * Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) / cg.d0); const z = $('#cropz'); if (z) z.value = ui.crop.z; cropApply(); return; }
  const p = t[0], dx = p.clientX - cg.sx, dy = p.clientY - cg.sy;
  if (!cg.on && Math.hypot(dx, dy) > 4) { cg.on = true; clearTimeout(cg.t); $('#cropf')?.classList.add('grab'); }
  if (cg.on) { ui.crop.x = cg.ox + dx; ui.crop.y = cg.oy + dy; cropApply(); }
}, { passive: false });
document.addEventListener('touchend', e => { if (cg && (!e.touches.length)) cgEnd(); });
document.addEventListener('touchcancel', () => cgEnd());
document.addEventListener('input', e => { if (e.target.id === 'cropz' && ui.crop) { ui.crop.z = +e.target.value; cropApply(); } });
function cropSave() {
  const c = ui.crop, cv = curCV(); if (!c || !cv) return;
  const bs = CF / Math.min(c.w, c.h) * c.z, side = CF / bs, cx = c.w / 2 - c.x / bs, cy = c.h / 2 - c.y / bs;
  const cn = document.createElement('canvas'); cn.width = cn.height = 400;
  cn.getContext('2d').drawImage(c.im, cx - side / 2, cy - side / 2, side, side, 0, 0, 400, 400);
  cv.data.identity.photo = cn.toDataURL('image/jpeg', .88); ui.crop = null; touch(cv); closeSheet(); render();
}

/* ---- écran partagé : aperçu en direct, poignée, glisser-déposer ---- */
let liveT;
function updLive() {
  const cv = ui.ed && curCV(), box = $('#lps'); if (!cv || !box) return;
  const r = renderPages(cv), side = document.body.classList.contains('filt-side') && !matchMedia('(min-width:640px) and (orientation:landscape), (min-width:900px)').matches;
  const w = Math.max(150, box.clientWidth - 24 - (side ? 30 : 0)) * (ui.lz || 1), k = w / PAGE_W, h = w * 297 / 210, st = box.scrollTop;
  box.innerHTML = `<div class="lpin" style="width:${w + 24}px">${r.pages.map(p => `<div class="pgbox" style="width:${w}px;height:${h}px"><div style="transform:scale(${k});transform-origin:0 0;width:${PAGE_W}px">${p}</div></div>`).join('')}</div>`;
  box.scrollTop = st;
  const n = r.pages.length; let info = `${n} page${n > 1 ? 's' : ''}`;
  if (cv.one) info += r.fit ? (r.sc < (cv.scale || 1) - 0.005 ? ` · texte à ${Math.round(r.sc * 100)} %` : ' · 1 page OK') : ' · ne tient pas : masque une rubrique';
  if (r.over) info += ' · colonne latérale trop remplie';
  const el = $('#lpinfo'); if (el) el.textContent = info;
}
const liveSoon = () => { clearTimeout(liveT); liveT = setTimeout(updLive, 130); };
document.addEventListener('pointerdown', e => {
  const h = e.target.closest('.handle'); if (!h || e.pointerType !== 'mouse') return;
  const y0 = e.clientY, v0 = ui.lh; h.setPointerCapture(e.pointerId);
  const mv = ev => { ui.lh = Math.round(Math.max(14, Math.min(78, v0 + (ev.clientY - y0) / innerHeight * 100))); $('.edsplit')?.style.setProperty('--lh', ui.lh + 'vh'); };
  const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); updLive(); };
  h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
});
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
let vh = null, hh = null;
const vhSet = x => { ui.lw = Math.round(clampN(x / innerWidth * 100, 22, 75)); document.documentElement.style.setProperty('--lw', ui.lw + '%'); };
const hhSet = y => { ui.lh = Math.round(clampN(hh.v0 + (y - hh.y0) / innerHeight * 100, 14, 78)); $('.edsplit')?.style.setProperty('--lh', ui.lh + 'vh'); };
document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.target.closest('.vhandle')) { vh = 1; e.preventDefault(); } });
document.addEventListener('pointermove', e => { if (vh && e.pointerType === 'mouse') vhSet(e.clientX); });
document.addEventListener('pointerup', e => { if (vh && e.pointerType === 'mouse') { vh = null; updLive(); } });
document.addEventListener('touchstart', e => { const t = e.touches[0]; if (e.target.closest('.vhandle')) vh = 1; else if (e.target.closest('.handle')) hh = { y0: t.clientY, v0: ui.lh }; }, { passive: true });
document.addEventListener('touchmove', e => { const t = e.touches[0]; if (vh) { e.preventDefault(); vhSet(t.clientX); } else if (hh) { e.preventDefault(); hhSet(t.clientY); } }, { passive: false });
document.addEventListener('touchend', () => { if (vh || hh) { vh = hh = null; updLive(); } });
document.addEventListener('touchcancel', () => { vh = hh = null; });
let dd = null;
function ddStart() {
  const r = dd.row.getBoundingClientRect(); dd.on = true; navigator.vibrate?.(15);
  dd.ghost = dd.row.cloneNode(true); dd.ghost.classList.add('ghostc'); dd.ghost.style.width = r.width + 'px'; dd.off = { x: dd.px - r.left, y: dd.py - r.top };
  document.body.appendChild(dd.ghost); dd.row.classList.add('lifting'); ddMove(dd.px, dd.py);
}
function ddMove(x, y) {
  dd.ghost.style.left = (x - dd.off.x) + 'px'; dd.ghost.style.top = (y - dd.off.y) + 'px';
  const t = document.elementFromPoint(x, y), over = t && t.closest('.dragc');
  if (over && over !== dd.row && !over.classList.contains('ghostc')) { const b = over.getBoundingClientRect(); over.parentNode.insertBefore(dd.row, y < b.top + b.height / 2 ? over : over.nextSibling); }
  else if (!over) { const z = t && t.closest('.dropz'); if (z) z.appendChild(dd.row); }
  const f = $('.edform'); if (f) { const b = f.getBoundingClientRect(); if (y < b.top + 50) f.scrollTop -= 12; else if (y > b.bottom - 90) f.scrollTop += 12; }
}
function ddEnd(ok) {
  if (!dd) return; clearTimeout(dd.t);
  if (dd.on) {
    dd.ghost.remove(); dd.row.classList.remove('lifting');
    if (ok) {
      const cv = curCV(), two = twoCol(cv), order = []; cv.col = cv.col || {};
      document.querySelectorAll('.dropz').forEach(z => z.querySelectorAll('.dragc').forEach(r => { order.push(r.dataset.k); if (two) cv.col[r.dataset.k] = z.dataset.z; }));
      cv.order = order; touch(cv); render();
    }
  }
  dd = null;
}
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse') return;
  const row = e.target.closest('.dragc'); if (!row || e.target.closest('button')) return;
  dd = { row, px: e.clientX, py: e.clientY, on: false };
  dd.t = setTimeout(() => { if (dd && !dd.on) ddStart(); }, 60);
});
document.addEventListener('touchstart', e => {
  const row = e.target.closest('.dragc'); if (!row || e.target.closest('button')) return;
  const p = e.touches[0], handle = !!e.target.closest('.gp');
  dd = { row, px: p.clientX, py: p.clientY, on: false };
  dd.t = setTimeout(() => { if (dd && !dd.on) ddStart(); }, handle ? 60 : 350);
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!dd) return; const p = e.touches[0];
  if (!dd.on) { if (Math.hypot(p.clientX - dd.px, p.clientY - dd.py) > 10) { clearTimeout(dd.t); dd = null; } return; }
  e.preventDefault(); ddMove(p.clientX, p.clientY);
}, { passive: false });
document.addEventListener('touchend', () => ddEnd(true));
document.addEventListener('touchcancel', () => { const on = dd && dd.on; ddEnd(false); if (on) render(); });
document.addEventListener('pointermove', e => {
  if (!dd || e.pointerType !== 'mouse') return;
  if (!dd.on) { if (Math.hypot(e.clientX - dd.px, e.clientY - dd.py) > 10) { clearTimeout(dd.t); dd = null; } return; }
  ddMove(e.clientX, e.clientY);
});
document.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') ddEnd(true); });
document.addEventListener('contextmenu', e => { if (e.target.closest('.dragc,#cropf')) e.preventDefault(); });

/* ---- Auto ---- */
function autoLayout() {
  const cv = curCV(), keys = ['tpl', 'accent', 'font', 'scale', 'one', 'cols', 'col', 'order', 'sz', 'show'];
  ui.undo = { id: cv.id, s: clone(Object.fromEntries(keys.map(k => [k, cv[k]]))) };
  const base = clone(cv); base.order = ['resume', 'domaines', 'experiences', 'formations', 'competences', 'langues', 'certifs', 'loisirs']; base.col = {}; base.sz = {}; base.scale = 1; base.cols = false;
  const d = base.data, rich = (d.competences || []).length + (d.langues || []).length;
  const score = t => { const c = { ...clone(base), tpl: t, updated: Date.now() }, r = renderPages(c, true); return { t, r, s: (cv.one ? (r.fit ? r.sc : 0) : 1 - r.pages.length * 0.3 - (r.over ? 0.2 : 0)) + (t === 'moderne' && rich >= 8 ? 0.04 : 0) + (t === 'classique' ? 0.01 : 0) }; };
  const pick = () => ['classique', 'moderne', 'chrono', 'bandeau', 'elegant'].map(score).sort((a, b) => b.s - a.s)[0];
  let best = pick; best = pick(); const hid = [];
  if (cv.one) for (const k of ['loisirs', 'certifs', 'domaines']) { if (best.r.fit) break; if (base.show[k] === false) continue; base.show[k] = false; hid.push(SHORT[k]); best = pick(); }
  Object.assign(cv, { tpl: best.t, cols: false, scale: 1, order: base.order, col: {}, sz: {}, show: base.show });
  touch(cv); render();
  toast(`Auto : modèle ${TPLS.find(x => x[0] === best.t)[1]}${cv.one ? `, texte à ${Math.round(best.r.sc * 100)} %` : ''}${hid.length ? `, masqué : ${hid.join(', ')}` : ''}${cv.one && !best.r.fit ? ' (ne tient toujours pas sur 1 page)' : ''}`);
}



/* ============ métiers qui te correspondent ============ */
const DOMS = [['aero', 'Aéronautique et spatial'], ['indus', 'Industrie et maintenance'], ['log', 'Logistique et transport'], ['qse', 'Qualité, sécurité, environnement'], ['secu', 'Sûreté, défense, sécurité civile'], ['btp', 'BTP et énergie'], ['it', 'Informatique et numérique'], ['com', 'Communication et marketing'], ['gest', 'Gestion, administration, RH'], ['vente', 'Commerce et relation client'], ['form', 'Formation et enseignement'], ['sante', 'Santé et social'], ['hotel', 'Tourisme et restauration']];
const METIERS = [
  ['Responsable maintenance aéronautique', 'aero', 'maintenance,aeronef,aeronautique,avion,hangar,part 145,part 66,easa,navigabilite,planning,encadrement,equipe,budget,qualite,securite,gmao'],
  ['Chef d’équipe maintenance aéronautique', 'aero', 'maintenance,aeronef,hangar,equipe,encadrement,planning,depannage,inspection,avion,helicoptere,securite,procedures,aeronautique'],
  ['Technicien de maintenance aéronautique', 'aero', 'maintenance,aeronef,avion,helicoptere,depannage,inspection,mecanique,moteur,turbine,avionique,documentation technique,procedures,part 66,aeronautique'],
  ['Technicien avionique', 'aero', 'avionique,electronique,electrique,cablage,essais,diagnostic,aeronef,systemes,maintenance,tests,aeronautique'],
  ['Mécanicien moteur et turbine', 'aero', 'moteur,turbine,mecanique,demontage,remontage,inspection,aeronautique,outillage,depannage,couple,reacteur'],
  ['Technicien structure et composites', 'aero', 'structure,composites,reparation,tole,rivetage,aeronautique,collage,inspection,controle,soudure'],
  ['Gestionnaire de maintenance (CAMO)', 'aero', 'camo,navigabilite,planification,maintenance,gmao,aeronef,documentation,suivi,potentiels,easa,reglementation,aeronautique'],
  ['Planificateur maintenance aéronautique', 'aero', 'planification,planning,maintenance,gmao,ordonnancement,aeronef,charge,delais,coordination,hangar,aeronautique'],
  ['Responsable qualité aéronautique', 'aero', 'qualite,audit,easa,part 145,certification,tracabilite,non conformite,procedures,amelioration continue,aeronautique,iso 9001,en 9100'],
  ['Inspecteur contrôleur qualité aéronautique', 'aero', 'controle,inspection,qualite,tracabilite,non conformite,aeronautique,mesure,conformite,documentation,certification,navigabilite'],
  ['Ingénieur ou technicien méthodes maintenance', 'aero', 'methodes,maintenance,optimisation,procedures,gmao,documentation technique,amelioration continue,aeronautique,planification,lean'],
  ['Responsable atelier ou production aéronautique', 'aero', 'production,atelier,encadrement,planning,delais,qualite,securite,aeronautique,lean,equipe,hangar'],
  ['Responsable logistique pièces aéronautiques', 'aero', 'logistique,approvisionnement,stock,pieces,aeronautique,supply chain,gestion de stock,fournisseurs,tracabilite,achats,rechange'],
  ['Formateur technique aéronautique', 'aero', 'formation,formateur,pedagogie,maintenance,aeronautique,transmission,tutorat,procedures,securite,evaluation,aeronef'],
  ['Responsable sécurité des vols (Safety manager)', 'aero', 'securite,sgs,safety,risques,audit,aeronautique,reglementation,prevention,analyse,incident,vol'],
  ['Responsable documentation technique', 'aero', 'documentation,technique,redaction,procedures,manuel,amm,ata,revision,tracabilite,aeronautique,maintenance'],
  ['Chargé d’affaires MRO', 'aero', 'mro,devis,client,maintenance,planning,budget,aeronautique,negociation,suivi,contrat,aeronef'],
  ['Technicien d’essais', 'aero', 'essais,tests,mesure,banc,instrumentation,rapport,aeronautique,diagnostic,protocole,analyse'],
  ['Chef d’escale ou responsable opérations aéroportuaires', 'aero', 'aeroport,escale,operations,piste,securite,coordination,encadrement,passagers,planning,avion'],
  ['Responsable maintenance industrielle', 'indus', 'maintenance,gmao,preventif,curatif,equipe,budget,arret,securite,electromecanique,planning,encadrement'],
  ['Technicien de maintenance industrielle', 'indus', 'maintenance,depannage,electromecanique,automatisme,hydraulique,pneumatique,preventif,diagnostic,gmao,mecanique'],
  ['Responsable de production', 'indus', 'production,encadrement,equipe,planning,delais,qualite,securite,lean,indicateurs,budget,atelier'],
  ['Chef d’atelier', 'indus', 'atelier,equipe,encadrement,planning,production,securite,qualite,maintenance,organisation,outillage'],
  ['Responsable amélioration continue (Lean)', 'indus', 'lean,kaizen,5s,amelioration continue,processus,performance,indicateurs,formation,optimisation,projet'],
  ['Automaticien', 'indus', 'automate,plc,siemens,schneider,supervision,programmation,automatisme,electricite,maintenance,diagnostic'],
  ['Ingénieur méthodes industrialisation', 'indus', 'methodes,industrialisation,gammes,temps,process,optimisation,production,documentation,lean,cao'],
  ['Chef de projet industriel', 'indus', 'projet,planning,budget,industrie,coordination,cahier des charges,fournisseurs,qualite,delais,equipe'],
  ['Responsable logistique', 'log', 'logistique,stock,approvisionnement,transport,entrepot,planning,fournisseurs,encadrement,supply chain,flux,budget'],
  ['Responsable d’entrepôt', 'log', 'entrepot,stock,preparation de commandes,cariste,equipe,encadrement,securite,inventaire,flux,wms'],
  ['Gestionnaire de stocks et approvisionneur', 'log', 'stock,approvisionnement,inventaire,commandes,fournisseurs,gestion de stock,erp,sap,pieces,tracabilite'],
  ['Acheteur', 'log', 'achats,fournisseurs,negociation,appel d offres,cahier des charges,budget,contrats,consultation,cout'],
  ['Responsable transport', 'log', 'transport,tournees,affretement,logistique,planning,chauffeurs,reglementation,couts,client,encadrement'],
  ['Responsable QHSE', 'qse', 'qualite,securite,environnement,hse,audit,iso 9001,iso 14001,prevention,risques,reglementation,formation,document unique'],
  ['Responsable qualité', 'qse', 'qualite,audit,iso 9001,non conformite,amelioration continue,procedures,tracabilite,indicateurs,reclamations,certification'],
  ['Animateur sécurité et préventeur', 'qse', 'prevention,securite,risques,formation,document unique,accidents,audit,reglementation,sensibilisation,epi'],
  ['Auditeur qualité', 'qse', 'audit,qualite,conformite,referentiel,iso,rapport,non conformite,certification,procedures,amelioration'],
  ['Responsable environnement', 'qse', 'environnement,iso 14001,dechets,energie,reglementation,audit,rse,prevention,pollution'],
  ['Responsable sûreté et sécurité', 'secu', 'surete,securite,protection,risques,gestion de crise,prevention,controle,surveillance,reglementation,encadrement'],
  ['Responsable sécurité incendie (SSIAP)', 'secu', 'ssiap,incendie,securite,prevention,erp,evacuation,formation,controle,equipe'],
  ['Agent de sûreté aéroportuaire', 'secu', 'surete,aeroport,controle,securite,inspection,filtrage,reglementation,vigilance,passagers'],
  ['Chargé de mission sécurité civile et défense', 'secu', 'securite,defense,crise,planification,coordination,reglementation,exercices,risques,administration,partenaires'],
  ['Conducteur de travaux', 'btp', 'travaux,chantier,planning,budget,sous traitants,securite,coordination,reception,encadrement,plans'],
  ['Chef de chantier', 'btp', 'chantier,equipe,encadrement,securite,planning,travaux,lecture de plans,qualite,materiel'],
  ['Responsable technique bâtiment', 'btp', 'batiment,maintenance,technique,securite,contrats,fournisseurs,travaux,reglementation,equipe,erp'],
  ['Technicien de maintenance énergie (photovoltaïque, éolien)', 'btp', 'energie,photovoltaique,eolien,maintenance,electricite,habilitation,diagnostic,securite,depannage,onduleur'],
  ['Chef de projet informatique', 'it', 'projet,informatique,planning,budget,cahier des charges,agile,scrum,equipe,recette,coordination'],
  ['Technicien support informatique', 'it', 'support,assistance,helpdesk,windows,reseau,utilisateurs,incidents,maintenance,materiel,ticket'],
  ['Administrateur systèmes et réseaux', 'it', 'systemes,reseau,serveurs,linux,windows,securite,virtualisation,sauvegarde,supervision,active directory'],
  ['Développeur web', 'it', 'javascript,html,css,web,php,react,sql,developpement,api,git'],
  ['Analyste de données', 'it', 'donnees,data,sql,excel,power bi,tableaux de bord,analyse,statistiques,python,reporting'],
  ['Chef de projet digital', 'it', 'digital,projet,web,site,cahier des charges,agile,planning,client,budget,coordination'],
  ['Chargé de communication', 'com', 'communication,redaction,reseaux sociaux,evenements,newsletter,plan de communication,presse,canva,contenus,editorial'],
  ['Community manager', 'com', 'reseaux sociaux,community,instagram,linkedin,facebook,contenus,animation,editorial,audience,moderation'],
  ['Responsable marketing digital', 'com', 'marketing,digital,seo,emailing,campagnes,google analytics,acquisition,budget,reseaux sociaux,strategie'],
  ['Rédacteur web', 'com', 'redaction,seo,web,contenus,articles,editorial,blog,relecture,ligne editoriale'],
  ['Assistant de direction', 'gest', 'assistanat,agenda,organisation,courrier,reunions,deplacements,comptes rendus,confidentialite,office,secretariat'],
  ['Responsable administratif et financier', 'gest', 'comptabilite,budget,gestion,tresorerie,reporting,paie,administratif,financier,controle de gestion,encadrement'],
  ['Comptable', 'gest', 'comptabilite,bilan,facturation,tva,saisie,rapprochement,paie,clients,fournisseurs,excel'],
  ['Gestionnaire de paie', 'gest', 'paie,bulletins,cotisations,social,dsn,absences,contrats,droit du travail,rh,administratif'],
  ['Chargé de recrutement', 'gest', 'recrutement,entretiens,offres,sourcing,candidats,integration,rh,annonces,cv,evaluation'],
  ['Responsable ressources humaines', 'gest', 'rh,ressources humaines,recrutement,formation,droit du travail,paie,gestion des carrieres,social,entretiens,encadrement'],
  ['Responsable d’équipe ou manager de proximité', 'gest', 'encadrement,equipe,management,planning,objectifs,indicateurs,formation,animation,organisation,entretiens'],
  ['Chef de projet', 'gest', 'projet,planning,budget,coordination,cahier des charges,suivi,risques,equipe,reporting,livrables'],
  ['Technico-commercial', 'vente', 'commercial,technique,client,devis,negociation,prospection,industrie,offre,cahier des charges,suivi'],
  ['Chargé de clientèle', 'vente', 'client,relation client,reclamations,suivi,fidelisation,commandes,telephone,conseil,satisfaction'],
  ['Commercial B2B', 'vente', 'prospection,negociation,clients,vente,objectifs,crm,rendez vous,portefeuille,devis,contrats'],
  ['Responsable de magasin', 'vente', 'magasin,equipe,ventes,stock,encadrement,merchandising,objectifs,caisse,planning,client'],
  ['Formateur professionnel', 'form', 'formation,formateur,pedagogie,animation,transmission,evaluation,programme,adultes,ingenierie,modules'],
  ['Responsable formation', 'form', 'formation,plan de formation,budget,opco,besoins,organismes,evaluation,competences,rh,planning'],
  ['Enseignant technique (lycée professionnel)', 'form', 'enseignement,pedagogie,eleves,technique,cours,evaluation,projets,maintenance,atelier,formation'],
  ['Éducateur spécialisé', 'sante', 'accompagnement,educatif,social,public,projet individuel,famille,ecoute,equipe,handicap'],
  ['Coordinateur de service d’aide à domicile', 'sante', 'coordination,planning,intervenants,aide a domicile,clients,qualite,encadrement,famille,social'],
  ['Responsable d’hôtel ou de restauration', 'hotel', 'hotel,restauration,equipe,accueil,planning,budget,clients,securite,encadrement,qualite'],
  ['Conseiller voyages', 'hotel', 'voyages,tourisme,reservation,client,conseil,billetterie,sejours,vente,gds'],
];
const getJobs = () => METIERS.concat((S.set.myJobs || []).map(j => [j.n, j.d || '', j.k])).filter(m => !(S.set.hideJobs || []).includes(m[0]));
function suggestJob(src, mj) {
  const cv = S.cvs.find(c => c.id === ui.offre.cvId) || S.cvs[0], tok = t => kwTokens(t).map(w => w.replace(/(s|x)$/, w.length > 4 ? '' : '$&'));
  const top = (freq, n) => [...freq.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, n).map(x => x[0]);
  const add = (m, w, p) => m.set(w, (m.get(w) || 0) + p);
  const all = getJobs(), res = { n: '', k: [], d: '' };
  const shown = new Map();
  if (src === 'name') {
    const nt = new Set(tok(mj.n || ''));
    if (!nt.size) return null;
    const sc = all.map(([n, d, k]) => { const ks = String(k).split(',').map(x => norm(x).trim()), jt = new Set([...tok(n), ...ks.flatMap(x => tok(x))]); let s = 0; nt.forEach(w => { if (jt.has(w)) s++; }); return { n, d, ks, s }; }).filter(x => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 3);
    const f = new Map(), dm = new Map(); sc.forEach(x => { x.ks.forEach(k => add(f, k, 1 + x.s)); if (x.d) add(dm, x.d, x.s); });
    nt.forEach(w => add(f, w, 6));
    res.k = top(f, 12); res.d = top(dm, 1)[0] || '';
  } else if (src === 'cv') {
    if (!cv) return null;
    const d = cv.data, f = new Map(), put = (t, p) => kwTokens(t).forEach(w => { const s = stem(w); if (!shown.has(s) || w.length < shown.get(s).length) shown.set(s, w); add(f, s, p); });
    put(d.identity.titre, 3); put(d.resume, 1); put(d.domaines, 2); act(d.competences).forEach(c => put(c.nom, 3));
    act(d.experiences).forEach(e => { put(e.poste, 3); put(e.desc, 1); }); act(d.formations).forEach(x => put(x.diplome, 2));
    res.k = top(f, 12).map(s => shown.get(s) || s); const m = matchJobs(cv), dm = new Map(); m.slice(0, 6).forEach(x => x.dm && add(dm, x.dm, x.pct)); res.d = top(dm, 1)[0] || '';
    res.n = d.identity.titre || '';
  } else {
    const t = ui.offre.text || ''; if (!t.trim()) return null;
    const r = analyzeOffer(t, cv || { data: { identity: {}, experiences: [], formations: [], competences: [], langues: [] } });
    res.k = r.ok.concat(r.miss).slice(0, 12); res.n = ui.offre.poste || '';
    const f = new Set(res.k.map(norm)), dm = new Map(); all.forEach(([n, d, k]) => { if (!d) return; let s = 0; String(k).split(',').forEach(x => { if (f.has(norm(x).trim())) s++; }); if (s) add(dm, d, s); }); res.d = top(dm, 1)[0] || '';
  }
  return res.k.length ? res : null;
}
function matchJobs(cv) {
  const d = cv.data, txt = ' ' + norm([d.identity.titre, d.resume, d.domaines, d.loisirs, d.extra, ...act(d.experiences).flatMap(e => [e.poste, e.entreprise, e.desc]), ...act(d.formations).flatMap(f => [f.diplome, f.ecole, f.desc]), ...act(d.competences).map(c => c.nom), ...act(d.langues).map(l => l.nom), ...act(d.certifs).map(c => c.nom)].join(' ')) + ' ';
  const doms = S.set.doms || [], only = !!S.set.onlyDoms && doms.length;
  const out = [];
  for (const [n, dm, kws] of getJobs()) {
    if (only && !doms.includes(dm)) continue;
    const ks = String(kws).split(',').map(x => norm(x).trim()).filter(Boolean), ok = [], ko = [];
    ks.forEach(k => { const hit = k.includes(' ') ? txt.includes(' ' + k) : new RegExp('(^| )' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(txt); (hit ? ok : ko).push(k); });
    if (ok.length < 2) continue;
    let pct = Math.min(100, Math.round(100 * ok.length / Math.max(4, ks.length * 0.55)));
    const inDom = doms.includes(dm); if (doms.length) pct = inDom ? Math.min(100, Math.round(pct * 1.15)) : Math.round(pct * 0.8);
    out.push({ n, dm, pct, ok, ko: ko.slice(0, 5) });
  }
  return out.sort((x, y) => y.pct - x.pct);
}

/* ============ mode démo ============ */
const JOBSITES = [
  { id: 'ft', n: 'France Travail', u: 'https://candidat.francetravail.fr/offres/recherche?motsCles={q}' },
  { id: 'indeed', n: 'Indeed', u: 'https://fr.indeed.com/jobs?q={q}&l={l}' },
  { id: 'li', n: 'LinkedIn', u: 'https://www.linkedin.com/jobs/search/?keywords={q}&location={l}' },
  { id: 'apec', n: 'Apec', u: 'https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles={q}' },
  { id: 'wttj', n: 'Welcome to the Jungle', u: 'https://www.welcometothejungle.com/fr/jobs?query={q}' },
  { id: 'hw', n: 'HelloWork', u: 'https://www.hellowork.com/fr-fr/emploi/recherche.html?k={q}&l={l}' },
];
const getSites = () => { if (!Array.isArray(S.set.sites)) S.set.sites = clone(JOBSITES); return S.set.sites; };
const siteUrl = (u, q, l) => u.replace(/\{q\}/g, encodeURIComponent(q.trim())).replace(/\{l\}/g, encodeURIComponent(l.trim()));
function siteSheet() {
  const L = getSites(), sn = ui.sn || (ui.sn = { n: '', u: '' });
  openSheet(`<div class="sh"><h2>Sites d’emploi</h2><button class="ib" data-act="closesheet">✕</button></div>
   <div class="small muted">👁 pour afficher ou masquer, ✕ pour retirer. Ajoute n’importe quel site : fais une recherche dessus, copie l’adresse de la page, colle-la ci-dessous. L’appli remplace ton métier et ta ville par {q} et {l}.</div>
   <div>${L.map(x => `<div class="skill"><button class="ib sm" data-act="sitetoggle" data-v="${x.id}" aria-label="Afficher ou masquer">${x.off ? '🚫' : '👁'}</button><span style="flex:1;${x.off ? 'opacity:.5' : ''}">${esc(x.n)}</span><button class="ib sm" data-act="sitedel" data-v="${x.id}" aria-label="Retirer">✕</button></div>`).join('') || '<div class="small muted">Aucun site : ajoute-en un.</div>'}</div>
   <label class="f">Nom du site<input data-u="sn.n" value="${esc(sn.n)}" placeholder="Ex. Jooble"></label>
   <label class="f">Adresse d’une recherche sur ce site<input data-u="sn.u" value="${esc(sn.u)}" placeholder="https://…?q=chargé+de+communication&l=Lyon"></label>
   <div class="row2"><button class="btn" data-act="siteadd" style="flex:1">Ajouter</button><button class="btn ghost" data-act="sitereset" style="flex:1">Remettre la liste de départ</button></div>`);
}
const OFFRES = [
  { poste: 'Chargé(e) de communication digitale', ent: 'Maison Verdier', txt: `Maison Verdier, entreprise familiale lyonnaise de 80 salariés (vins et spiritueux), recrute un(e) Chargé(e) de communication digitale en CDI.

Vos missions
- Définir et animer la stratégie éditoriale sur les réseaux sociaux (Instagram, LinkedIn, Facebook)
- Rédiger et planifier les contenus : posts, newsletters, articles de blog
- Piloter les campagnes d'emailing et analyser leurs résultats
- Suivre les indicateurs d'audience avec Google Analytics et proposer des optimisations
- Coordonner les prestataires (photographes, agence de création)
- Assurer la veille concurrentielle

Votre profil
- Bac+5 en communication ou marketing digital
- 3 ans d'expérience minimum sur un poste similaire
- Maîtrise de Canva et de la Suite Adobe
- Excellente expression écrite, esprit de synthèse, autonomie
- Anglais courant apprécié

Nous vous offrons : télétravail 2 jours par semaine, mutuelle prise en charge à 100 %, 5 semaines de congés supplémentaires.` },
  { poste: 'Chef de projet digital', ent: 'Nord Digital', txt: `Nord Digital, agence web de 35 personnes à Lille, recherche un(e) Chef de projet digital.

Au sein de l'équipe projets, vous êtes l'interlocuteur(trice) de nos clients grands comptes et pilotez la production de leurs sites et applications.

Missions
- Recueillir et formaliser les besoins clients, rédiger les cahiers des charges
- Planifier et coordonner 10 à 15 projets par an avec les équipes design et développement
- Suivre le budget, les délais et la qualité des livrables
- Animer les réunions de lancement et de suivi, rédiger les comptes rendus
- Veiller à la satisfaction client et proposer des évolutions

Profil recherché
- Formation Bac+4/5 en gestion de projet, communication ou école de commerce
- Expérience de 4 ans en gestion de projet web ou en agence
- Méthodes agiles (Scrum, Kanban), outils Jira et Notion
- Aisance relationnelle, rigueur, sens de l'organisation
- Anglais professionnel

Poste en CDI, rémunération selon profil, tickets restaurant, prime annuelle.` },
  { poste: 'Responsable communication', ent: 'Mairie de Caluire', txt: `La Ville de Caluire-et-Cuire (43 000 habitants) recrute un(e) Responsable de la communication, cadre d'emplois des attachés territoriaux, par voie statutaire ou contractuelle.

Rattaché(e) à la Direction générale, vous encadrez une équipe de 3 agents.

Missions principales
- Élaborer et mettre en œuvre le plan de communication de la collectivité
- Superviser le magazine municipal, le site internet et les réseaux sociaux
- Organiser les événements et cérémonies officielles
- Gérer les relations avec la presse
- Piloter le budget communication et les marchés publics associés

Compétences attendues
- Expérience confirmée en communication institutionnelle ou en agence
- Excellente maîtrise rédactionnelle
- Connaissance de l'environnement des collectivités territoriales
- Capacité à encadrer et à coordonner une équipe
- Disponibilité ponctuelle en soirée et le week-end

Candidatures (CV et lettre de motivation) avant le 30 du mois.` },
];
const dIso = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
function demoState() {
  const c1 = newCV('CV Communication (démo)', sampleData()); c1.tpl = 'classique';
  const c2 = newCV('CV Chef de projet digital (démo)', sampleData()); c2.tpl = 'moderne'; c2.accent = '#0F7C9D';
  c2.data.identity.titre = 'Chef de projet digital'; c2.data.resume = 'Chargée de communication digitale, j’ai piloté 12 projets web par an pour des clients grands comptes, dans les délais et le budget. Je cherche un poste de chef de projet digital en agence.';
  c2.data.competences.push(...['Gestion de projet', 'Méthodes agiles', 'Jira', 'Cahier des charges'].map(n => ({ id: uid(), on: true, nom: n, niveau: 0 })));
  c1.updated = Date.now() - 1000; c2.updated = Date.now();
  const J = (o, i, p) => ({ id: uid(), poste: o.poste, entreprise: o.ent, url: '', statut: 'aenvoyer', cvId: c1.id, date: '', relance: '', notes: '', offre: o.txt || '', created: Date.now() - 864e5 * (p.age || 3), ...p });
  const jobs = [
    J(OFFRES[0], 0, { statut: 'entretien', date: dIso(-9), notes: 'Entretien RH jeudi à 14 h. Préparer 3 exemples chiffrés (méthode STAR) et 3 questions à poser.', url: 'https://exemple.fr/offre-maison-verdier', age: 10, rdv: dIso(3) + 'T14:00', rdvDur: 60, rdvLieu: 'Visio Teams' }),
    J(OFFRES[1], 1, { statut: 'envoyee', cvId: c2.id, date: dIso(-6), relance: dIso(2), notes: 'Envoyé avec la version « Chef de projet digital ».', age: 7 }),
    J(OFFRES[2], 2, { statut: 'aenvoyer', notes: 'Date limite dans 5 jours. Lettre de motivation à écrire.', age: 1 }),
    J({ poste: 'Community manager senior', ent: 'Studio Mireille' }, 3, { statut: 'offre', date: dIso(-20), notes: 'Proposition reçue : réponse attendue sous 7 jours, salaire à négocier.', age: 21 }),
    J({ poste: 'Chargée de marque', ent: 'Groupe Altéa' }, 4, { statut: 'refus', date: dIso(-30), notes: 'Refus après entretien : profil jugé trop junior. Demander un retour.', age: 31 }),
    J({ poste: 'Responsable réseaux sociaux', ent: 'Les Jardins du Rhône' }, 5, { statut: 'envoyee', date: dIso(-3), relance: dIso(4), age: 4 }),
  ];
  return { cvs: [c1, c2], jobs, checks: { 0: true, 1: true, 2: true, 4: true }, demo: true };
}
function demoOn() {
  if (S.demo) return;
  try { localStorage.setItem(KEY + '.real', JSON.stringify(S)); } catch (e) { toast('Stockage plein : impossible de lancer la démo'); return; }
  const set = S.set; S = { ...defaults(), ...demoState(), set }; saveNow();
  const o = OFFRES[0], cv = S.cvs[0];
  ui.ed = null; ui.tab = 'cv'; ui.offre = { text: o.txt, cvId: cv.id, entreprise: o.ent, poste: o.poste, res: analyzeOffer(o.txt, cv), mask: true, settitle: false };
  closeSheet(); render(); scrollTo(0, 0); toast('Mode démo : données fictives');
}
function demoOff() {
  let real = null; try { real = JSON.parse(localStorage.getItem(KEY + '.real')); } catch (e) { }
  const d = defaults(); S = real && Array.isArray(real.cvs) ? { ...d, ...real, set: { ...d.set, ...(real.set || {}) } } : { ...d, set: S.set };
  delete S.demo; try { localStorage.removeItem(KEY + '.real'); } catch (e) { }
  saveNow(); ui.ed = null; ui.tab = 'cv'; ui.offre = { text: '', cvId: '', entreprise: '', poste: '', res: null, mask: true, settitle: false };
  $('#prev')?.remove(); closeSheet(); applySettings(); render(); scrollTo(0, 0); toast('Démo quittée : tes données sont revenues');
}


/* ============ agenda : AgenDam / .ics ============ */
const pad2 = n => String(n).padStart(2, '0');
const ymdLocal = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function agNote(j, rdv) {
  const st = (STATUTS.find(s => s[0] === j.statut) || [, ''])[1], L = [];
  L.push(rdv ? 'Entretien pour : ' + (j.poste || 'poste') + (j.entreprise ? ' chez ' + j.entreprise : '') : 'Relancer la candidature : ' + (j.poste || 'poste') + (j.entreprise ? ' chez ' + j.entreprise : ''));
  if (st) L.push('Statut : ' + st);
  if (j.date) L.push('Candidature envoyée le ' + fmtDate(j.date));
  if (j.url) L.push('Offre : ' + j.url);
  if (j.notes) L.push('', j.notes);
  return L.join('\n');
}
function agendaEvents() {
  const out = [], today = ymdLocal(new Date());
  for (const j of S.jobs) {
    const nm = `${j.poste || 'Poste'}${j.entreprise ? ' – ' + j.entreprise : ''}`;
    if (j.rdv && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(j.rdv)) {
      const d = j.rdv.slice(0, 10), t = j.rdv.slice(11, 16), m = +t.slice(0, 2) * 60 + +t.slice(3, 5), e = Math.min(1439, m + (+j.rdvDur || 60));
      out.push({ id: 'cv-' + j.id + '-rdv', title: 'Entretien : ' + nm, allDay: false, start: d, end: d, startTime: t, endTime: `${pad2(Math.floor(e / 60))}:${pad2(e % 60)}`, place: j.rdvLieu || '', note: agNote(j, true) });
    }
    if (j.relance && !['refus', 'offre'].includes(j.statut)) out.push({ id: 'cv-' + j.id + '-rel', title: 'Relancer : ' + nm, allDay: true, start: j.relance, end: j.relance, startTime: '09:00', endTime: '10:00', place: j.entreprise || '', note: agNote(j, false) });
  }
  return out.filter(e => e.start >= today).sort((x, y) => (x.start + x.startTime).localeCompare(y.start + y.startTime));
}
const agPicked = () => { const off = ui.agOff || (ui.agOff = {}); return agendaEvents().filter(e => !off[e.id]); };
const b64u = t => btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const agCode = evs => 'CVPOCHE:' + b64u(JSON.stringify({ app: 'cv', v: 1, ev: evs }));
const agLink = evs => 'https://dam-cigogne.github.io/agenda/#cv=' + b64u(JSON.stringify({ app: 'cv', v: 1, ev: evs }));
const icsEsc = t => String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function buildIcs(evs) {
  const st = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''), d = x => x.replace(/-/g, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CV en poche//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of evs) {
    L.push('BEGIN:VEVENT', `UID:${e.id}@cvenpoche`, `DTSTAMP:${st}`);
    if (e.allDay) { const n = new Date(e.start + 'T12:00:00'); n.setDate(n.getDate() + 1); L.push(`DTSTART;VALUE=DATE:${d(e.start)}`, `DTEND;VALUE=DATE:${d(ymdLocal(n))}`); }
    else L.push(`DTSTART:${d(e.start)}T${e.startTime.replace(':', '')}00`, `DTEND:${d(e.end)}T${e.endTime.replace(':', '')}00`);
    L.push(`SUMMARY:${icsEsc(e.title)}`); if (e.place) L.push(`LOCATION:${icsEsc(e.place)}`); if (e.note) L.push(`DESCRIPTION:${icsEsc(e.note)}`);
    if (!e.allDay) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Rappel', 'TRIGGER:-PT1H', 'END:VALARM');
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR'); return L.join('\r\n');
}
function agendaSheet() {
  const L = agendaEvents(), off = ui.agOff || (ui.agOff = {});
  openSheet(`<div class="sh"><h2>Agenda</h2><button class="ib" data-act="closesheet">✕</button></div>
   <div class="small muted">Entretiens et relances à venir. Coche ceux que tu veux envoyer. Ajoute la date et l’heure d’un entretien dans la fiche de la candidature.</div>
   <div>${L.length ? L.map(e => `<div class="skill"><button class="ib sm" data-act="agsel" data-v="${e.id}" aria-label="Choisir">${off[e.id] ? '☐' : '☑'}</button><span style="flex:1;${off[e.id] ? 'opacity:.5' : ''}"><b>${esc(e.title)}</b><br><span class="small muted">${fmtDate(e.start)}${e.allDay ? ' (journée)' : ' · ' + e.startTime.replace(':', ' h ') + ' – ' + e.endTime.replace(':', ' h ')}${e.place ? ' · ' + esc(e.place) : ''}</span></span></div>`).join('') : '<div class="empty small">Rien à venir : ajoute une date d’entretien ou de relance dans une candidature.</div>'}</div>
   ${L.length ? `<button class="btn" data-act="agcode">Copier le code pour AgenDam</button><div class="small muted">Ouvre ensuite l’appli AgenDam installée et appuie sur « Coller depuis CV en poche » : les rendez-vous arrivent directement dans l’appli.</div><div class="row2"><button class="btn ghost" data-act="agsend" style="flex:1">Ouvrir le lien (navigateur)</button><button class="btn ghost" data-act="agics" style="flex:1">Fichier .ics</button></div><div class="small muted">Le lien s’ouvre dans le navigateur, pas dans l’appli installée. Le fichier .ics marche avec Apple, Outlook et Google Agenda.</div>` : ''}`);
}

/* ============ événements ============ */
const val = el => el.type === 'checkbox' ? el.checked : (el.dataset.num ? Number(el.value) : el.value);
document.addEventListener('input', e => {
  const el = e.target, cv = ui.ed ? curCV() : null;
  if (el.dataset.u) { setPath(ui, el.dataset.u, val(el)); return; }
  if (!cv) return;
  if (el.dataset.p) { setPath(cv, el.dataset.p, val(el)); touch(cv); liveSoon(); }
  else if (el.dataset.l) { const it = cv.data[el.dataset.l].find(x => x.id === el.dataset.i); if (it) { it[el.dataset.k] = val(el); touch(cv); liveSoon(); } }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'fPdf' && el.files[0]) { importPdf(el.files[0]); el.value = ''; return; }
  if (el.id === 'fPhoto' && el.files[0]) { readPhoto(el.files[0]); el.value = ''; return; }
  if (el.id === 'fJson' && el.files[0]) { importJson(el.files[0]); el.value = ''; return; }
  if (el.dataset.r) render();
  if (el.dataset.p && /^show\./.test(el.dataset.p) || el.dataset.p === 'photo') { /* déjà enregistré */ }
});
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.d) { ui.open[d.dataset.d] = d.open; growAll(); } }, true);

const ACT = {
  nav: v => { ui.tab = v; ui.ed = null; render(); scrollTo(0, 0); },
  closesheet: () => closeSheet(),
  newcv: () => { closeSheet(); openSheet(`<div class="sh"><h2>Nouveau CV</h2><button class="ib" data-act="closesheet">✕</button></div><label class="f">Nom du CV<input data-u="nn" value="" placeholder="Ex. CV chef de projet"></label>
    <div class="row2"><button class="btn" data-act="docreate" data-v="blank" style="flex:1">CV vide</button><button class="btn ghost" data-act="docreate" data-v="sample" style="flex:1">Avec un exemple</button></div>`); ui.nn = ''; },
  docreate: v => { const cv = newCV(ui.nn || 'Mon CV', v === 'sample' ? sampleData() : null); S.cvs.push(cv); save(); closeSheet(); ui.ed = cv.id; ui.edTab = 'infos'; render(); scrollTo(0, 0); },
  importpdf: () => $('#fPdf').click(),
  doimport: () => doImport(),
  edit: (v, el) => { ui.ed = el.dataset.id; ui.edTab = 'infos'; ui.resetForm = 1; render(); scrollTo(0, 0); },
  back: () => { ui.ed = null; render(); },
  edtab: v => { ui.edTab = v; ui.resetForm = 1; render(); },
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
  rmphoto: () => { const cv = curCV(); cv.data.identity.photo = ''; cv.data.identity.photoSrc = ''; touch(cv); render(); },
  crop: () => { const cv = curCV(), i = cv.data.identity; openCrop(i.photoSrc || i.photo); },
  cropok: () => cropSave(),
  lzoom: (v, el) => { ui.lz = Math.max(.6, Math.min(2.4, (ui.lz || 1) + (+el.dataset.d) * .25)); updLive(); },
  auto: () => autoLayout(),
  undoauto: () => { const cv = curCV(); if (!ui.undo || ui.undo.id !== cv.id) return; Object.assign(cv, clone(ui.undo.s)); ui.undo = null; touch(cv); render(); toast('Auto annulé'); },
  eye: (v, el) => { const cv = curCV(), k = el.dataset.k; cv.show[k] = cv.show[k] === false ? true : false; touch(cv); render(); },
  szm: (v, el) => { const cv = curCV(), k = el.dataset.k; cv.sz = cv.sz || {}; cv.sz[k] = Math.max(.7, Math.min(1.3, Math.round((szOf(cv, k) + (+el.dataset.d) * .05) * 100) / 100)); if (cv.sz[k] === 1) delete cv.sz[k]; touch(cv); render(); },
  colmv: (v, el) => { const cv = curCV(), k = el.dataset.k; cv.col = cv.col || {}; cv.col[k] = colOf(cv, k) === 'side' ? 'main' : 'side'; touch(cv); render(); },
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
  demo: () => demoOn(),
  aitoggle: () => { AI().on = !AI().on; save(); render(); },
  aisave: () => { const c = AI(); c.url = (ui.aiu || '').trim().replace(/\/+$/, ''); c.token = (ui.ait || '').trim(); save(); toast('Réglages IA enregistrés'); render(); },
  aitest: async () => { const c = AI(); c.url = (ui.aiu || '').trim().replace(/\/+$/, ''); c.token = (ui.ait || '').trim(); const on = c.on; c.on = true; const r = await aiCall('ping', {}); c.on = on; if (r) { toast('Connexion OK (' + (r.provider === 'claude' ? 'Claude' : 'Workers AI') + ')'); save(); } },
  aiprofil: async () => { const cv = curCV(); if (!cv) return; const r = await aiCall('profil', { titre: cv.data.identity.titre, resume: cv.data.resume, cv: cvPlain(cv) }); if (r) aiSheet('Profil proposé', r.text, t => { cv.data.resume = t; touch(cv); closeSheet(); render(); toast('Profil remplacé'); }); },
  aipuces: async (v, el) => { const cv = curCV(), e = cv && cv.data.experiences.find(x => x.id === el.dataset.i); if (!e) return; if (!(e.desc || '').trim()) { toast('Écris d’abord quelques missions, même brutes'); return; } const r = await aiCall('puces', { poste: e.poste, entreprise: e.entreprise, text: e.desc }); if (r) aiSheet('Puces proposées', r.text, t => { e.desc = t; touch(cv); closeSheet(); render(); toast('Missions remplacées'); }); },
  ailettre: async () => { const o = ui.offre, cv = S.cvs.find(c => c.id === o.cvId); if (!cv || !o.text.trim()) { toast('Colle d’abord l’annonce'); return; } const r = await aiCall('lettre', { poste: o.poste, entreprise: o.entreprise, annonce: o.text, cv: cvPlain(cv) }); if (r) aiSheet('Lettre de motivation', r.text, null); },
  aientretien: async () => { const o = ui.offre, cv = S.cvs.find(c => c.id === o.cvId); if (!cv || !o.text.trim()) { toast('Colle d’abord l’annonce'); return; } const r = await aiCall('entretien', { poste: o.poste, entreprise: o.entreprise, annonce: o.text, cv: cvPlain(cv) }); if (r) aiSheet('Préparer l’entretien', r.text, null); },
  aiuse: () => { const t = ($('#aiTxt') || {}).value || ''; if (ui.aiRes && ui.aiRes.apply && t.trim()) ui.aiRes.apply(t.trim()); },
  aicopy: () => { const t = ($('#aiTxt') || {}).value || ''; navigator.clipboard?.writeText(t).then(() => toast('Texte copié'), () => toast('Copie impossible : sélectionne le texte')); },
  offhelp: () => { ui.tab = 'guide'; ui.gcat = 'offre'; render(); scrollTo(0, 0); },
  gomet: () => { ui.tab = 'regl'; ui.stab = 'met'; render(); scrollTo(0, 0); },
  mjmore: () => { ui.mjAll = !ui.mjAll; render(); },
  mjsearch: v => { ui.so.q = v.split(' (')[0].split(' ou ')[0]; ui.so.init = 1; render(); document.getElementById('sojobs')?.scrollIntoView({ behavior: 'smooth' }); toast('Choisis un site ci-dessous'); },
  mjcv: v => { const cv = S.cvs.find(c => c.id === ui.offre.cvId) || S.cvs[0]; if (!cv) return; const c = clone(cv); c.id = uid(); c.name = cv.name + ' – ' + v.split(' (')[0]; c.created = c.updated = Date.now(); c.data.identity.titre = v.split(' (')[0]; delete c.review; S.cvs.push(c); save(); ui.ed = c.id; ui.edTab = 'infos'; ui.resetForm = 1; toast('CV créé : adapte le profil et les compétences'); render(); scrollTo(0, 0); },
  mjhide: v => { (S.set.hideJobs || (S.set.hideJobs = [])).push(v); save(); render(); },
  mjunhide: v => { S.set.hideJobs = (S.set.hideJobs || []).filter(x => x !== v); save(); render(); },
  domtoggle: v => { const d = S.set.doms || (S.set.doms = []); const i = d.indexOf(v); if (i >= 0) d.splice(i, 1); else d.push(v); save(); render(); },
  onlydoms: () => { S.set.onlyDoms = !S.set.onlyDoms; save(); render(); },
  mjsug: v => { const m = ui.mj || (ui.mj = { n: '', k: '', d: '' }), r = suggestJob(v, m);
    if (!r) { toast(v === 'offre' ? 'Colle d’abord une annonce dans l’onglet Offre' : v === 'name' ? 'Écris d’abord un nom de métier' : 'Pas assez de texte dans ton CV', 4000); return; }
    m.k = r.k.join(', '); if (!m.n && r.n) m.n = r.n; if (r.d) m.d = r.d; toast('Suggestions ajoutées : relis, corrige, puis « Ajouter »', 4500); render(); },
  mjadd: () => { const m = ui.mj || {}; if (!(m.n || '').trim() || !(m.k || '').trim()) { toast('Indique un nom et des mots-clés'); return; } (S.set.myJobs || (S.set.myJobs = [])).push({ n: m.n.trim(), d: m.d || '', k: m.k.split(/[,;\n]/).map(x => x.trim()).filter(Boolean).join(',') }); ui.mj = { n: '', k: '', d: '' }; save(); render(); toast('Métier ajouté'); },
  mjdel: v => { S.set.myJobs = (S.set.myJobs || []).filter(x => x.n !== v); save(); render(); },
  agenda: () => agendaSheet(),
  agsel: v => { const off = ui.agOff || (ui.agOff = {}); off[v] = !off[v]; agendaSheet(); },
  agsend: () => { const e = agPicked(); if (!e.length) { toast('Coche au moins un rendez-vous'); return; } window.open(agLink(e), '_blank'); },
  agcode: () => { const e = agPicked(); if (!e.length) { toast('Coche au moins un rendez-vous'); return; } const c = agCode(e); (navigator.clipboard?.writeText(c) || Promise.reject()).then(() => toast('Code copié : ouvre AgenDam et colle-le', 4500), () => { closeSheet(); openSheet(`<div class="sh"><h2>Code AgenDam</h2><button class="ib" data-act="closesheet">✕</button></div><div class="small muted">Copie ce texte en entier, puis colle-le dans AgenDam.</div><textarea readonly rows="6" onfocus="this.select()">${esc(c)}</textarea>`); }); },
  agcopy: () => { const e = agPicked(); if (!e.length) { toast('Coche au moins un rendez-vous'); return; } const u = agLink(e); if (navigator.share) navigator.share({ url: u, title: 'Rendez-vous CV en poche' }).catch(() => { }); else navigator.clipboard?.writeText(u).then(() => toast('Lien copié'), () => toast('Copie impossible')); },
  agics: () => { const e = agPicked(); if (!e.length) { toast('Coche au moins un rendez-vous'); return; } download('rendez-vous-cv.ics', buildIcs(e), 'text/calendar'); },
  jobsite: v => { const so = ui.so; if (!so.q.trim()) { toast('Indique d’abord un métier'); return; } const x = getSites().find(y => y.id === v); if (x) window.open(siteUrl(x.u, so.q, so.l), '_blank', 'noopener'); },
  sites: () => siteSheet(),
  sitetoggle: (v) => { const x = getSites().find(y => y.id === v); if (x) { x.off = !x.off; save(); siteSheet(); render(); } },
  sitedel: v => { S.set.sites = getSites().filter(y => y.id !== v); save(); siteSheet(); render(); },
  sitereset: () => { S.set.sites = clone(JOBSITES); save(); siteSheet(); render(); },
  siteadd: () => { const sn = ui.sn || {}; let u = (sn.u || '').trim(), n = (sn.n || '').trim(); if (!/^https?:\/\//.test(u)) { toast('Colle une adresse qui commence par https://'); return; } if (!n) { try { n = new URL(u).hostname.replace(/^www\./, ''); } catch { n = 'Site'; } } const so = ui.so, rp = (t, key) => { const v = (key || '').trim(); if (!v) return t; const tk = key === so.q ? '{q}' : '{l}', e = encodeURIComponent(v); for (const f of [e, e.replace(/%20/g, '+'), e.replace(/%20/g, '-'), v.replace(/ /g, '+'), v.replace(/ /g, '-'), v]) if (f) t = t.split(f).join(tk); return t; }; if (!u.includes('{q}')) u = rp(u, so.q); if (!u.includes('{l}')) u = rp(u, so.l); getSites().push({ id: uid(), n, u }); ui.sn = { n: '', u: '' }; save(); siteSheet(); render(); toast(u.includes('{q}') ? 'Site ajouté' : 'Site ajouté (sans recherche : indique ton métier dans l’adresse)'); },
  pasteoffre: () => { if (!navigator.clipboard?.readText) { toast('Colle à la main dans la zone de texte'); return; } navigator.clipboard.readText().then(t => { t = (t || '').trim(); if (!t) { toast('Le presse-papiers est vide'); return; } if (/^https?:\/\/\S+$/.test(t)) { toast('C’est un lien : ouvre la page et copie le texte de l’annonce'); return; } ui.offre.text = t; ui.offre.res = null; render(); toast('Annonce collée'); }, () => toast('Accès refusé : colle à la main dans la zone de texte')); },
  copydl: () => { navigator.clipboard?.writeText(ui.dl || '').then(() => toast('Copié'), () => { const t = $('#dltxt'); t.select(); toast('Sélectionné : copie avec le menu'); }); },
  demoquit: () => demoOff(),
  jobanalyze: (v, el) => { const j = S.jobs.find(x => x.id === el.dataset.id); if (!j) return; const cv = S.cvs.find(c => c.id === j.cvId) || S.cvs[0]; if (!cv) return; ui.offre = { text: j.offre, cvId: cv.id, entreprise: j.entreprise, poste: j.poste, res: analyzeOffer(j.offre, cv), mask: true, settitle: false }; closeSheet(); ui.tab = 'offre'; ui.ed = null; render(); scrollTo(0, 0); },
  set: (v, el) => { S.set[el.dataset.k] = v; save(); applySettings(); render(); },
  checkupd: () => checkUpdate(),
  applyupd: () => applyUpdate(),
  expjson: () => download('cv-en-poche-sauvegarde.json', JSON.stringify(S), 'application/json'),
  impjson: () => $('#fJson').click(),
  resetall: () => { if (S.demo) { demoOff(); return; } if (!confirm('Effacer tous les CV, candidatures et réglages ?') || !confirm('Dernière confirmation : cette action est définitive.')) return; S = defaults(); saveNow(); ui.ed = null; applySettings(); render(); },
};
document.addEventListener('click', e => {
  if (e.target.id === 'sheetbg') { closeSheet(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = ACT[el.dataset.act]; if (!f) return;
  e.stopPropagation(); f(el.dataset.v, el);
});

async function download(name, text, type) {
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (navigator.share && navigator.canShare) {
    for (const t of [type, 'text/plain']) {
      try {
        const f = new File([text], name, { type: t });
        if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
    }
  }
  if (!isIOS) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return;
  }
  ui.dl = text; ui.dlName = name;
  openSheet(`<div class="sh"><h2>Copier la sauvegarde</h2><button class="ib" data-act="closesheet">✕</button></div><div class="small muted">Le partage de fichier n’est pas disponible ici. Copie le texte, puis colle-le dans Notes ou Fichiers (nom conseillé : ${esc(name)}).</div><textarea id="dltxt" rows="6" readonly style="width:100%;border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--bg)">${esc(text)}</textarea><button class="btn" data-act="copydl">Copier tout</button>`);
}
async function importJson(file) {
  try {
    if (S.demo) { toast('Quitte d’abord la démo'); return; }
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
checkUpdate(true);
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { }));
