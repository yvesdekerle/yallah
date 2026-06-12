// Generates `public/admin/activities.html` (served at /admin/activities on
// Vercel) — the shared review tool to merge/split look-alike activities and
// shrink the 198-item list.
//
//   node scripts/build-duplicates-review.mjs
//
// Reads src/data/activities.json + src/data/photos.json, computes candidate
// similarity clusters (union-find over token-overlap pairs), and embeds them in
// a self-contained HTML page. The page persists the shared triage state to
// Firestore (`activityTriage/current`) behind an optimistic version lock — no
// sign-in, the doc is deliberately public in firestore.rules. localStorage is
// kept as a local cache + single-level undo. The Firebase web config is
// embedded at build time from .env.local / .env (public values — the app
// bundle ships the same).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const activities = JSON.parse(readFileSync(join(root, 'src/data/activities.json'), 'utf8'));
const photos = JSON.parse(readFileSync(join(root, 'src/data/photos.json'), 'utf8'));

const strip = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const STOP = new Set(
  'a au aux avec ou et de des du la le les un une en dans sur pour par sa son ses leur leurs ce cette ces qui que quoi dont pas plus tres tout tous toute toutes votre vos notre nos ile ilot iles ilots lile lilot depuis vers chez puis entre sous'.split(
    ' '
  )
);
const toks = (s) =>
  strip(s)
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

const meta = activities.map((x) => ({
  id: x.id,
  title: x.title,
  cat: x.category,
  loc: x.location,
  tset: new Set([...toks(x.title), ...toks(x.location)]),
  dset: new Set(toks(x.description)),
}));

const jac = (A, B) => {
  if (!A.size || !B.size) return 0;
  let i = 0;
  for (const v of A) if (B.has(v)) i++;
  return i / (A.size + B.size - i);
};

// Build candidate edges. An edge is a suggestion that two activities overlap.
const edges = [];
for (let i = 0; i < meta.length; i++) {
  for (let j = i + 1; j < meta.length; j++) {
    const titleSim = jac(meta[i].tset, meta[j].tset);
    const descSim = jac(meta[i].dset, meta[j].dset);
    const sameCat = meta[i].cat === meta[j].cat ? 0.05 : 0;
    const score = titleSim * 0.7 + descSim * 0.3 + sameCat;
    if (score >= 0.28 || titleSim >= 0.4) {
      const shared = [...meta[i].tset].filter((t) => meta[j].tset.has(t));
      edges.push({ a: meta[i].id, b: meta[j].id, score: +score.toFixed(3), titleSim: +titleSim.toFixed(2), shared });
    }
  }
}

// Union-find → connected components form the seed groups.
const parent = new Map(meta.map((m) => [m.id, m.id]));
const find = (x) => {
  while (parent.get(x) !== x) {
    parent.set(x, parent.get(parent.get(x)));
    x = parent.get(x);
  }
  return x;
};
const union = (a, b) => parent.set(find(a), find(b));
for (const e of edges) union(e.a, e.b);

const comps = new Map();
for (const m of meta) {
  const r = find(m.id);
  if (!comps.has(r)) comps.set(r, []);
  comps.get(r).push(m.id);
}

// Keep only multi-member components as suggested groups; order by max edge score.
const edgeByPair = new Map(edges.map((e) => [`${e.a}|${e.b}`, e]));
const pairReason = (a, b) => edgeByPair.get(`${a}|${b}`) || edgeByPair.get(`${b}|${a}`);
let groups = [...comps.values()].filter((ids) => ids.length >= 2);
groups = groups.map((ids) => {
  let maxScore = 0;
  const reasons = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const r = pairReason(ids[i], ids[j]);
      if (r) {
        maxScore = Math.max(maxScore, r.score);
        if (r.shared.length) reasons.push(...r.shared);
      }
    }
  const freq = {};
  reasons.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((e) => e[0]);
  // Default category name = the first (representative) activity's title.
  const name = activities.find((a) => a.id === ids[0]).title;
  return { ids, maxScore: +maxScore.toFixed(2), keywords, name };
});
groups.sort((a, b) => b.maxScore - a.maxScore);

// Full activity payload for the page. `photo` is the app-absolute hero path.
const slim = activities.map((x) => ({
  ...x,
  photo: (photos[x.id] && photos[x.id][0]) || '/photos/hero.jpg',
}));

const inGroup = new Set(groups.flatMap((g) => g.ids));
const singletons = slim.filter((s) => !inGroup.has(s.id)).map((s) => s.id);

const DATA = { activities: slim, groups, singletons, generatedFrom: activities.length };

