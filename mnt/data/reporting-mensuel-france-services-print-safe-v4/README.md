# Reporting mensuel France Services — version écran inchangé / impression stabilisée

## Principe
Cette version conserve l'affichage navigateur existant et n'applique les ajustements qu'en impression.

## Ce qui a été renforcé
- aucune modification de mise en page écran
- réduction des visuels uniquement dans `@media print`
- meilleure netteté des graphiques via `devicePixelRatio`
- marges internes d'impression plus sûres
- prévention des débordements et empiètements
- couleurs forcées à l'impression

## Fichiers
- `index.html`
- `styles.css`
- `app.js`
- `assets/`

## Conseils d'export PDF
- Chrome ou Edge
- échelle 100 %
- format A4 portrait
- arrière-plans activés si le navigateur le demande


## Stabilisation impression v2
- affichage écran conservé
- réduction des visuels uniquement en impression
- densité des canvas augmentée
- préparation avant impression renforcée
- marges et espacements d'impression resserrés de façon contrôlée

- v3 : verrouillage renforcé des sauts de page pour Edge/Windows
- v3 : nom de sauvegarde prérempli avec `Reporting` mais modifiable


## Correctif v4
- verrouillage strict des 2 colonnes sur la page 1
- champ 'Nom de sauvegarde' prérempli avec Reporting
- placeholder 'Nom de la France Services' et 'Mois année'
- libellés du graphique Top 5 des thématiques forcés sur 5 catégories, y compris Edge Windows
- densité adaptative page 1 selon le volume des tableaux
