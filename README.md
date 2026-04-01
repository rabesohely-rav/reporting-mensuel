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
