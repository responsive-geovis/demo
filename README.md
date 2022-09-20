# Responsive Map Demo – Work in Progress

-   Built using D3 and topojson

## Example #1: World Population Map

-   Dorling cartogram based on [Harry Stevens' Dorling cartogram on Observable](https://observablehq.com/@harrystevens/dorling-cartogram)
-   [Circle legend](https://observablehq.com/@harrystevens/circle-legend) is also by Harry Stevens

### Data

-   Boundaries and population data from [Natural Earth](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/) via [Harry Stevens' Dorling cartogram on Observable](https://observablehq.com/@harrystevens/dorling-cartogram)
-   [List of countries by continents](https://statisticstimes.com/geography/countries-by-continents.php)
-   The data has been modified slightly to fix missing ISO codes and match each country or region in the Natural Earth dataset to a continent.

## Example #2: Population of the Americas

-   Filtered the dataset for #1 for North and South America (`geo.features.filter(d => d.properties.continent === "North America" | d.properties.continent === "South America")`), manually edited the geojson file to add French Guiana as a separate entity, taking the population count from Wikipedia

## Example #3: to be updated

## Example #4: UK General Election 2019 (Choropleth/Hex Map)

-   Inspired by [BBC Election results live tracker](https://www.bbc.co.uk/news/election/2019/results)
-   Color scheme taken from BBC maps

## Example #5: French Legislative Election 2022

https://en.wikipedia.org/wiki/Results_of_the_2022_French_legislative_election_by_constituency
https://en.wikipedia.org/wiki/Departments_of_France
https://www.data.gouv.fr/fr/datasets/carte-des-circonscriptions-legislatives-2012-et-2017/
Explainer of how elections work https://www.institutmontaigne.org/en/analysis/institut-montaigne-explainer-understanding-legislative-elections-france

## Belgium

https://m.standaard.be/cnt/dmf20190521_04415189
https://nl.wikipedia.org/wiki/Belgische_federale_verkiezingen_2019#/media/Bestand:Belgische_verkiezingen_2019.svg

### Data

-   UK map by parliamentary constituency via [Martin Chorley's Github repo](https://github.com/martinjc/UK-GeoJSON/), combined using QGIS and simplified and converted to topojson using mapshaper.org.
-   Hex map of UK parliamentary constituencies via [ODI Leeds](https://odileeds.github.io/hexmaps/constituencies/)
-   2019 General Election results via [UK Parliament website](https://commonslibrary.parliament.uk/research-briefings/cbp-8749/)
