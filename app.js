if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => console.log("Service Worker registriert!"));
}

const firebaseConfig = {
  apiKey: "AIzaSyBOYiIIf91pbu_AzA3Sukt-ErS9dOqI42o",
  authDomain: "kleekraftluftklappe.firebaseapp.com",
  databaseURL: "https://kleekraftluftklappe-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kleekraftluftklappe",
  storageBucket: "kleekraftluftklappe.firebasestorage.app",
  messagingSenderId: "421408898351",
  appId: "1:421408898351:web:3daef18da329b96dbd35da",
  measurementId: "G-JXHGPR8XF3"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. OFFLINE MODUS AKTIVIEREN (Das ist der Trick für den Heizungskeller!)
db.enablePersistence().catch(function(err) {
    console.error("Offline-Modus konnte nicht aktiviert werden:", err);
});

// --- DEINE BERECHNUNGSLOGIK BLEIBT GLEICH ---
function func1(T, F) {
    return (5.018 + 0.32321 * T + 8.1847e-3 * Math.pow(T, 2) + 3.1243e-4 * Math.pow(T, 3)) * (1 - F);
}

let letztesErgebnis = null;

function berechneOptimum() {
    let inT = parseFloat(document.getElementById('inT').value);
    let inF = parseFloat(document.getElementById('inF').value) / 100.0;
    let outT = parseFloat(document.getElementById('outT').value);
    let outF = parseFloat(document.getElementById('outF').value) / 100.0;

    let max_val = -Infinity;
    let optimal_x = 0;

    for (let x = 0; x <= 1.001; x += 0.01) {
        let t_mix = inT * x + outT * (1 - x);
        let f_mix = inF * x + outF * (1 - x);
        let val = func1(t_mix, f_mix);
        if (val > max_val) { max_val = val; optimal_x = x; }
    }

    let optimalPercent = Math.round((1 - optimal_x) * 100);
    letztesErgebnis = optimalPercent;
    document.getElementById('resultDisplay').innerHTML = `Optimale Außenluftklappe: <b>${optimalPercent}%</b>`;
}

// --- NEU: DATEN IN FIREBASE SPEICHERN ---
function speichereDaten() {
    if (letztesErgebnis === null) return alert("Bitte zuerst berechnen!");
    let actualVal = document.getElementById('actualVal').value;
    if (actualVal === "") return alert("Bitte trage den tatsächlichen Wert ein!");

    let eintrag = {
        inT: document.getElementById('inT').value,
        inF: document.getElementById('inF').value,
        outT: document.getElementById('outT').value,
        outF: document.getElementById('outF').value,
        opt: letztesErgebnis,
        ist: actualVal,
        // Firebase Zeitstempel sorgt dafür, dass die Sortierung immer stimmt
        timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    };

    // In die Cloud senden (oder lokal zwischenspeichern, falls offline)
    db.collection("historie").add(eintrag);
    document.getElementById('actualVal').value = ''; 
}

// --- NEU: ECHTZEIT-SYNCHRONISATION MIT DER CLOUD ---
function starteDatenSync() {
    // "onSnapshot" hört live zu. Wenn jemand anderes etwas speichert, aktualisiert sich die Tabelle sofort!
    db.collection("historie").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        let tbody = document.querySelector('#historyTable tbody');
        tbody.innerHTML = '';

        snapshot.forEach((doc) => {
            let row = doc.data();
            let id = doc.id; // Die eindeutige ID des Dokuments aus der Datenbank
            
            // Verhindern, dass leere Zeilen angezeigt werden, bevor der Zeitstempel vom Server kommt
            if (!row.timestamp) return; 

            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.inT}</td>
                <td>${row.inF}</td>
                <td>${row.outT}</td>
                <td>${row.outF}</td>
                <td><b>${row.opt}</b></td>
                <td>${row.ist}</td>
                <td><button class="btn-delete" onclick="loescheEintrag('${id}')">🗑️</button></td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// --- NEU: AUS DER CLOUD LÖSCHEN ---
function loescheEintrag(id) {
    if (confirm("Diesen Eintrag wirklich löschen?")) {
        db.collection("historie").doc(id).delete();
    }
}

window.onload = () => {
    starteDatenSync(); 
    berechneOptimum();
};

// --- NEU: DATEN ALS CSV HERUNTERLADEN ---
async function exportiereCSV() {
    try {
        // 1. Alle Daten aus Firebase holen (sortiert nach Datum)
        const snapshot = await db.collection("historie").orderBy("timestamp", "desc").get();
        
        // 2. Die Kopfzeile der Excel-Tabelle erstellen (Semikolon für deutsches Excel)
        let csvContent = "Datum;Uhrzeit;T_in (°C);F_in (%);T_out (°C);F_out (%);Opt. Klappe (%);Ist-Klappe (%)\n";

        // 3. Jede Zeile aus der Datenbank durchgehen
        snapshot.forEach((doc) => {
            let row = doc.data();
            
            let datumStr = "";
            let zeitStr = "";
            
            // Zeitstempel in ein lesbares Format umwandeln (z.B. für Österreich 'de-AT')
            if (row.timestamp) {
                let dateObj = row.timestamp.toDate();
                datumStr = dateObj.toLocaleDateString('de-AT'); // z.B. 03.05.2026
                zeitStr = dateObj.toLocaleTimeString('de-AT');  // z.B. 14:30:00
            }

            // Die Zeile zusammenbauen (Werte mit Semikolon trennen)
            csvContent += `${datumStr};${zeitStr};${row.inT};${row.inF};${row.outT};${row.outF};${row.opt};${row.ist}\n`;
        });

        // 4. Einen unsichtbaren Download-Link erstellen und klicken
        // UTF-8 BOM (\uFEFF) hinzufügen, damit Excel Umlaute und Sonderzeichen (wie °C) richtig anzeigt
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", "Luftklappen_Historie.csv"); // Name der Datei
        document.body.appendChild(link);
        
        // Download auslösen
        link.click();
        
        // Aufräumen
        document.body.removeChild(link);

    } catch (error) {
        console.error("Fehler beim Exportieren: ", error);
        alert("Fehler beim Erstellen der CSV-Datei.");
    }
}