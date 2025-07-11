document.addEventListener("DOMContentLoaded", () => {
    // Karte initialisieren
    const map = L.map("map", {
        center: [49.998, 8.274],
        zoom: 15
    });

    // OpenStreetMap-Tiles hinzufügen
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        subdomains: ["a", "b", "c"]
    }).addTo(map);

    // Marker aus locations.js laden
    locations.forEach(location => {
        L.marker([location.lat, location.lon])
            .bindPopup(`<b>${location.name}</b><br>${location.description}<br><img src="${location.image}" width="200">`)
            .addTo(map);
    });

    // Benutzer-Position-Marker-Stil (Det - Mainzelmännchen)
    const userIcon = L.icon({
        iconUrl: 'img/Det.png',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });

    let userMarker = null;
    let isDragging = false;

    // Benutzerposition anzeigen
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            if (!isDragging) { 
                const { latitude, longitude } = position.coords;
                
                if (userMarker) {
                    userMarker.setLatLng([latitude, longitude]);
                } else {
                    userMarker = L.marker([latitude, longitude], { 
                        icon: userIcon,
                        draggable: true 
                    }).addTo(map);
                    
                    // Event-Listener für Drag-Ende
                    userMarker.on("dragend", (e) => {
                        const newLatLng = e.target.getLatLng();
                        console.log("Neue Position:", newLatLng);
                        map.setView(newLatLng, map.getZoom()); 
                    });

                    // Cursor-Feedback
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

    // Vollbild-Funktion
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    let isFullscreen = false;

    fullscreenToggle.addEventListener('click', () => {
        if (!isFullscreen) {
            // Vollbild-Modus aktivieren
            document.getElementById('map').classList.add('fullscreen');
            map.invalidateSize();
            isFullscreen = true;
            fullscreenToggle.textContent = '🗺️ Normal';
        } else {
            // Vollbild-Modus deaktivieren
            document.getElementById('map').classList.remove('fullscreen');
            map.invalidateSize();
            isFullscreen = false;
            fullscreenToggle.textContent = '🗺️ Vollbild';
        }
    });
});