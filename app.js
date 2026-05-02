// Service Worker registrieren (für Offline-Funktionalität)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log("Service Worker registriert!");
    });
}

// Deine Python func1 übersetzt in JS
function func1(T, F) {
    return (5.018 + 0.32321 * T + 8.1847e-3 * Math.pow(T, 2) + 3.1243e-4 * Math.pow(T, 3)) * (1 - F);
}

// Globale Variable für das letzte Ergebnis
let letztesErgebnis = null;

function berechneOptimum() {
    // Werte auslesen
    let inT = parseFloat(document.getElementById('inT').value);
    let inF = parseFloat(document.getElementById('inF').value) / 100.0; // % in Faktor wandeln
    let outT = parseFloat(document.getElementById('outT').value);
    let outF = parseFloat(document.getElementById('outF').value) / 100.0; // % in Faktor wandeln

    let max_val = -Infinity;
    let optimal_x = 0;

    // Iteration wie in Python (np.arange(0, 1.001, 0.01))
    for (let x = 0; x <= 1.001; x += 0.01) {
        let t_mix = inT * x + outT * (1 - x);
        let f_mix = inF * x + outF * (1 - x);
        let val = func1(t_mix, f_mix);
        
        if (val > max_val) {
            max_val = val;
            optimal_x = x;
        }
    }

    let optimalPercent = Math.round((1 - optimal_x) * 100);
    letztesErgebnis = optimalPercent;
    
    document.getElementById('resultDisplay').innerHTML = `Optimale Außenluftklappe: <b>${optimalPercent}%</b>`;
}

function speichereDaten() {
    if (letztesErgebnis === null) {
        alert("Bitte zuerst berechnen!");
        return;
    }

    let actualVal = document.getElementById('actualVal').value;
    if (actualVal === "") {
        alert("Bitte trage den tatsächlichen Wert ein!");
        return;
    }

    // Datensatz erstellen
    let eintrag = {
        inT: document.getElementById('inT').value,
        inF: document.getElementById('inF').value,
        outT: document.getElementById('outT').value,
        outF: document.getElementById('outF').value,
        opt: letztesErgebnis,
        ist: actualVal,
        timestamp: new Date().getTime()
    };

    // Aus LocalStorage holen, hinzufügen, wieder speichern
    let history = JSON.parse(localStorage.getItem('klappenHistorie') || '[]');
    history.unshift(eintrag); // Oben einfügen
    localStorage.setItem('klappenHistorie', JSON.stringify(history));

    document.getElementById('actualVal').value = ''; // Feld leeren
    ladeTabelle();
}

function ladeTabelle() {
    let history = JSON.parse(localStorage.getItem('klappenHistorie') || '[]');
    let tbody = document.querySelector('#historyTable tbody');
    tbody.innerHTML = '';

    history.forEach(row => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.inT}</td>
            <td>${row.inF}</td>
            <td>${row.outT}</td>
            <td>${row.outF}</td>
            <td><b>${row.opt}</b></td>
            <td>${row.ist}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Beim Start Tabelle laden und initiale Berechnung durchführen
window.onload = () => {
    ladeTabelle();
    berechneOptimum();
};