const html = String.raw`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Yallah — Regroupement des activités en double</title>
<style>
  :root {
    --bg: #14101a; --card: #221a2e; --line: #3a3047; --ink: #f4eefb; --mut: #b3a6c4;
    --coral: #ff6b6b; --gold: #ffcb45; --green: #22c268; --blue: #5b9dff; --pink: #ff5b9e;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--ink); }
  header { position: sticky; top: 0; z-index: 10; background: #1a1422ee; backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line); padding: 14px 20px; }
  h1 { margin: 0 0 4px; font-size: 19px; }
  .sub { color: var(--mut); font-size: 13px; }
  .bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 5px 11px; font-size: 13px; }
  .stat b { color: var(--gold); }
  button { font: inherit; cursor: pointer; border-radius: 9px; border: 1px solid var(--line);
    background: var(--card); color: var(--ink); padding: 7px 12px; }
  button:hover { border-color: var(--mut); }
  .btn-primary { background: var(--coral); border-color: var(--coral); color: #fff; font-weight: 600; }
  .btn-ghost { background: transparent; }
  .layout { display: flex; gap: 20px; align-items: flex-start; max-width: 1560px; margin: 0 auto; padding: 20px; }
  main { flex: 1; min-width: 0; }
  aside { position: sticky; top: calc(var(--header-h, 96px) + 14px); width: 460px; flex: none; max-height: calc(100vh - var(--header-h, 96px) - 28px); display: flex; flex-direction: column; }
  aside h2 { font-size: 15px; margin: 0 0 4px; }
  aside .ahint { color: var(--mut); font-size: 12px; margin: 0 0 10px; }
  #cat-list { overflow-y: auto; flex: 1; min-height: 0; max-height: calc(100vh - var(--header-h, 96px) - 150px); display: flex; flex-direction: column; gap: 16px; padding-right: 8px; }
  #cat-list::-webkit-scrollbar { width: 10px; }
  #cat-list::-webkit-scrollbar-thumb { background: var(--line); border-radius: 8px; border: 2px solid var(--bg); }
  #cat-list::-webkit-scrollbar-thumb:hover { background: var(--mut); }
  #cat-list { scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
  .cat-del { flex: none; background: transparent; border: 1px solid var(--line); color: var(--mut);
    border-radius: 8px; padding: 3px 9px; font-size: 13px; line-height: 1; }
  .cat-del:hover { border-color: var(--coral); color: var(--coral); }
  .cat-row { display: flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--line);
    border-radius: 12px; padding: 11px 13px; min-height: 50px; transition: border-color .12s, background .12s; }
  .cat-row.drop-hover { border-color: var(--coral); background: #ff6b6b22; }
  .cat-name { flex: 1; font-size: 14px; font-weight: 600; cursor: text; white-space: normal; word-break: break-word; line-height: 1.3; min-width: 0; }
  .cat-name:hover { text-decoration: underline dotted; }
  .cat-edit { flex: none; padding: 2px 7px; font-size: 12px; line-height: 1; color: var(--mut); border-radius: 7px; }
  .cat-edit:hover { color: var(--coral); border-color: var(--coral); }
  .cat-count { font-size: 13px; color: var(--mut); background: #ffffff14; border-radius: 20px; padding: 3px 11px; cursor: pointer; flex: none; }
  .panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .panel-head h2 { margin: 0; flex: 1; }
  #cat-sort { font: inherit; font-size: 12.5px; background: var(--card); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; padding: 5px 8px; }
  #cat-search { font: inherit; font-size: 13px; background: var(--card); color: var(--ink); border: 1px solid var(--line); border-radius: 9px; padding: 8px 11px; margin-bottom: 10px; flex: none; }
  #cat-search:focus { outline: none; border-color: var(--coral); }
  .new-cat { margin-top: 10px; border: 2px dashed var(--line); border-radius: 12px; padding: 16px 12px; text-align: center;
    color: var(--mut); font-size: 12.5px; transition: border-color .12s, background .12s, color .12s; flex: none; }
  .new-cat.drop-hover { border-color: var(--gold); background: #ffcb4522; color: var(--ink); }
  .name-input { font: inherit; font-weight: 600; font-size: 13px; flex: 1; background: #100c16; color: var(--ink);
    border: 1px solid var(--coral); border-radius: 7px; padding: 3px 6px; min-width: 0; }
  .card[draggable="true"] { cursor: grab; }
  .card.dragging { opacity: 0.4; outline: 2px dashed var(--coral); }
  .group-title { display: inline-flex; align-items: center; gap: 7px; }
  .gname { cursor: text; font-weight: 600; }
  .gname:hover { text-decoration: underline dotted; }
  .gname-edit { padding: 2px 7px; font-size: 12px; line-height: 1; color: var(--mut); border-radius: 7px; }
  .gname-edit:hover { color: var(--coral); border-color: var(--coral); }
  @media (max-width: 860px) { .layout { flex-direction: column; } aside { position: static; width: 100%; max-height: none; } #cat-list { max-height: 240px; } }
  .group { background: var(--card); border: 1px solid var(--line); border-radius: 16px; margin-bottom: 22px; overflow: hidden; scroll-margin-top: calc(var(--header-h, 96px) + 16px); }
  .group.decided-merge { border-color: var(--coral); }
  .group.decided-keep { border-color: var(--green); }
  .group.drop-hover { outline: 3px dashed var(--coral); outline-offset: 3px; }
  .group-head { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--line);
    background: #00000022; flex-wrap: wrap; }
  .group-title { font-weight: 600; font-size: 15px; }
  .kw { color: var(--mut); font-size: 12px; }
  .kw span { background: #ffffff14; border-radius: 6px; padding: 1px 6px; margin-right: 4px; }
  .spacer { flex: 1; }
  .decision { display: inline-flex; gap: 6px; }
  .decision button { font-size: 13px; }
  .decision button.on-merge { background: var(--coral); border-color: var(--coral); color: #fff; }
  .decision button.on-keep { background: var(--green); border-color: var(--green); color: #06210f; font-weight: 600; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; padding: 14px; }
  .card { background: #1a1422; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; position: relative; }
  .card.rep { outline: 2px solid var(--gold); }
  .card.lowstar { border-color: #ff4d4d; box-shadow: 0 0 0 2px #ff4d4d; }
  .card.lowstar .cardstars { color: #ff4d4d; }
  .card.discarded { background: #0d0a12; }
  .card.discarded .t, .card.discarded .d { text-decoration: line-through; color: var(--mut); }
  .card.discarded .ph { filter: grayscale(1) brightness(.33); }
  .card.discarded .body { opacity: .6; }
  .card-x { position: absolute; left: 0; top: 0; right: 0; height: 120px; display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,.42); pointer-events: none; z-index: 2; }
  .card-x b { color: #ff3b3b; font-size: 82px; font-weight: 900; line-height: 1; text-shadow: 0 2px 10px #000; }
  .card-x b.skull { color: #fff; font-size: 64px; font-weight: 400; }
  /* Merged-away cards (not the kept one): darkening veil only, no cross, normal buttons. */
  .card.faded { background: #0d0a12; }
  .card.faded .ph { filter: grayscale(.7) brightness(.32); }
  .card.faded .body { opacity: .5; }
  .dropflag { position: absolute; top: 6px; left: 6px; background: #6b6b6b; color: #fff;
    font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
  .card .acts button.undrop { background: var(--blue); border-color: var(--blue); color: #06183a; font-weight: 600; }
  .card .ph { height: 120px; background: #000 center/cover no-repeat; }
  .card .body { padding: 9px 11px; flex: 1; display: flex; flex-direction: column; gap: 5px; }
  .card .t { font-weight: 600; font-size: 13.5px; line-height: 1.3; }
  .card .m { color: var(--mut); font-size: 11.5px; }
  .card .cardstars { color: var(--gold); font-size: 12.5px; letter-spacing: 1px; }
  .card .diffbar { background: #e11d2a; color: #fff; font-weight: 800; font-size: 15px; letter-spacing: .5px;
    text-align: center; padding: 7px 8px; text-transform: uppercase; }
  .card.isdiff { border-color: #e11d2a; }
  .card .d { color: #d8cee6; font-size: 12px; max-height: 4.5em; overflow: hidden; }
  .card .links { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 8px; }
  .cardlink { font-size: 12px; text-decoration: none; color: var(--blue); background: #5b9dff1a;
    border: 1px solid #5b9dff44; border-radius: 7px; padding: 3px 9px; transition: background .12s; }
  .cardlink:hover { background: #5b9dff33; }
  .card .acts { display: flex; gap: 6px; padding: 8px 11px; border-top: 1px solid var(--line); flex-wrap: wrap; }
  .card .acts button { font-size: 11.5px; padding: 4px 8px; }
  .repflag { position: absolute; top: 6px; left: 6px; background: var(--gold); color: #2a1c00;
    font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
  .num { position: absolute; top: 6px; right: 6px; background: #000a; font-size: 10.5px; padding: 2px 7px; border-radius: 20px; color: var(--mut); }
  select { font: inherit; background: var(--card); color: var(--ink); border: 1px solid var(--line); border-radius: 7px; padding: 4px 6px; max-width: 180px; }
  .filters { margin: 0 0 18px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .filters input { background: var(--card); color: var(--ink); border: 1px solid var(--line); border-radius: 9px; padding: 7px 11px; min-width: 220px; }
  .pill { font-size: 12px; color: var(--mut); }
  dialog { background: var(--card); color: var(--ink); border: 1px solid var(--line); border-radius: 14px; max-width: 560px; width: 92%; padding: 0; }
  dialog::backdrop { background: #000a; }
  .dlg-head { padding: 14px 18px; border-bottom: 1px solid var(--line); font-weight: 600; display:flex; align-items:center; }
  .dlg-body { padding: 14px 18px; max-height: 60vh; overflow: auto; }
  .dlg-foot { padding: 12px 18px; border-top: 1px solid var(--line); display: flex; gap: 10px; justify-content: flex-end; }
  .row { display: flex; gap: 10px; align-items: center; padding: 7px 9px; border: 1px solid var(--line); border-radius: 9px; margin-bottom: 7px; cursor: pointer; }
  .row:hover { border-color: var(--mut); }
  .row .ph { width: 44px; height: 44px; border-radius: 7px; background: #000 center/cover; flex: none; }
  textarea { width: 100%; height: 320px; background: #100c16; color: var(--ink); border: 1px solid var(--line); border-radius: 9px; padding: 10px; font: 12px/1.5 ui-monospace, monospace; }
  .hint { color: var(--mut); font-size: 12.5px; margin: 0 0 14px; }
  .alert { border-radius: 10px; padding: 11px 13px; margin: 0 0 14px; font-size: 13px; line-height: 1.5; }
  .alert.warn { background: #e11d2a22; border: 1px solid #e11d2a; color: #ffd7da; }
  .alert.ok { background: #22c26822; border: 1px solid var(--green); color: #c8f5d8; }
  .alert .alist { color: var(--ink); font-size: 12px; }
  .field { margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; }
  .field label { font-size: 12px; color: var(--mut); font-weight: 600; }
  .field input, .field select, .field textarea { font: inherit; font-size: 14px; background: #100c16; color: var(--ink);
    border: 1px solid var(--line); border-radius: 9px; padding: 8px 10px; width: 100%; }
  .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--coral); }
  .desc-input { height: 90px; resize: vertical; line-height: 1.45; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .checks { display: flex; gap: 16px; flex-wrap: wrap; padding-top: 2px; }
  .ck { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink); font-weight: 400; }
  .ck input { width: auto; }
  .empty { color: var(--mut); padding: 30px; text-align: center; }
  #scroll-counter { position: fixed; right: 18px; bottom: 18px; z-index: 50; background: #1a1422ee; backdrop-filter: blur(8px);
    border: 1px solid var(--line); border-radius: 22px; padding: 9px 16px; font-size: 14px; font-weight: 700; color: var(--ink);
    box-shadow: 0 8px 24px #0008; pointer-events: none; }
  #scroll-counter b { color: var(--gold); }
  .section-head { font-size: 16px; font-weight: 700; margin: 22px 0 12px; padding-bottom: 7px;
    border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 9px; }
  .section-head:first-child { margin-top: 0; }
  .sh-stars { color: var(--gold); letter-spacing: 1px; font-size: 17px; }
  #cloud-status b { color: var(--gold); }
  #conflict-bar { margin-top: 10px; background: #e11d2a22; border: 1px solid #e11d2a; color: #ffd7da;
    border-radius: 10px; padding: 9px 12px; font-size: 13px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
</style>
</head>
<body>
<header>
  <h1>Regroupement des activités en double</h1>
  <div class="sub">À partir de <b id="src-count"></b> activités. Décide pour chaque groupe : <b>fusionner</b> (on n'en garde qu'une) ou <b>garder séparé</b>. Tu peux sortir une activité d'un groupe, la déplacer ailleurs, ou créer un groupe.</div>
  <div class="bar">
    <span class="stat">Catégories : <b id="st-groups">0</b></span>
    <span class="stat">À fusionner : <b id="st-merge">0</b></span>
    <span class="stat">Écartées : <b id="st-discard">0</b></span>
    <span class="stat">Gain estimé : <b id="st-gain">0</b> activités en moins</span>
    <span class="stat">Total après tri : <b id="st-final">0</b></span>
    <span class="spacer"></span>
    <span class="stat" id="cloud-status">☁ chargement…</span>
    <button class="btn-ghost" id="btn-undo" style="display:none">↩ Annuler</button>
    <button class="btn-ghost" id="btn-reset">Réinitialiser</button>
  </div>
  <div id="conflict-bar" style="display:none">
    ⚠ <b id="conflict-who"></b> a enregistré une version plus récente du tri — tes modifications ne seront
    plus enregistrées tant que tu n'as pas chargé sa version.
    <button class="btn-primary" id="conflict-reload">Charger sa version</button>
    <span class="pill">ton tri actuel restera annulable via « ↩ Annuler »</span>
  </div>
</header>
<div class="layout">
  <main>
    <div class="filters">
      <input id="search" placeholder="Filtrer les catégories (titre, lieu, mot-clé)…" />
      <label class="pill"><input type="checkbox" id="only-undecided" /> Seulement les indécis</label>
      <span class="spacer"></span>
      <button class="btn-primary" id="btn-add-activity">+ Ajouter une activité</button>
    </div>
    <p class="hint">Astuce : <b>glisse une carte</b> vers une catégorie du panneau de droite pour l'y déplacer, ou vers <b>« Nouvelle catégorie »</b> pour en créer une nommée d'après l'activité · <b>« Représentant »</b> = la carte gardée si la catégorie est fusionnée · <b>« Ne pas garder »</b> = écarte l'activité de la liste finale. Décisions sauvegardées automatiquement.</p>
    <div id="groups"></div>
  </main>
  <aside>
    <div class="panel-head">
      <h2>Catégories</h2>
      <select id="cat-sort" title="Trier les catégories">
        <option value="count">Nb d'activités ↓</option>
        <option value="alpha">A → Z</option>
      </select>
    </div>
    <p class="ahint">Dépose une activité ici pour la ranger · ✎ pour renommer · n° pour y aller.</p>
    <input id="cat-search" placeholder="Rechercher une catégorie…" />
    <div id="cat-list"></div>
    <div class="new-cat" id="new-cat">+ Nouvelle catégorie<br><span class="pill">déposer une activité ici</span></div>
  </aside>
</div>

<div id="scroll-counter" title="Activités déjà passées en scroll"></div>

<dialog id="move-dlg">
  <div class="dlg-head">Déplacer / ajouter à un groupe</div>
  <div class="dlg-body" id="move-body"></div>
  <div class="dlg-foot"><button id="move-close">Fermer</button></div>
</dialog>
<dialog id="add-dlg">
  <div class="dlg-head">Ajouter une activité</div>
  <div class="dlg-body">
    <div class="field"><label for="f-title">Titre *</label><input id="f-title" placeholder="ex. Randonnée de la Vallée de Ferney" /></div>
    <div class="field"><label for="f-cat">Catégorie (thème)</label><select id="f-cat"></select></div>
    <div class="form-grid">
      <div class="field"><label for="f-loc">Lieu</label><input id="f-loc" placeholder="ex. Sud-est" /></div>
      <div class="field"><label for="f-rating">Note</label><select id="f-rating"></select></div>
    </div>
    <div class="form-grid">
      <div class="field"><label for="f-dur">Durée</label><input id="f-dur" placeholder="ex. ~3h" /></div>
      <div class="field"><label for="f-price">Prix</label><input id="f-price" placeholder="ex. ~20 €/pers" /></div>
    </div>
    <div class="field"><label for="f-transit">Trajet depuis Tamarin</label><input id="f-transit" placeholder="ex. ~45 min" /></div>
    <div class="field"><label for="f-difficulty">Difficulté</label><select id="f-difficulty"></select></div>
    <div class="field"><label for="f-desc">Description</label><textarea id="f-desc" class="desc-input" placeholder="Quelques lignes sur l'activité…"></textarea></div>
    <div class="field"><label>Tags</label>
      <span class="checks">
        <label class="ck"><input type="checkbox" id="f-pepite" /> 💎 Pépite</label>
        <label class="ck"><input type="checkbox" id="f-secret" /> 🗝️ Secret</label>
        <label class="ck"><input type="checkbox" id="f-journee" /> 🌞 Journée</label>
      </span>
    </div>
    <p class="hint" id="add-err" style="color:#ff6b6b"></p>
  </div>
  <div class="dlg-foot">
    <button id="add-cancel">Annuler</button>
    <button class="btn-primary" id="add-save">Ajouter l'activité</button>
  </div>
</dialog>
<script id="data" type="application/json">${JSON.stringify(DATA)}</script>
<script>
const DATA = JSON.parse(document.getElementById('data').textContent);
const BY = Object.fromEntries(DATA.activities.map(a => [a.id, a]));
const LS = 'yallah.dedup.v1';

// Empty, pre-named categories pinned at the top, ready to receive drops.
const FIXED_CATS = [
  { id: 'cat-rando', name: 'Randonnées' },
  { id: 'cat-plage', name: 'Plage' },
];
const emptyCat = f => ({ id: f.id, ids: [], keywords: [], maxScore: null, name: f.name, decision: null, rep: null });
// A unique (un-grouped) activity becomes its own single-item category.
const singleCat = id => ({ id: 'single-' + id, ids: [id], keywords: [], maxScore: null, name: BY[id].title, decision: null, rep: id });

// Ids of every 2★ and 3★ activity — pre-discarded by default.
const ratings23 = () => DATA.activities.filter(a => a.rating === 2 || a.rating === 3).map(a => a.id);

// One-time auto-grouping rules.
const HIKE_CAT = '🏔️ Randonnée & Sommets';
const ASIDE_IDS = ['a057'];                                            // Morne Brabant hike — stays standalone, beside the rest
const BEACH_IDS = ['a075', 'a076', 'a081', 'a097', 'a099', 'a102', 'a107']; // the actual beaches
const EXTRA_DISCARD = ['a019'];                                        // Kitesurf au Morne → ne pas garder
function pullFrom(s, id) {
  s.groups.forEach(g => { if (g.ids.includes(id)) { g.ids = g.ids.filter(x => x !== id); if (g.rep === id) g.rep = g.ids[0] || null; } });
}
function autoMoveTo(s, id, targetId) {
  pullFrom(s, id);
  const t = s.groups.find(g => g.id === targetId);
  if (t && !t.ids.includes(id)) t.ids.push(id);
}
function applyAutoGrouping(s) {
  // Hikes (except the "aside" ones) → Randonnées
  DATA.activities.filter(a => a.category === HIKE_CAT && !ASIDE_IDS.includes(a.id)).forEach(a => autoMoveTo(s, a.id, 'cat-rando'));
  // Beaches → Plage
  BEACH_IDS.forEach(id => autoMoveTo(s, id, 'cat-plage'));
  // Aside activities → their own standalone category
  ASIDE_IDS.forEach(id => { pullFrom(s, id); if (!s.groups.some(g => g.ids.includes(id))) s.groups.push(singleCat(id)); });
  // Extra one-off discards
  const dset = new Set(s.discarded);
  EXTRA_DISCARD.forEach(id => dset.add(id));
  s.discarded = [...dset];
  // The thematic buckets keep all activities separate; drop emptied categories.
  ['cat-rando', 'cat-plage'].forEach(cid => { const g = s.groups.find(x => x.id === cid); if (g && g.ids.length > 1) g.decision = 'keep'; });
  const fixed = new Set(FIXED_CATS.map(f => f.id));
  s.groups = s.groups.filter(g => g.ids.length > 0 || fixed.has(g.id));
}

// Monuments / heritage thematic buckets (one-time grouping).
const MONUMENT_CATS = [
  { id: 'cat-eglises',    name: 'Églises & lieux chrétiens',      ids: ['a158', 'a173', 'a164', 'a171', 'a178'] },
  { id: 'cat-temples',    name: 'Temples, pagodes & mosquées',    ids: ['a143', 'a146', 'a170', 'a157', 'a177', 'a179'] },
  { id: 'cat-monuments',  name: 'Monuments & mémoriaux',          ids: ['a151', 'a147', 'a182', 'a181', 'a180'] },
  { id: 'cat-forts',      name: 'Forts & sites militaires',       ids: ['a155', 'a166', 'a168', 'a153'] },
  { id: 'cat-sites',      name: 'Sites historiques & ruines',     ids: ['a156', 'a152', 'a169', 'a176', 'a071'] },
  { id: 'cat-cimetieres', name: 'Cimetières historiques',         ids: ['a163', 'a165', 'a174', 'a184'] },
  { id: 'cat-musees',     name: 'Musées',                         ids: ['a175', 'a183', 'a185'] },
  { id: 'cat-maisons',    name: 'Maisons & domaines coloniaux',   ids: ['a159', 'a160', 'a140'] },
];
const MONUMENT_IDS = new Set(MONUMENT_CATS.map(c => c.id));
function applyMonumentGrouping(s) {
  MONUMENT_CATS.forEach(c => {
    if (!s.groups.some(g => g.id === c.id)) {
      s.groups.push({ id: c.id, ids: [], keywords: [], maxScore: null, name: c.name, decision: null, rep: null });
    }
    c.ids.forEach(id => { if (BY[id]) autoMoveTo(s, id, c.id); });
    const cat = s.groups.find(g => g.id === c.id);
    if (cat && cat.ids.length > 1) cat.decision = 'keep'; // keep all distinct
  });
  // Drop categories emptied by the moves (keep the pinned + monument buckets).
  const keep = new Set([...FIXED_CATS.map(f => f.id), ...MONUMENT_IDS]);
  s.groups = s.groups.filter(g => g.ids.length > 0 || keep.has(g.id));
}

// state: { groups: [{id, ids:[], decision:'merge'|'keep'|null, rep:id|null}], discarded:[id], custom:int }
function seed() {
  const s = {
    groups: [
      ...FIXED_CATS.map(emptyCat),
      ...DATA.groups.map((g, i) => ({
        id: 'g' + i,
        ids: g.ids.slice(),
        keywords: g.keywords,
        maxScore: g.maxScore,
        name: g.name,
        decision: null,
        rep: g.ids[0],
      })),
      ...DATA.singletons.map(singleCat), // every other activity, so all 198 are visible
    ],
    discarded: ratings23(),  // 2★ & 3★ start as "ne pas garder"
    custom: 0,
    userActivities: [],
    userSeq: 0,
    preDiscarded23: true,
    preGrouped: true,
    preGroupedMonuments: true,
  };
  applyAutoGrouping(s);
  applyMonumentGrouping(s);
  return s;
}
// Normalize any state object (from localStorage OR an imported share) into a
// valid, complete state for this data version. Used by load() and import.
function hydrate(s) {
  if (!s.discarded) s.discarded = [];
  if (!s.userActivities) s.userActivities = [];
  if (!s.userSeq) s.userSeq = 0;
  s.userActivities.forEach(a => { BY[a.id] = a; }); // re-register added activities
  // Drop any unknown ids (e.g. a share from a different data version).
  s.groups.forEach(g => { g.ids = g.ids.filter(id => BY[id]); });
  s.discarded = s.discarded.filter(id => BY[id]);
  s.groups.forEach(g => { if (!g.name) g.name = (g.ids[0] && BY[g.ids[0]] && BY[g.ids[0]].title) || 'Sans nom'; });
  // Ensure the pinned categories exist (prepended, in order).
  FIXED_CATS.slice().reverse().forEach(f => {
    if (!s.groups.some(g => g.id === f.id)) s.groups.unshift(emptyCat(f));
  });
  // Ensure EVERY activity is present somewhere.
  const present = new Set(s.groups.flatMap(g => g.ids));
  DATA.activities.forEach(a => { if (!present.has(a.id)) s.groups.push(singleCat(a.id)); });
  // One-time: pre-discard 2★ & 3★ activities (respects later manual "Reprendre").
  if (!s.preDiscarded23) {
    const set = new Set(s.discarded);
    ratings23().forEach(id => set.add(id));
    s.discarded = [...set];
    s.preDiscarded23 = true;
  }
  // One-time: auto-group beaches/hikes, set Morne aside, discard Kitesurf.
  if (!s.preGrouped) {
    applyAutoGrouping(s);
    s.preGrouped = true;
  }
  // One-time: group monuments / heritage into thematic categories.
  if (!s.preGroupedMonuments) {
    applyMonumentGrouping(s);
    s.preGroupedMonuments = true;
  }
  if (typeof s.custom !== 'number') s.custom = 0;
  return s;
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(LS));
    if (s && Array.isArray(s.groups)) return hydrate(s);
  } catch {}
  // First visit (no saved state): use an embedded seed state if the page ships one.
  try {
    const el = document.getElementById('seed');
    if (el) { const s = JSON.parse(el.textContent); if (s && Array.isArray(s.groups)) return hydrate(s); }
  } catch {}
  return seed();
}
const isDiscarded = id => state.discarded.includes(id);
// A non-empty category whose every activity is discarded — hidden everywhere.
const isAllDead = g => g.ids.length > 0 && g.ids.every(isDiscarded);
function toggleDiscard(id) {
  if (isDiscarded(id)) state.discarded = state.discarded.filter(x => x !== id);
  else state.discarded.push(id);
  save(); render();
}
// First non-discarded id of a merge group (the rep, unless it was discarded).
function keepIdOf(g) {
  const order = [g.rep, ...g.ids].filter(id => id && g.ids.includes(id));
  return order.find(id => !isDiscarded(id)) || null;
}
// Single source of truth for what gets removed — used by both stats and export.
function computeDrops() {
  const map = new Map(); // id -> {id, title, reason, mergedInto?}
  state.groups.forEach(g => {
    if (g.decision === 'merge') {
      const keep = keepIdOf(g);
      g.ids.forEach(id => {
        if (id === keep) return;
        if (isDiscarded(id)) map.set(id, { id, title: BY[id].title, reason: 'discarded' });
        else map.set(id, { id, title: BY[id].title, reason: 'merged', mergedInto: keep });
      });
    } else {
      g.ids.forEach(id => { if (isDiscarded(id)) map.set(id, { id, title: BY[id].title, reason: 'discarded' }); });
    }
  });
  return [...map.values()];
}
let state = null; // set by window.__boot once auth + the Firestore read are done
function save() {
  localStorage.setItem(LS, JSON.stringify(state));
  if (window.__cloudSave) window.__cloudSave(JSON.stringify(state));
}

const $ = sel => document.querySelector(sel);
const esc = s => (s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let dragId = null; // id of the activity currently being dragged

const findGroupOf = id => state.groups.find(g => g.ids.includes(id));

// A category's rating = the best (max) rating among its activities; 0 = no rating.
const catRating = g => g.ids.reduce((m, id) => Math.max(m, (BY[id] && BY[id].rating) || 0), 0);
const stars = n => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

// Move an activity to another category. targetId === null → create a new
// category named after the activity. Empty source categories are removed.
function moveActivity(id, targetId) {
  const src = findGroupOf(id);
  if (src && src.id === targetId) return;
  if (src) {
    src.ids = src.ids.filter(x => x !== id);
    if (src.rep === id) src.rep = src.ids[0] || null;
  }
  if (targetId === null) {
    state.custom++;
    state.groups.unshift({ id: 'c' + state.custom, ids: [id], keywords: [], maxScore: null, name: BY[id].title, decision: null, rep: id });
  } else {
    const t = state.groups.find(g => g.id === targetId);
    if (!t) return;
    if (!t.ids.includes(id)) t.ids.push(id);
  }
  save(); render();
}

function deleteEmptyCat(g) {
  if (g.ids.length) return;
  state.groups = state.groups.filter(x => x !== g);
  save(); render();
}

// Swap a name <span> for an input to rename a category in place.
function editName(g, spanEl) {
  const inp = document.createElement('input');
  inp.className = 'name-input';
  inp.value = g.name;
  spanEl.replaceWith(inp);
  inp.focus();
  inp.select();
  let done = false;
  const commit = () => { if (done) return; done = true; const v = inp.value.trim(); if (v) g.name = v; save(); render(); };
  inp.onblur = commit;
  inp.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    else if (e.key === 'Escape') { done = true; render(); }
  };
}

function renderPanel() {
  if (!state) return;
  const list = $('#cat-list');
  list.innerHTML = '';
  const mode = ($('#cat-sort') && $('#cat-sort').value) || 'count';
  const q = (($('#cat-search') && $('#cat-search').value) || '').trim().toLowerCase();
  const ordered = state.groups
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => !isAllDead(g))                       // hide fully-discarded categories
    .filter(({ g }) => !q || g.name.toLowerCase().includes(q))
    .sort((a, b) =>
      mode === 'alpha'
        ? a.g.name.localeCompare(b.g.name, 'fr', { sensitivity: 'base' })
        : (b.g.ids.length - a.g.ids.length) || (a.i - b.i));
  if (!ordered.length) { list.innerHTML = '<div class="empty" style="padding:16px">Aucune catégorie.</div>'; return; }
  ordered.forEach(({ g }) => {
    const row = document.createElement('div');
    row.className = 'cat-row';
    const tail = g.ids.length === 0
      ? '<button class="cat-del" title="Supprimer cette catégorie vide">✕</button>'
      : '<button class="cat-edit" title="Renommer">✎</button><span class="cat-count" title="Aller à la catégorie">' + g.ids.length + '</span>';
    row.innerHTML = '<span class="cat-name" title="Cliquer pour renommer">' + esc(g.name) + '</span>' + tail;
    row.ondragover = e => { e.preventDefault(); row.classList.add('drop-hover'); };
    row.ondragleave = () => row.classList.remove('drop-hover');
    row.ondrop = e => { e.preventDefault(); row.classList.remove('drop-hover'); if (dragId) moveActivity(dragId, g.id); };
    const editIt = () => editName(g, row.querySelector('.cat-name'));
    row.querySelector('.cat-name').onclick = editIt;
    const edit = row.querySelector('.cat-edit');
    if (edit) edit.onclick = editIt;
    const count = row.querySelector('.cat-count');
    if (count) count.onclick = () => {
      const el = document.querySelector('[data-group="' + g.id + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const del = row.querySelector('.cat-del');
    if (del) del.onclick = () => deleteEmptyCat(g);
    list.appendChild(row);
  });
}

function render() {
  if (!state) return; // not booted yet (auth gate still up)
  renderPanel();
  const q = $('#search').value.trim().toLowerCase();
  const onlyUndec = $('#only-undecided').checked;
  const host = $('#groups');
  host.innerHTML = '';
  const merging = state.groups.filter(g => g.decision === 'merge').length;
  const gain = computeDrops().length;
  const total = DATA.activities.length + state.userActivities.length;
  const finalCount = total - gain;
  $('#src-count').textContent = DATA.generatedFrom + (state.userActivities.length ? ' + ' + state.userActivities.length + ' ajoutée' + (state.userActivities.length > 1 ? 's' : '') : '');
  $('#st-groups').textContent = state.groups.length;
  $('#st-merge').textContent = merging;
  $('#st-discard').textContent = state.discarded.length;
  $('#st-gain').textContent = gain;
  $('#st-final').textContent = finalCount;

  const visible = state.groups.filter(g => {
    if (g.ids.length === 0) return false; // empty categories live only in the right panel
    if (onlyUndec && g.decision) return false;
    if (!q) return true;
    const hay = (g.name||'') + ' ' + (g.keywords||[]).join(' ') + ' ' + g.ids.map(id => BY[id].title + ' ' + BY[id].location).join(' ');
    return hay.toLowerCase().includes(q);
  });
  if (!visible.length) { host.innerHTML = '<div class="empty">Aucune catégorie ne correspond.</div>'; return; }

  // Order by rating (5★→1★, then unrated last); keep maxScore order within a tier.
  const ordered = visible
    .map((g, i) => ({ g, r: catRating(g), i }))
    .sort((a, b) => (b.r - a.r) || (a.i - b.i));
  let lastTier = null;
  ordered.forEach(({ g, r }) => {
    if (r !== lastTier) {
      lastTier = r;
      const h = document.createElement('div');
      h.className = 'section-head';
      h.innerHTML = r > 0
        ? '<span class="sh-stars">' + stars(r) + '</span> ' + r + (r > 1 ? ' étoiles' : ' étoile')
        : 'Sans note';
      host.appendChild(h);
    }
    host.appendChild(renderGroup(g));
  });
  updateScrollCounter();
}

// Floating counter: how many activity cards have been scrolled past, out of all shown.
function updateScrollCounter() {
  const el = $('#scroll-counter');
  if (!el) return;
  const cards = document.querySelectorAll('#groups .card');
  const total = cards.length;
  if (!total) { el.style.display = 'none'; return; }
  let passed = 0;
  cards.forEach(c => { if (c.getBoundingClientRect().bottom < 100) passed++; });
  el.style.display = 'block';
  el.innerHTML = '<b>' + passed + '</b> / ' + total + ' activités';
}
window.addEventListener('scroll', updateScrollCounter, { passive: true });
window.addEventListener('resize', updateScrollCounter, { passive: true });

function renderGroup(g) {
  const el = document.createElement('div');
  el.className = 'group' + (g.decision === 'merge' ? ' decided-merge' : g.decision === 'keep' ? ' decided-keep' : '');
  el.dataset.group = g.id;
  const kw = (g.keywords && g.keywords.length)
    ? '<span class="kw">' + g.keywords.map(k => '<span>' + esc(k) + '</span>').join('') + '</span>' : '';
  const score = g.maxScore != null ? '<span class="kw">similarité ' + g.maxScore + '</span>' : '';
  el.innerHTML =
    '<div class="group-head">' +
      '<span class="group-title"><span class="gname" title="Cliquer pour renommer">' + esc(g.name) + '</span>' +
        '<button class="gname-edit" title="Renommer la catégorie">✎</button>' +
        '<span class="kw">· ' + g.ids.length + ' activités</span></span>' + kw + score +
      '<span class="spacer"></span>' +
      '<span class="decision">' +
        '<button data-act="merge" class="' + (g.decision==='merge'?'on-merge':'') + '">Fusionner</button>' +
        '<button data-act="keep" class="' + (g.decision==='keep'?'on-keep':'') + '">Garder séparé</button>' +
      '</span>' +
    '</div>' +
    '<div class="cards"></div>';
  el.querySelector('[data-act="merge"]').onclick = () => { g.decision = g.decision==='merge'?null:'merge'; save(); render(); };
  el.querySelector('[data-act="keep"]').onclick = () => { g.decision = g.decision==='keep'?null:'keep'; save(); render(); };
  el.querySelector('.gname').onclick = () => editName(g, el.querySelector('.gname'));
  el.querySelector('.gname-edit').onclick = () => editName(g, el.querySelector('.gname'));
  // The whole category box is a drop target: drag a card onto it to move it here.
  el.ondragover = e => { if (dragId && !g.ids.includes(dragId)) { e.preventDefault(); el.classList.add('drop-hover'); } };
  el.ondragleave = e => { if (!el.contains(e.relatedTarget)) el.classList.remove('drop-hover'); };
  el.ondrop = e => { e.preventDefault(); el.classList.remove('drop-hover'); if (dragId) moveActivity(dragId, g.id); };
  const cards = el.querySelector('.cards');
  g.ids.forEach(id => cards.appendChild(renderCard(g, id)));
  return el;
}

function renderCard(g, id) {
  const a = BY[id];
  const disc = isDiscarded(id);
  const isRep = !disc && g.decision === 'merge' && keepIdOf(g) === id;
  // Merged-away (in a "merge" group but not the kept one): veil only, no cross.
  const mergedOut = !disc && g.decision === 'merge' && !isRep;
  // In a 4★+ category, flag activities rated 3★ or less (or unrated).
  const lowstar = catRating(g) >= 4 && (a.rating || 0) <= 3;
  // Difficult activities (Difficile / Très difficile) get a big red banner.
  const diff = a.difficulty && /difficile/i.test(a.difficulty.label) ? a.difficulty.label : null;
  const c = document.createElement('div');
  c.className = 'card' + (isRep ? ' rep' : '') + (disc ? ' discarded' : '') + (mergedOut ? ' faded' : '') + (lowstar ? ' lowstar' : '') + (diff ? ' isdiff' : '');
  c.draggable = true;
  c.ondragstart = e => { dragId = id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); };
  c.ondragend = () => { dragId = null; c.classList.remove('dragging'); document.querySelectorAll('.drop-hover').forEach(x => x.classList.remove('drop-hover')); };
  c.innerHTML =
    '<div class="ph" style="background-image:url(' + esc(a.photo) + ')"></div>' +
    (isRep ? '<span class="repflag">★ gardée</span>' : '') +
    (disc ? '<span class="dropflag">💀 écartée</span><div class="card-x"><b class="skull">💀</b></div>' : '') +
    (mergedOut ? '<div class="card-x"><b>✕</b></div>' : '') +
    '<span class="num">#' + a.number + '</span>' +
    (diff ? '<div class="diffbar">⚠ ' + esc(diff) + '</div>' : '') +
    '<div class="body">' +
      '<div class="t">' + esc(a.title) + '</div>' +
      (a.rating ? '<div class="cardstars">' + stars(a.rating) + ' <span class="m">' + a.rating + '/5</span></div>' : '') +
      '<div class="m">' + esc(a.category) + (a.location ? ' · ' + esc(a.location) : '') + '</div>' +
      '<div class="d">' + esc(a.description) + '</div>' +
      '<div class="links">' +
        '<a class="cardlink" target="_blank" rel="noopener" draggable="false" href="https://www.google.com/search?q=' + encodeURIComponent(a.title + ' Île Maurice') + '">🔎 Web</a>' +
        '<a class="cardlink" target="_blank" rel="noopener" draggable="false" href="https://www.google.com/maps/search/' + encodeURIComponent((a.location ? a.location + ', ' : '') + a.title + ', Maurice') + '">📍 Maps</a>' +
        '<a class="cardlink" target="_blank" rel="noopener" draggable="false" href="https://www.google.com/search?q=' + encodeURIComponent(a.title + ' Maurice') + '&tbm=isch">🖼 Photos</a>' +
      '</div>' +
    '</div>' +
    '<div class="acts">' +
      (disc
        ? '<button data-a="keepit" class="undrop">↩ Reprendre</button>'
        : '<button data-a="rep">' + (isRep ? '★ Représentant' : 'Représentant') + '</button>' +
          '<button data-a="drop">Ne pas garder</button>' +
          '<button data-a="move">Déplacer…</button>') +
    '</div>';
  if (disc) {
    c.querySelector('[data-a="keepit"]').onclick = () => toggleDiscard(id);
  } else {
    c.querySelector('[data-a="rep"]').onclick = () => { g.rep = id; if (!g.decision) g.decision = 'merge'; save(); render(); };
    c.querySelector('[data-a="drop"]').onclick = () => toggleDiscard(id);
    c.querySelector('[data-a="move"]').onclick = () => openMove(g, id);
  }
  return c;
}

function openMove(g, id) {
  const body = $('#move-body');
  const a = BY[id];
  body.innerHTML =
    '<p class="hint">Déplacer <b>' + esc(a.title) + '</b> vers :</p>' +
    '<input id="mv-search" placeholder="Rechercher une catégorie…" style="width:100%;margin-bottom:10px;background:#100c16;color:var(--ink);border:1px solid var(--line);border-radius:9px;padding:8px" />' +
    '<div id="mv-list"></div>';
  const list = body.querySelector('#mv-list');
  const draw = (filter) => {
    const f = (filter || '').toLowerCase();
    const others = state.groups
      .filter(x => x !== g && !isAllDead(x) && (!f || x.name.toLowerCase().includes(f)))
      .sort((p, q) => p.name.localeCompare(q.name, 'fr', { sensitivity: 'base' }));
    let h = '<div class="row" data-target="__new"><div class="ph" style="background:#3a3047"></div><div><b>+ Nouvelle catégorie</b><br><span class="pill">nommée « ' + esc(a.title) + ' »</span></div></div>';
    h += others.map(x => {
      const cover = x.ids[0] && BY[x.ids[0]] ? BY[x.ids[0]].photo : null; // guard empty categories
      const bg = cover ? 'background-image:url(' + esc(cover) + ')' : 'background:#3a3047';
      return '<div class="row" data-target="' + x.id + '"><div class="ph" style="' + bg + '"></div><div><b>' + esc(x.name) + '</b><br><span class="pill">' + x.ids.length + ' activité' + (x.ids.length > 1 ? 's' : '') + '</span></div></div>';
    }).join('');
    list.innerHTML = h;
    list.querySelectorAll('.row').forEach(r => r.onclick = () => {
      moveActivity(id, r.dataset.target === '__new' ? null : r.dataset.target);
      $('#move-dlg').close();
    });
  };
  draw('');
  body.querySelector('#mv-search').oninput = e => draw(e.target.value);
  $('#move-dlg').showModal();
}

const newCat = $('#new-cat');
newCat.ondragover = e => { e.preventDefault(); newCat.classList.add('drop-hover'); };
newCat.ondragleave = () => newCat.classList.remove('drop-hover');
newCat.ondrop = e => { e.preventDefault(); newCat.classList.remove('drop-hover'); if (dragId) moveActivity(dragId, null); };

$('#move-close').onclick = () => $('#move-dlg').close();
$('#search').oninput = render;
$('#only-undecided').onchange = render;
$('#cat-sort').onchange = renderPanel;
$('#cat-search').oninput = renderPanel;

// Keep sticky offsets in sync with the real header height.
function syncHeaderH() {
  const h = document.querySelector('header');
  if (h) document.documentElement.style.setProperty('--header-h', h.offsetHeight + 'px');
}
window.addEventListener('resize', syncHeaderH, { passive: true });
$('#btn-reset').onclick = () => {
  if (!confirm('Réinitialiser tout le tri ? (une sauvegarde est faite, annulable avec « ↩ Annuler »)')) return;
  pushUndo();
  state = seed();
  save();
  render();
};

// ---- Single-level undo (backs up before destructive actions) ----
const BAK = LS + '.bak';
function pushUndo() { try { localStorage.setItem(BAK, localStorage.getItem(LS) || JSON.stringify(state)); } catch {} updateUndoBtn(); }
function updateUndoBtn() { const btn = $('#btn-undo'); if (btn) btn.style.display = localStorage.getItem(BAK) ? '' : 'none'; }
$('#btn-undo').onclick = () => {
  const bak = localStorage.getItem(BAK);
  if (!bak) return;
  let obj; try { obj = JSON.parse(bak); } catch { return; }
  state = hydrate(obj);
  localStorage.removeItem(BAK);
  save();
  updateUndoBtn();
  render();
};

// ---- Add a new activity ----
const DIFFS = [
  { label: 'Facile', dot: '#22C268' },
  { label: 'Modérée', dot: '#FFB627' },
  { label: 'Difficile', dot: '#F97316' },
  { label: 'Très difficile', dot: '#EF4444' },
];
const DIFF_EMOJI = ['🟢', '🟡', '🟠', '🔴'];
function openAdd() {
  const cat = $('#f-cat');
  if (!cat.options.length) {
    const cats = [...new Set(DATA.activities.map(a => a.category))].sort();
    cat.innerHTML = '<option value="">— Catégorie —</option>' + cats.map(c => '<option>' + esc(c) + '</option>').join('');
    $('#f-rating').innerHTML = '<option value="0">Sans note</option>' + [5,4,3,2,1].map(n => '<option value="' + n + '">' + stars(n) + '  ' + n + '/5</option>').join('');
    $('#f-difficulty').innerHTML = '<option value="">— Aucune —</option>' + DIFFS.map((d,i) => '<option value="' + i + '">' + DIFF_EMOJI[i] + ' ' + d.label + '</option>').join('');
  }
  ['f-title','f-loc','f-dur','f-price','f-transit','f-desc'].forEach(id => { $('#'+id).value = ''; });
  $('#f-cat').value = ''; $('#f-rating').value = '0'; $('#f-difficulty').value = '';
  ['f-pepite','f-secret','f-journee'].forEach(id => { $('#'+id).checked = false; });
  $('#add-err').textContent = '';
  $('#add-dlg').showModal();
  $('#f-title').focus();
}
function addSave() {
  const title = $('#f-title').value.trim();
  if (!title) { $('#add-err').textContent = 'Le titre est obligatoire.'; $('#f-title').focus(); return; }
  state.userSeq++;
  const id = 'u' + state.userSeq;
  const di = $('#f-difficulty').value;
  const tags = [];
  if ($('#f-pepite').checked) tags.push('💎');
  if ($('#f-secret').checked) tags.push('🗝️');
  const a = {
    id,
    number: DATA.generatedFrom + state.userSeq,
    title,
    category: $('#f-cat').value || '➕ Activité ajoutée',
    location: $('#f-loc').value.trim(),
    duration: $('#f-dur').value.trim(),
    price: $('#f-price').value.trim(),
    transit: $('#f-transit').value.trim(),
    rating: +$('#f-rating').value || 0,
    description: $('#f-desc').value.trim(),
    difficulty: di === '' ? null : { dot: DIFFS[+di].dot, label: DIFFS[+di].label, detail: '' },
    pepite: $('#f-pepite').checked,
    secret: $('#f-secret').checked,
    journee: $('#f-journee').checked,
    tags,
    photo: '/photos/hero.jpg',
    userAdded: true,
  };
  state.userActivities.push(a);
  BY[id] = a;
  state.custom++;
  state.groups.unshift({ id: 'c' + state.custom, ids: [id], keywords: [], maxScore: null, name: title, decision: null, rep: id });
  save();
  $('#add-dlg').close();
  render();
}
$('#btn-add-activity').onclick = openAdd;
$('#add-cancel').onclick = () => $('#add-dlg').close();
$('#add-save').onclick = addSave;

// ---- Cloud boot (driven by the Firebase module script below) ----
// Called once auth + the initial Firestore read are done. remoteState is the
// parsed state from the DB, or null when the doc doesn't exist yet. Returns the
// serialized state so a missing doc can be created from it (initial v1).
window.__boot = (remoteState) => {
  state = remoteState ? hydrate(remoteState) : load();
  localStorage.setItem(LS, JSON.stringify(state)); // local cache, no cloud echo
  render();
  updateUndoBtn();
  syncHeaderH();
  return JSON.stringify(state);
};
// Replace the local tri with a newer version someone else saved (conflict
// resolution). The current tri is backed up first → « ↩ Annuler ».
window.__applyRemote = (remoteState) => {
  pushUndo();
  state = hydrate(remoteState);
  localStorage.setItem(LS, JSON.stringify(state));
  render();
};
</script>
<script type="module">
// Firebase (CDN, modular build) — shared persistence of the tri in Firestore
// (activityTriage/current) behind an optimistic version lock. No sign-in: the
// rules open this single doc to public read/write (trusted-group trade-off);
// the version lock is still enforced server-side.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import { getFirestore, doc, getDoc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

const CFG = __FIREBASE_CONFIG__;
const qs = (s) => document.querySelector(s);
const setStatus = (h) => { qs('#cloud-status').innerHTML = h; };
const escT = (s) => (s || '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

if (!CFG.apiKey) {
  setStatus('☁ hors ligne — config Firebase absente du build');
  window.__boot(null); // local-only fallback so the tool still opens
  throw new Error('missing firebase config');
}

const app = initializeApp(CFG);
const db = getFirestore(app);
const triRef = doc(db, 'activityTriage', 'current');

// Author label for updatedBy / the conflict banner. Asked once, kept locally.
const AUTHOR_LS = 'yallah.dedup.author.v1';
function authorName() {
  let n = '';
  try { n = (localStorage.getItem(AUTHOR_LS) || '').trim(); } catch {}
  if (!n) {
    n = (prompt('Ton prénom ? (affiché aux autres quand tu modifies le tri)') || '').trim() || 'anonyme';
    try { localStorage.setItem(AUTHOR_LS, n); } catch {}
  }
  return n;
}

let booted = false;
let remoteVersion = 0;   // version of the doc our local state derives from
let conflictData = null; // newer doc data, when our save was rejected
let pending = null;      // latest serialized state awaiting a push
let pushTimer = null;
let saving = false;

const whoOf = (d) => (d && d.updatedBy && d.updatedBy.name) || 'quelqu’un';
const okStatus = (suffix) => setStatus('☁ enregistré · <b>v' + remoteVersion + '</b>' + (suffix ? ' · ' + escT(suffix) : ''));

function showConflict(d) {
  conflictData = d;
  qs('#conflict-who').textContent = whoOf(d) + ' (v' + d.version + ')';
  qs('#conflict-bar').style.display = '';
  setStatus('⚠ conflit de version');
}
qs('#conflict-reload').onclick = () => {
  if (!conflictData) return;
  let st = null;
  try { st = JSON.parse(conflictData.state); } catch {}
  if (!st || !Array.isArray(st.groups)) { setStatus('⚠ version distante illisible'); return; }
  remoteVersion = conflictData.version;
  const author = whoOf(conflictData);
  conflictData = null;
  pending = null; // local now mirrors remote
  qs('#conflict-bar').style.display = 'none';
  window.__applyRemote(st);
  okStatus(author);
};

// Debounced push: the page calls this on every save() (each user action).
window.__cloudSave = (json) => {
  pending = json;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void flush(); }, 1200);
};

// Transactional write: refuses to overwrite a version we haven't seen. The
// version check is also enforced server-side by firestore.rules (version must
// increment by exactly 1), so a stale page can never silently clobber the doc.
async function flush() {
  if (saving || pending == null || conflictData) return;
  const payload = pending;
  pending = null;
  saving = true;
  setStatus('☁ enregistrement…');
  try {
    const next = await runTransaction(db, async (tx) => {
      const snap = await tx.get(triRef);
      const d = snap.exists() ? snap.data() : null;
      const cur = (d && d.version) || 0;
      if (cur !== remoteVersion) {
        const err = new Error('version conflict');
        err.conflictDoc = d;
        throw err;
      }
      tx.set(triRef, {
        version: cur + 1,
        state: payload,
        updatedAt: serverTimestamp(),
        updatedBy: { uid: 'web', name: authorName() },
      });
      return cur + 1;
    });
    remoteVersion = next;
    okStatus(null);
  } catch (e) {
    if (e && e.conflictDoc !== undefined) {
      if (e.conflictDoc) showConflict(e.conflictDoc);
      else { remoteVersion = 0; pending = payload; } // doc vanished: recreate as v1
    } else {
      if (pending == null) pending = payload; // keep the latest, retry later
      setStatus('⚠ enregistrement échoué — nouvel essai…');
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => { void flush(); }, 5000);
    }
  } finally {
    saving = false;
    if (pending != null && !conflictData) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => { void flush(); }, 400);
    }
  }
}

// Initial load — no sign-in: read the doc straight away.
(async () => {
  setStatus('☁ chargement…');
  try {
    const snap = await getDoc(triRef);
    booted = true;
    if (snap.exists()) {
      const d = snap.data();
      remoteVersion = (typeof d.version === 'number' && d.version) || 0;
      let st = null;
      try { st = JSON.parse(d.state); } catch {}
      window.__boot(st && Array.isArray(st.groups) ? st : null);
      okStatus(whoOf(d));
    } else {
      // No doc yet: boot from the local cache / embedded seed, then create v1.
      const json = window.__boot(null);
      setStatus('☁ initialisation de la base…');
      window.__cloudSave(json);
    }
  } catch (e) {
    // Offline / rules not deployed: open on the local cache; the first save
    // will retry against the base and surface a conflict if it diverged.
    booted = true;
    window.__boot(null);
    setStatus('⚠ lecture de la base impossible — mode local');
  }
})();
</script>
</body>
</html>`;

