if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log("Service Worker registriert!");
    });
}

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

    let eintrag = {
        inT: document.getElementById('inT').value,
        inF: document.getElementById('inF').value,
        outT: document.getElementById('outT').value,
        outF: document.getElementById('outF').value,
        opt: letztesErgebnis,
        ist: actualVal,
        timestamp: new Date().getTime()
    };

    let history = JSON.parse(localStorage.getItem('klappenHistorie') || '[]');
    history.unshift(eintrag);
    localStorage.setItem('klappenHistorie', JSON.stringify(history));

    document.getElementById('actualVal').value = ''; 
    ladeTabelle();
}

// NEUE FUNKTION: Löschen eines Eintrags
function loescheEintrag(index) {
    let bestaetigung = confirm("Diesen Eintrag wirklich löschen?");
    if (bestaetigung) {
        let history = JSON.parse(localStorage.getItem('klappenHistorie') || '[]');
        // Lösche exakt 1 Element an der Position "index"
        history.splice(index, 1);
        // Speichere die aktualisierte Liste
        localStorage.setItem('klappenHistorie', JSON.stringify(history));
        // Lade die Tabelle neu
        ladeTabelle();
    }
}

// ANGEPASSTE FUNKTION: Tabelle aufbauen inkl. Lösch-Button
function ladeTabelle() {
    let history = JSON.parse(localStorage.getItem('klappenHistorie') || '[]');
    let tbody = document.querySelector('#historyTable tbody');
    tbody.innerHTML = '';

    // Der zweite Parameter "index" merkt sich, an welcher Stelle der Eintrag in der Liste steht
    history.forEach((row, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.inT}</td>
            <td>${row.inF}</td>
            <td>${row.outT}</td>
            <td>${row.outF}</td>
            <td><b>${row.opt}</b></td>
            <td>${row.ist}</td>
            <td><button class="btn-delete" onclick="loescheEintrag(${index})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.onload = () => {
    ladeTabelle();
    berechneOptimum();
};