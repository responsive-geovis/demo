# Fluid Responsiveness for Geographic Visualizations – Example Visualizations

This readme file lists the data sources for the four example visualizations and describes any modifications and preprocessing of the data.

## Example #1: World Population Map

-   Dorling cartogram based on [Harry Stevens' Dorling cartogram on Observable](https://observablehq.com/@harrystevens/dorling-cartogram)
-   [Circle legend](https://observablehq.com/@harrystevens/circle-legend) is also by Harry Stevens
-   Boundaries and population data from [Natural Earth](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/) via [Harry Stevens' Dorling cartogram on Observable](https://observablehq.com/@harrystevens/dorling-cartogram)
-   [List of countries by continents](https://statisticstimes.com/geography/countries-by-continents.php)
-   Preprocessing: Converted boundaries from topojson to geojson, added centroids and continents to each item. The data has also been edited manually to fix missing ISO codes and match each country or region in the Natural Earth dataset to a continent.

## Example #2: Population of the Americas

-   Filtered the dataset for #1 for North and South America (`geo.features.filter(d => d.properties.continent === "North America" | d.properties.continent === "South America")`), manually edited the geojson file to add French Guiana as a separate entity, taking the population count from Wikipedia

## Examples #3 + #4: UK General Election 2019 (Choropleth/Hex Map)

-   Inspired by [BBC Election results live tracker](https://www.bbc.co.uk/news/election/2019/results), which is where the color scheme was taken from as well.
-   UK map by parliamentary constituency via [Martin Chorley's Github repo](https://github.com/martinjc/UK-GeoJSON/), combined using QGIS and simplified and converted to topojson using mapshaper.org.
-   Hex map of UK parliamentary constituencies via [ODI Leeds](https://odileeds.github.io/hexmaps/constituencies/)
-   2019 General Election results via [UK Parliament website](https://commonslibrary.parliament.uk/research-briefings/cbp-8749/)