// Firebase web config, embedded at build time. These are PUBLIC identifiers
// (the deployed app bundle ships the same values) — security lives in
// firestore.rules, not in hiding the config. Read from .env.local then .env,
// first definition wins (mirrors Vite's precedence).
function readFirebaseConfig() {
  const vars = {};
  for (const f of ['.env.local', '.env']) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = /^\s*(VITE_FIREBASE_[A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !(m[1] in vars)) vars[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return {
    apiKey: vars.VITE_FIREBASE_API_KEY || '',
    authDomain: vars.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: vars.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: vars.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: vars.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: vars.VITE_FIREBASE_APP_ID || '',
  };
}
const fbConfig = readFirebaseConfig();
if (!fbConfig.apiKey) {
  console.warn('⚠ VITE_FIREBASE_* introuvables dans .env.local/.env — la page générée ne pourra pas joindre Firestore.');
}

// The page's strict-CSP-incompatible inline scripts are allowed by a relaxed
// CSP scoped to /admin/* in vercel.json. scripts/admin-seed.json, when present,
// is the fallback state used only while activityTriage/current doesn't exist.
let webHtml = html.replace('__FIREBASE_CONFIG__', JSON.stringify(fbConfig));
const seedPath = join(root, 'scripts/admin-seed.json');
if (existsSync(seedPath)) {
  const seedJson = readFileSync(seedPath, 'utf8').trim();
  webHtml = webHtml.replace(
    '<script id="data"',
    `<script id="seed" type="application/json">${seedJson}</script>\n<script id="data"`,
  );
  console.log('Embedded seed from scripts/admin-seed.json');
}
const adminDir = join(root, 'public/admin');
mkdirSync(adminDir, { recursive: true });
const webOut = join(adminDir, 'activities.html');
writeFileSync(webOut, webHtml);
console.log(`Wrote ${webOut}  (→ served at /admin/activities)`);

// --- /admin/goprod — publish the triage outcome to the app -----------------
// Reads activityTriage/current, computes the final list (merge groups keep
// ONLY the representative; red-cross merged-out and 💀 discarded activities are
// removed), and writes activityTriage/published. The app applies that doc at
// boot (src/main.tsx + utils/catalog.ts): retired activities leave the deck,
// triage-added ones join it, and votes on merged activities follow their
// representative. Reversible via « Dépublier ».
const GOPROD_META = {
  total: activities.length,
  byId: Object.fromEntries(activities.map((a) => [a.id, { t: a.title, r: a.rating || 0 }])),
};

const goprodHtml = String.raw`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Yallah — Mise en prod des activités</title>
<style>
  :root { --bg: #14101a; --card: #221a2e; --line: #3a3047; --ink: #f4eefb; --mut: #b3a6c4;
    --coral: #ff6b6b; --gold: #ffcb45; --green: #22c268; --blue: #5b9dff; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--ink); }
  main { max-width: 860px; margin: 0 auto; padding: 28px 20px 60px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: var(--mut); font-size: 13.5px; margin: 0 0 22px; }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; margin-bottom: 18px; }
  section h2 { font-size: 15px; margin: 0 0 10px; }
  .stats { display: flex; gap: 10px; flex-wrap: wrap; margin: 0 0 8px; }
  .stat { background: #00000033; border: 1px solid var(--line); border-radius: 10px; padding: 6px 12px; font-size: 13.5px; }
  .stat b { color: var(--gold); font-size: 16px; }
  .alert { border-radius: 10px; padding: 11px 13px; margin: 12px 0 0; font-size: 13px; line-height: 1.5; }
  .alert.warn { background: #e11d2a22; border: 1px solid #e11d2a; color: #ffd7da; }
  .alert.ok { background: #22c26822; border: 1px solid var(--green); color: #c8f5d8; }
  details { margin-top: 10px; }
  summary { cursor: pointer; font-size: 13.5px; color: var(--mut); }
  summary b { color: var(--ink); }
  ul { margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: var(--mut); }
  li b { color: var(--ink); font-weight: 600; }
  li .to { color: var(--blue); }
  button { font: inherit; cursor: pointer; border-radius: 10px; border: 1px solid var(--line);
    background: var(--card); color: var(--ink); padding: 10px 16px; }
  button:hover { border-color: var(--mut); }
  button:disabled { opacity: .5; cursor: default; }
  .btn-primary { background: var(--coral); border-color: var(--coral); color: #fff; font-weight: 700; font-size: 15px; }
  .actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
  #msg { font-size: 13.5px; margin-top: 12px; }
  #msg.ok { color: var(--green); }
  #msg.err { color: var(--coral); }
  a { color: var(--blue); }
</style>
</head>
<body>
<main>
  <h1>Mise en prod des activités</h1>
  <p class="sub">Applique le résultat du <a href="/admin/activities">tri</a> à l'application : les catégories
    « Fusionner » ne gardent que le <b>représentant ★</b>, les activités fusionnées (croix rouge) et les
    <b>💀 écartées</b> sont retirées, les activités ajoutées dans l'outil rejoignent le deck.
    Les votes déjà émis sur une activité fusionnée suivent automatiquement son représentant.</p>

  <section id="sec-prod">
    <h2>Actuellement en prod</h2>
    <div id="prod-now">Chargement…</div>
  </section>

  <section id="sec-plan">
    <h2>Ce qui sera mis en prod (tri actuel)</h2>
    <div id="plan">Chargement…</div>
  </section>

  <div class="actions">
    <button class="btn-primary" id="btn-publish" disabled>Mettre en prod les nouvelles activités</button>
    <button id="btn-unpublish" style="display:none">Dépublier (revenir à la liste complète)</button>
  </div>
  <p id="msg"></p>
</main>

<script id="meta" type="application/json">${JSON.stringify(GOPROD_META)}</script>
<script type="module">
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

const CFG = __FIREBASE_CONFIG__;
const META = JSON.parse(document.getElementById('meta').textContent);
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const msg = (t, cls) => { const el = $('#msg'); el.textContent = t; el.className = cls || ''; };

const app = initializeApp(CFG);
const db = getFirestore(app);
const curRef = doc(db, 'activityTriage', 'current');
const pubRef = doc(db, 'activityTriage', 'published');

const AUTHOR_LS = 'yallah.dedup.author.v1';
function authorName() {
  let n = '';
  try { n = (localStorage.getItem(AUTHOR_LS) || '').trim(); } catch {}
  if (!n) {
    n = (prompt('Ton prénom ? (gardé comme auteur de la mise en prod)') || '').trim() || 'anonyme';
    try { localStorage.setItem(AUTHOR_LS, n); } catch {}
  }
  return n;
}

// Same semantics as the tri page's computeDrops(): in a "merge" group only the
// representative (first non-discarded of [rep, ...ids]) survives; every other
// member is removed — merged into the rep, or null when itself discarded. In
// keep/undecided groups only the discarded members are removed.
function computeFinal(state) {
  const userActs = state.userActivities || [];
  const userById = {};
  userActs.forEach((a) => { userById[a.id] = a; });
  const titleOf = (id) => (META.byId[id] && META.byId[id].t) || (userById[id] && userById[id].title) || id;
  const disc = new Set(state.discarded || []);
  const removed = {};
  (state.groups || []).forEach((g) => {
    if (g.decision === 'merge') {
      const order = [g.rep].concat(g.ids).filter((id) => id && g.ids.includes(id));
      const keep = order.find((id) => !disc.has(id)) || null;
      g.ids.forEach((id) => { if (id !== keep) removed[id] = disc.has(id) ? null : keep; });
    } else {
      g.ids.forEach((id) => { if (disc.has(id)) removed[id] = null; });
    }
  });
  disc.forEach((id) => { if (!(id in removed)) removed[id] = null; }); // defensive
  const allIds = Object.keys(META.byId).concat(userActs.map((a) => a.id));
  const keptIds = allIds.filter((id) => !(id in removed));
  const added = userActs
    .filter((a) => !(a.id in removed))
    .map((a) => { const c = Object.assign({}, a); delete c.photo; delete c.userAdded; return c; });
  const untreated = (state.groups || []).filter((g) => g.ids.length > 1 && !g.decision && g.ids.some((id) => !disc.has(id)));
  return { removed, keptIds, added, untreated, titleOf };
}

function renderProd(pub) {
  const host = $('#prod-now');
  if (!pub) {
    host.innerHTML = '<span style="color:var(--mut)">Aucune publication — l’app montre la liste complète (' + META.total + ' activités).</span>';
    $('#btn-unpublish').style.display = 'none';
    return;
  }
  const when = pub.publishedAt && pub.publishedAt.toDate ? pub.publishedAt.toDate().toLocaleString('fr-FR') : '?';
  const by = (pub.publishedBy && pub.publishedBy.name) || '?';
  const removedCount = pub.removed ? Object.keys(pub.removed).length : 0;
  const addedCount = pub.added ? pub.added.length : 0;
  host.innerHTML =
    '<div class="stats">' +
    '<span class="stat"><b>' + (pub.keptCount != null ? pub.keptCount : '?') + '</b> activités en prod</span>' +
    '<span class="stat"><b>' + removedCount + '</b> retirées</span>' +
    '<span class="stat"><b>' + addedCount + '</b> ajoutées</span>' +
    '<span class="stat">publié le <b>' + esc(when) + '</b> par <b>' + esc(by) + '</b> (tri v' + (pub.sourceVersion || '?') + ')</span>' +
    '</div>';
  $('#btn-unpublish').style.display = '';
}

function renderPlan(fin, triVersion) {
  const merged = Object.entries(fin.removed).filter((e) => e[1] !== null);
  const discarded = Object.entries(fin.removed).filter((e) => e[1] === null);
  const list = (items) => '<ul>' + items.join('') + '</ul>';
  let h =
    '<div class="stats">' +
    '<span class="stat"><b>' + fin.keptIds.length + '</b> activités gardées</span>' +
    '<span class="stat"><b>' + merged.length + '</b> fusionnées</span>' +
    '<span class="stat"><b>' + discarded.length + '</b> écartées</span>' +
    '<span class="stat"><b>' + fin.added.length + '</b> ajoutées</span>' +
    '<span class="stat">tri <b>v' + triVersion + '</b></span>' +
    '</div>';
  if (merged.length) {
    h += '<details><summary><b>' + merged.length + '</b> fusionnées (le vote suit le représentant)</summary>' +
      list(merged.map((e) => '<li>' + esc(fin.titleOf(e[0])) + ' <span class="to">→ ' + esc(fin.titleOf(e[1])) + '</span></li>')) + '</details>';
  }
  if (discarded.length) {
    h += '<details><summary><b>' + discarded.length + '</b> écartées (retirées, votes supprimés)</summary>' +
      list(discarded.map((e) => '<li>' + esc(fin.titleOf(e[0])) + '</li>')) + '</details>';
  }
  if (fin.added.length) {
    h += '<details><summary><b>' + fin.added.length + '</b> ajoutées au deck</summary>' +
      list(fin.added.map((a) => '<li><b>' + esc(a.title) + '</b></li>')) + '</details>';
  }
  if (fin.untreated.length) {
    h += '<div class="alert warn">⚠ <b>' + fin.untreated.length + '</b> catégorie(s) à plusieurs activités pas encore tranchée(s) (ni « Fusionner » ni « Garder séparé ») : ' +
      fin.untreated.map((g) => esc(g.name)).join(' · ') + '. Elles resteront toutes en prod telles quelles.</div>';
  } else {
    h += '<div class="alert ok">✓ Toutes les catégories à plusieurs activités ont été tranchées.</div>';
  }
  $('#plan').innerHTML = h;
}

let plan = null;
let triVersion = 0;

async function load() {
  try {
    const cur = await getDoc(curRef);
    if (!cur.exists()) { $('#plan').innerHTML = '<span class="alert warn">Aucun tri en base (activityTriage/current absent).</span>'; }
    else {
      const d = cur.data();
      triVersion = d.version || 0;
      let st = null;
      try { st = JSON.parse(d.state); } catch {}
      if (!st || !Array.isArray(st.groups)) { $('#plan').innerHTML = '<span class="alert warn">Tri illisible.</span>'; }
      else { plan = computeFinal(st); renderPlan(plan, triVersion); $('#btn-publish').disabled = false; }
    }
    const pub = await getDoc(pubRef);
    renderProd(pub.exists() ? pub.data() : null);
  } catch (e) {
    msg('Lecture impossible : ' + ((e && e.message) || e), 'err');
  }
}

$('#btn-publish').onclick = async () => {
  if (!plan) return;
  const removedCount = Object.keys(plan.removed).length;
  if (!confirm('Mettre en prod ? ' + plan.keptIds.length + ' activités gardées, ' + removedCount + ' retirées, ' + plan.added.length + ' ajoutées.\n\nLes utilisateurs verront la nouvelle liste au prochain chargement de l’app.')) return;
  $('#btn-publish').disabled = true;
  msg('Publication…');
  try {
    await setDoc(pubRef, {
      sourceVersion: triVersion,
      removed: plan.removed,
      added: plan.added,
      keptCount: plan.keptIds.length,
      publishedAt: serverTimestamp(),
      publishedBy: { name: authorName() },
    });
    msg('✓ Mis en prod — l’app appliquera la nouvelle liste au prochain chargement.', 'ok');
    void load();
  } catch (e) {
    msg('Publication impossible : ' + ((e && e.message) || e), 'err');
  } finally {
    $('#btn-publish').disabled = false;
  }
};

$('#btn-unpublish').onclick = async () => {
  if (!confirm('Dépublier ? L’app reviendra à la liste complète (' + META.total + ' activités) au prochain chargement.')) return;
  msg('Dépublication…');
  try {
    await deleteDoc(pubRef);
    msg('✓ Dépublié — retour à la liste complète.', 'ok');
    void load();
  } catch (e) {
    msg('Dépublication impossible : ' + ((e && e.message) || e), 'err');
  }
};

void load();
</script>
</body>
</html>`;

const goprodOut = join(adminDir, 'goprod.html');
writeFileSync(goprodOut, goprodHtml.replace('__FIREBASE_CONFIG__', JSON.stringify(fbConfig)));
console.log(`Wrote ${goprodOut}  (→ served at /admin/goprod)`);

console.log(`Suggested groups: ${groups.length}, covering ${inGroup.size} activities; ${singletons.length} singletons.`);
