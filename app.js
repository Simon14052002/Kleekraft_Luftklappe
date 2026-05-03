if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => console.log("Service Worker registriert!"));
}

// FIREBASE INITIALISIEREN (HINWEIS: Füge hier wieder deine Keys ein!)
const firebaseConfig = {
    apiKey: "DEIN_API_KEY",
    authDomain: "kleekraftluftklappe.firebaseapp.com",
    projectId: "kleekraftluftklappe",
    storageBucket: "kleekraftluftklappe.appspot.com",
    messagingSenderId: "DEINE_ID",
    appId: "DEINE_APP_ID"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

db.enablePersistence().catch(function(err) {
    console.error("Offline-Modus konnte nicht aktiviert werden:", err);
});

function func1(T, F) {
    return (5.018 + 0.32321 * T + 8.1847e-3 * Math.pow(T, 2) + 3.1243e-4 * Math.pow(T, 3)) * (1 - F);
}

let letztesErgebnis = null;

function berechneOptimum() {
    let inT_raw = document.getElementById('inT').value;
    let inF_raw = document.getElementById('inF').value;
    let outT_raw = document.getElementById('outT').value;
    let outF_raw = document.getElementById('outF').value;

    // Prüfen, ob alle 4 Felder ausgefüllt sind
    if (inT_raw === "" || inF_raw === "" || outT_raw === "" || outF_raw === "") {
        document.getElementById('resultDisplay').innerHTML = `Bitte alle 4 Werte eintragen...`;
        letztesErgebnis = null;
        return; // Bricht hier ab, rechnet noch nicht
    }

    // Wenn alle da sind, umwandeln und rechnen
    let inT = parseFloat(inT_raw);
    let inF = parseFloat(inF_raw) / 100.0;
    let outT = parseFloat(outT_raw);
    let outF = parseFloat(outF_raw) / 100.0;

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
    document.getElementById('resultDisplay').innerHTML = `Optimale Außenluftklappe: <b style="color:#28a745; font-size:1.2em;">${optimalPercent}%</b>`;
}

function speichereDaten() {
    if (letztesErgebnis === null) return alert("Bitte zuerst alle 4 Werte oben eintragen!");
    let actualVal = document.getElementById('actualVal').value;
    if (actualVal === "") return alert("Bitte trage den tatsächlichen Wert ein!");

    let eintrag = {
        inT: document.getElementById('inT').value,
        inF: document.getElementById('inF').value,
        outT: document.getElementById('outT').value,
        outF: document.getElementById('outF').value,
        opt: letztesErgebnis,
        ist: actualVal,
        timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    };

    db.collection("historie").add(eintrag);
    
    // Nach dem Speichern nur den "Ist-Wert" leeren, falls man noch was korrigieren will
    document.getElementById('actualVal').value = ''; 
}

function starteDatenSync() {
    db.collection("historie").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        let tbody = document.querySelector('#historyTable tbody');
        tbody.innerHTML = '';

        snapshot.forEach((doc) => {
            let row = doc.data();
            let id = doc.id; 
            
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

function loescheEintrag(id) {
    if (confirm("Diesen Eintrag wirklich löschen?")) {
        db.collection("historie").doc(id).delete();
    }
}

async function exportiereCSV() {
    try {
        const snapshot = await db.collection("historie").orderBy("timestamp", "desc").get();
        let csvContent = "Datum;Uhrzeit;T_in (°C);F_in (%);T_out (°C);F_out (%);Opt. Klappe (%);Ist-Klappe (%)\n";

        snapshot.forEach((doc) => {
            let row = doc.data();
            let datumStr = "";
            let zeitStr = "";
            
            if (row.timestamp) {
                let dateObj = row.timestamp.toDate();
                datumStr = dateObj.toLocaleDateString('de-AT'); 
                zeitStr = dateObj.toLocaleTimeString('de-AT');  
            }

            csvContent += `${datumStr};${zeitStr};${row.inT};${row.inF};${row.outT};${row.outF};${row.opt};${row.ist}\n`;
        });

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", "Luftklappen_Historie.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Fehler beim Exportieren: ", error);
        alert("Fehler beim Erstellen der CSV-Datei.");
    }
}

// WIRD BEIM STARTEN DER APP AUSGEFÜHRT
window.onload = () => {
    // 1. Alle Felder hart leeren, wenn die App neu gestartet wird
    document.getElementById('inT').value = "";
    document.getElementById('inF').value = "";
    document.getElementById('outT').value = "";
    document.getElementById('outF').value = "";
    document.getElementById('actualVal').value = "";

    // 2. Datenbank-Sync starten
    starteDatenSync(); 
    
    // 3. Info-Text "Bitte Werte eintragen" anzeigen lassen
    berechneOptimum();
};