# Analyse — Activités à regrouper

Suite à la suppression des 3 doublons (#12), il reste **198 activités**.
Voici les pistes de regroupement, classées par confiance.

Format : `aXXX · Titre`. Une recommandation par groupe, à valider.

---

## Forte confiance — à fusionner ou regrouper sous un titre unique

### 1. Sept Cascades / Tamarin Falls (variants de difficulté)
- `a061 · Randonnée des 7 cascades de Tamarin` (rando soft + canyoning)
- `a063 · Sentier des 7 cascades — la version intégrale` (rappel, sauts, 4–6h)

**Reco** : fusionner en `Sept Cascades — soft ou intégrale` avec deux niveaux
listés dans la description, ou garder les deux mais en croisant explicitement
("voir aussi a063 pour la version technique").

### 2. Plongée — épaves de Grand Port
- `a015 · Plongée épaves bataille de Grand Port` (épaves historiques)

Lien avec :
- `a153 · Bataille de Grand Port — site de la bataille navale (1810)`
- `a042 · Île de la Passe (forteresse de la bataille de Grand Port)`
- `a175 · Musée naval et historique de Mahébourg`

**Reco** : pas une fusion, mais ajouter des "voir aussi" entre les 4 entrées —
ce sont toutes des facettes du même thème "bataille de Grand Port 1810" et
elles devraient se renforcer mutuellement dans le UI.

### 3. Cascade sous-marine — vues aériennes
- `a112 · Hydravion (la vraie expérience cascade sous-marine)`
- `a114 · Vol en hélicoptère au-dessus du sud (incl. cascade sous-marine)`

**Reco** : 2 véhicules différents pour la même illusion d'optique. À garder
séparés (prix et expérience très différents) mais les croiser.

---

## Confiance moyenne — pertinents si on simplifie le deck

### 4. Cours de cuisine
- `a122 · Cours de cuisine créole mauricienne`
- `a130 · Cours de pâtisserie / cuisine indo-mauricienne`

**Reco** : 2 variants d'un même format. Soit fusionner en `Cours de cuisine
(créole ou indo-mauricien)`, soit garder distincts si le créole/indien est
un choix qui mérite d'être fait à part.

### 5. Ateliers artisanat
- `a129 · Atelier rhum arrangé chez un artisan`
- `a144 · Atelier séga (cours de danse traditionnelle)`
- `a189 · Atelier teinture / artisanat dans un village`
- `a192 · Atelier de fabrication de modèles réduits de bateaux`
- `a193 · Atelier de poterie créole`

**Reco** : tous sont des "ateliers" de 1–3h avec un artisan local. Pas une
fusion (le contenu est très différent) mais ils gagneraient à partager
une bannière "Atelier traditionnel · ~2h · avec un local".

### 6. Soirée stargazing
- `a195 · Soirée astronomique / observation des étoiles` (regroupe déjà a196,
  cf. commit "remove 3 duplicate activities")

Pas d'action — déjà fait.

### 7. Sunsets
- `a012 · Sortie sunset chez Authentiseaty (Cap Malheureux)` (en mer)
- `a020 · Observation des pros au Morne + sunset session` (kitesurf)
- `a079 · Coucher du soleil à La Prairie`
- `a094 · Équitation sur la plage au coucher du soleil`
- `a194 · Coucher de soleil à Flic-en-Flac ou Albion`

**Reco** : 5 manières différentes de voir le sunset, chacune avec son support
(bateau, plage, cheval). Garder distincts (chaque activité a sa
particularité) mais ajouter un tag/thème commun pour les retrouver
facilement — peut-être un nouveau filtre "Sunset".

### 8. Stand-up paddle
- `a021 · Stand-up paddle dans la rivière Tamarin`
- `a038 · Stand-up paddle yoga au lever du soleil`

**Reco** : 2 contextes différents (rivière vs. mer/yoga). Garder distincts.

---

## Confiance faible — proximité géographique ≠ activités à fusionner

Ces grappes partagent une zone mais sont des expériences distinctes.
Aucune fusion suggérée :

- **Chamarel** (5 activités) : équitation, cascade, fangourin, rhumerie,
  achat rhum vieux. Variantes de "une journée à Chamarel" — pourrait
  justifier un "thème de journée" à terme.
- **Pamplemousses** (4 activités) : jardin botanique, Aventure du Sucre,
  Bassin des Esclaves, Powder Mills. Idem — variantes de "une journée
  Pamplemousses".
- **Trou aux Biches / Black River / Tamarin** : nombreuses sorties mer.
  Aucune fusion, juste de la proximité.
- **Souillac (9 activités)** : Rochester Falls, Gris-Gris, Pont Naturel,
  Le Souffleur, plages, musée, église. Variantes d'une journée sud sauvage.

---

## Pistes plus ambitieuses (hors v1)

- **"Itinéraires de journée"** : au lieu de fusionner, créer un nouveau
  type d'entité au-dessus des activités — un "itinéraire" = liste
  ordonnée d'activités du même secteur (ex. "Journée Chamarel" = a056 →
  a083 → a118 → a123). Permet de regrouper sans appauvrir.
- **Tag "thème"** : ajouter des tags transverses comme `Sunset`,
  `Histoire 1810`, `Famille Saint Aubin`, etc., pour permettre de tirer
  les fils thématiques sans casser la structure actuelle.

---

## Recommandation finale

Pour rester aligné avec le travail déjà fait :
- **Action immédiate** : aucune fusion supplémentaire au-delà des 3
  doublons déjà supprimés.
- **À considérer** : fusionner a061 + a063 (Sept Cascades soft/intégrale)
  et a122 + a130 (cours de cuisine) si tu veux raccourcir le deck.
- **Plus tard** : ajouter un tag "Sunset" et peut-être un système
  d'itinéraires de journée pour les grappes géographiques (Chamarel,
  Pamplemousses, Souillac).
