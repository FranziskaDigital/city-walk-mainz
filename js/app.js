document.addEventListener("DOMContentLoaded", () => {
    // Karte initialisieren
    const map = L.map("map", {
        center: [49.998, 8.274],
        zoom: 15
    });

    // OpenStreetMap-Tiles hinzufügen
    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        subdomains: ["a", "b", "c"]
    });

    // Basis-Layer zur Karte hinzufügen
    osmLayer.addTo(map);

    // Layer-Gruppen erstellen
    const stadtrundgangLayer = L.layerGroup();
    const stolpersteineLayer = L.layerGroup();
    const wikidataLayer = L.layerGroup();

    // Marker aus locations.js zu Stadtrundgang-Layer hinzufügen
    locations.forEach(location => {
        L.marker([location.lat, location.lon])
            .bindPopup(`<b>${location.name}</b><br>${location.description}<br><img src="${location.image}" width="200">`)
            .addTo(stadtrundgangLayer);
    });

    // Stadtrundgang-Layer standardmäßig zur Karte hinzufügen
    stadtrundgangLayer.addTo(map);

    // Benutzer-Position-Marker-Stil (Det - Mainzelmännchen)
    const userIcon = L.icon({
        iconUrl: '/img/Det.png',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });

    // Stolperstein-Icon erstellen
    const stolpersteinIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });

    let userMarker = null;
    let isDragging = false;
    let currentLocation = [49.998, 8.274]; // Fallback-Koordinaten für Mainz

    // Benutzerposition anzeigen
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            if (!isDragging) {
                const { latitude, longitude } = position.coords;
                currentLocation = [longitude, latitude]; // Für SPARQL-Abfrage (lng, lat)
                
                if (userMarker) {
                    userMarker.setLatLng([latitude, longitude]);
                } else {
                    userMarker = L.marker([latitude, longitude], { 
                        icon: userIcon,
                        draggable: true
                    }).addTo(map);
                    
                    userMarker.on("dragend", (e) => {
                        const newLatLng = e.target.getLatLng();
                        currentLocation = [newLatLng.lng, newLatLng.lat]; // Aktualisiere currentLocation
                        console.log("Neue Position:", newLatLng);
                        map.setView(newLatLng, map.getZoom());
                    });

                    userMarker.on("dragstart", () => {
                        isDragging = true;
                        userMarker._icon.style.cursor = "grabbing";
                    });

                    userMarker.on("dragend", () => {
                        isDragging = false;
                        userMarker._icon.style.cursor = "move";
                    });
                }
            }
        }, error => {
            console.error("Geolocation-Error:", error);
            alert("Standortermittlung fehlgeschlagen.");
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
        });
    } else {
        console.warn("Geolocation nicht unterstützt");
        alert("Ihr Browser unterstützt keine Standortermittlung.");
    }

    /* Generische Abfrage von Daten per SPARQL */
    async function fetchData(url) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            const results = data.results.bindings;
            return results;
        } catch (error) {
            console.error('Fehler bei der SPARQL-Abfrage:', error);
            return [];
        }
    }

    /* Stolpersteine in Mainz abrufen */
    async function loadStolpersteine() {
        const endpoint = 'https://query.wikidata.org/sparql';
        
        const sparqlQuery = `
            SELECT ?Stolperstein ?StolpersteinLabel ?geographische_Koordinaten WHERE {
                SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en,mul,[AUTO_LANGUAGE]". }
                ?Stolperstein wdt:P31 wd:Q26703203.
                OPTIONAL { ?Stolperstein wdt:P625 ?geographische_Koordinaten. }
                ?Stolperstein wdt:P131 wd:Q1720.
            }
        `;

        const url = `${endpoint}?query=${encodeURIComponent(sparqlQuery)}&format=json`;
        
        try {
            const results = await fetchData(url);
            
            // Stolperstein-Layer leeren
            stolpersteineLayer.clearLayers();
            
            results.forEach(result => {
                if (result.geographische_Koordinaten) {
                    const coordMatch = result.geographische_Koordinaten.value.match(/Point\(([-+]?\d*\.\d+)\s([-+]?\d*\.\d+)\)/);
                    if (coordMatch) {
                        const lng = parseFloat(coordMatch[1]);
                        const lat = parseFloat(coordMatch[2]);
                        
                        const marker = L.marker([lat, lng], { icon: stolpersteinIcon })
                            .bindPopup(`
                                <div class="popup-content">
                                    <h3>${result.StolpersteinLabel.value}</h3>
                                    <p><strong>Stolperstein</strong></p>
                                    <p>Koordinaten: ${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
                                    <a href="${result.Stolperstein.value}" target="_blank">Wikidata-Eintrag</a>
                                </div>
                            `);
                        
                        stolpersteineLayer.addLayer(marker);
                    }
                }
            });
            
            console.log(`${results.length} Stolpersteine geladen`);
        } catch (error) {
            console.error('Fehler beim Laden der Stolpersteine:', error);
        }
    }

    /* Erweiterte Wikidata-Abfrage für Museen, Schulen und Parks */
    async function loadWikidataEntities() {
        const endpoint = 'https://query.wikidata.org/sparql';

        const url = `${endpoint}?query=${encodeURIComponent(sparqlQuery)}&format=json`;

        try {
            const results = await fetchData(url);
            
            // Wikidata-Layer leeren
            wikidataLayer.clearLayers();
            
            results.forEach(result => {
                const lngLat = result.location.value.match(/Point\(([-+]?\d*\.\d+)\s([-+]?\d*\.\d+)\)/);
                if (lngLat) {
                    const lng = parseFloat(lngLat[1]);
                    const lat = parseFloat(lngLat[2]);

                    const wikipedia = 'wikipedia' in result ? result.wikipedia.value : null;
                    const image = 'image' in result ? result.image.value : null;

                    const popupContent = `
                        <div class="popup-content">
                            <h3>${result.entityLabel.value}</h3>
                            <p><strong>Typ:</strong> ${result.entityTypeLabel.value}</p>
                            <p>${result.description.value}</p>
                            ${image ? `<img src="${image}" width="200" style="max-width: 100%; height: auto;">` : ''}
                            ${wikipedia ? `<p><a href="${wikipedia}" target="_blank">Wikipedia-Artikel</a></p>` : ''}
                            <p><a href="${result.entity.value}" target="_blank">Wikidata-Eintrag</a></p>
                        </div>
                    `;

                    const marker = L.marker([lat, lng])
                        .bindPopup(popupContent);
                    
                    wikidataLayer.addLayer(marker);
                }
            });
            
            console.log(`${results.length} Wikidata-Entitäten geladen`);
        } catch (error) {
            console.error('Fehler beim Laden der Wikidata-Entitäten:', error);
        }
    }

    // Layer-Control erstellen
    const baseLayers = {
        "OpenStreetMap": osmLayer
    };

    const overlayLayers = {
        "Stadtrundgang": stadtrundgangLayer,
        "Stolpersteine": stolpersteineLayer,
    };

    const layerControl = L.control.layers(baseLayers, overlayLayers, {
        position: 'topright',
        collapsed: false
    }).addTo(map);

    // Event-Listener für Layer-Aktivierung
    map.on('overlayadd', function(e) {
        if (e.name === 'Stolpersteine' && stolpersteineLayer.getLayers().length === 0) {
            loadStolpersteine();
        }
    });

    // Beim ersten Start der App nur die Stadtrundgang-Daten laden
    console.log("Locations:", locations);
});