/** Display context only. These rendered tiles are never measurement inputs. */
export const basemaps = {
  satellite: {
    name: 'Detailed satellite',
    source: 'Esri World Imagery',
    tile: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?blankTile=false',
    // The service advertises more levels than many places actually contain.
    // Cap native requests at 19; the camera can overzoom without blank level-20 tiles.
    maxZoom: 19,
    year: null,
    license: 'Esri Master License Agreement; source terms apply',
    terms: 'https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9',
    attribution:
      '<a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">Esri World Imagery</a> · Esri, Vantor, Earthstar Geographics, GIS User Community',
    exportAttribution: [
      'Esri World Imagery | Esri, Vantor, Earthstar Geographics, GIS User Community',
      'Source terms: https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9',
    ],
    description: 'Optical context; imagery dates and resolution vary by place. Not live or NISAR.',
  },
  sentinel: {
    name: 'Sentinel-2 mosaic · 2024',
    source: 'EOX / Copernicus Sentinel-2',
    tile: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg',
    maxZoom: 14,
    year: 2024,
    license: 'CC BY-NC-SA 4.0',
    terms: 'https://maps.eox.at/',
    attribution:
      '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by <a href="https://eox.at">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2024) · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>',
    exportAttribution: [
      'Sentinel-2 cloudless https://s2maps.eu by EOX IT Services GmbH https://eox.at',
      'Contains modified Copernicus Sentinel data 2024 | CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/',
    ],
    description: '2024 optical mosaic; not NISAR, live imagery or a flood-detection layer.',
  },
} as const;

export type BasemapId = keyof typeof basemaps;
export type Basemap = (typeof basemaps)[BasemapId];

export const placeLabels = {
  tile: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Labels: Esri, HERE, Garmin, © OpenStreetMap contributors, GIS User Community',
};
