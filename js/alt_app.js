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
        iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Mainzelmaennchen_Det_Graffiti_am_MNK.jpg',
        iconSize: [40, 40], // Anpassen Sie die Größe nach Bedarf
        iconAnchor: [20, 20], // Anpassen Sie den Anchor nach Bedarf
        popupAnchor: [0, -20] // Anpassen Sie den Popup-Anchor nach Bedarf
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
});