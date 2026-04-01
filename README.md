# Reporting mensuel France Services — V12 consolidation

Cette version capitalise les améliorations validées et verrouille les non-régressions.

## Socle verrouillé
- PDF limité à 2 pages
- Bouton **Télécharger** pour export direct PDF
- Numérotation du reporting : page 1 puis page 2
- Bandeau haut en 2 colonnes
- KPI en 2 colonnes
- Deux tableaux côte à côte sur la page 1
- Bloc **Modalité d'accès** en disposition V9 : graphique à gauche, légende interactive à droite
- Bloc **Demande par partenaire national** avec légende interactive à droite
- **Top 5 des thématiques** : 5 libellés visibles
- Tableau **Nombre de demandes en 2026** : valeur 0 => cellule vide et grisée
- Export PDF en haute résolution

## Réglages techniques consolidés
- `Chart.defaults.devicePixelRatio` renforcé
- export `html2canvas` en `scale: 4`
- mode `pdf-export` appliqué au clone HTML pour figer la mise en page pendant le téléchargement PDF
- cycles supplémentaires de stabilisation des graphiques avant export

## Arborescence
- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `assets/`
