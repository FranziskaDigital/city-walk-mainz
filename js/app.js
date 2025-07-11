document.addEventListener("DOMContentLoaded", () => {
    // Karte initialisieren
    const map = L.map("map", {
        center: [49.998, 8.274],
        zoom: 15
    });

    // OpenStreetMap-Tiles hinzufügen
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        subdomains: ["a", "b", "c"]
    }).addTo(map);

    // Benutzer-Position-Marker-Stil (grün)
    const userIcon = L.divIcon({
        iconSize: [20, 35],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        html: `<div style="background-color: #27ae60; width: 25px; height: 41px; border-radius: 50%; cursor: move;"></div>`
    });

    let userMarker = null;
    let isDragging = false;

    // Benutzerposition anzeigen
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            if (!isDragging) { // Nur aktualisieren, wenn nicht gezogen wird
                const { latitude, longitude } = position.coords;
                
                if (userMarker) {
                    userMarker.setLatLng([latitude, longitude]);
                } else {
                    userMarker = L.marker([latitude, longitude], { 
                        icon: userIcon,
                        draggable: true // Marker verschiebbar machen
                    }).addTo(map);
                    
                    // Event-Listener für Drag-Ende
                    userMarker.on("dragend", (e) => {
                        const newLatLng = e.target.getLatLng();
                        console.log("Neue Position:", newLatLng);
                        map.setView(newLatLng, map.getZoom()); // Karte auf neue Position zentrieren
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

    // Beispiel-Locations
    const locations = [
        {
            name: "Mainzer Dom",
            coordinates: [49.9996, 8.2742],
            description: "Bedeutendste Kathedrale in Mainz"
        }
    ];

    // Marker hinzufügen
    locations.forEach(loc => {
        const marker = L.marker(loc.coordinates).addTo(map);
        marker.bindPopup(`
            <h3>${loc.name}</h3>
            <p>${loc.description}</p>
        `);
    });
});