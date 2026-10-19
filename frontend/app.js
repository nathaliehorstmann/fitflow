
// ============================================================
// FitFlow – Frontend-Logik (MVP-Prototyp)
// Steuert Login/Registrierung, Wochenplan-Anzeige, Drag & Drop
// und die Übungsbibliothek. Kommuniziert per fetch() mit dem
// Node.js/Express-Backend (server.js), das die Daten in MariaDB
// liest und schreibt.
// ============================================================


// Basis-URL der REST-API für den Wochenplan (siehe server.js, ROUTE 1 & 2)
const API_URL = "http://localhost:3000/api/wochenplan";

// Zentraler App-Zustand: hier hält das Frontend alle Daten, die
// sich während der Nutzung ändern (kein echtes Framework wie
// React im Einsatz, daher ein einfaches globales Objekt)
const appData = {
    loggedIn: false,               // aktuell ungenutzt, für spätere Erweiterung vorgesehen
    currentTab: 'plan',            // welcher Tab unten in der Navbar aktiv ist
    isRegisterMode: false,         // true = Regristrierungsformular, false = Login-Formular
    selectedCategory: [],          // aktive Filter in der Übungsbibliothek (mehrere gleichzeitig möglich)
    selectedPoolCategory: 'Alle',   // aktiver Filter im Drag & Drop-Übungspool
    wochenplan: {}, // Wochenplan-Daten werden live vom Server befüllt
    exercises: [],   // alle Übungen aus der Datenbank
    currentUserID: 1   //Standardmäßig auf 1 (Lena), wird beim Login/Registrieren überschrieben
};


// Lädt alle Übungen aus der Datenbank (GET /api/exercises) und
// speichert sie im appData-Objekt. Wird beim Login/Registrieren
// aufgerufen, damit die Übungsbibliothek (US-04) gefüllt ist.
async function loadExercisesFromServer() {
    try {
        const response = await fetch('http://localhost:3000/api/exercises');
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Übungen vom Server');
        }
        
        appData.exercises = await response.json();
        console.log("Übungen erfolgreich aus DB geladen:", appData.exercises);

        // Zeichnet die Übungsbibliothek neu, sobald die Daten angekommen sind
        renderExerciseLibrary(); 

    } catch (error) {
        console.error("Fehler beim Laden der Übungen:", error);
    }
}

// Zentrale Referenzen auf die 4 Haupt-"Screens" der App (Login,
// Plan-Übersicht, Drag-&-Drop-Bearbeitung, Übungsbibliothek) sowie
// die untere Navigationsleiste. Jeder Screen ist ein <div>, das per
// classList.add/remove('hidden') ein- bzw. ausgeblendet wird –
// es findet kein echter Seitenwechsel statt (Single Page App).
const screenLogin = document.getElementById('screen-login');
const screenPlan = document.getElementById('screen-plan');
const screenEdit = document.getElementById('screen-edit');
const screenExercises = document.getElementById('screen-exercises');
const bottomNavbar = document.getElementById('bottom-navbar');

// SERVER-FUNKTION: Holt den gespeicherten Wochenplan des Users
// per GET /api/wochenplan und zeichnet ihn direkt im Lesemodus
// (US-02). Wird nach Login/Registrierung sowie nach jedem
// Tab-Wechsel zurück zum Plan aufgerufen.
// SERVER-FUNKTION: Holt den gespeicherten Wochenplan des AKTUELLEN Users
async function loadPlanFromServer() {
    try {
        // WICHTIG: Vor dem Laden das alte Objekt leeren, damit keine Reste von der vorherigen Persona im Speicher hängen!
        appData.wochenplan = {
            "Mo": [], "Di": [], "Mi": [], "Do": [], "Fr": [], "Sa": [], "So": []
        };

        const response = await fetch(`${API_URL}?userId=${appData.currentUserID}`);
        if (!response.ok) {
            throw new Error('Fehler beim Abrufen des Wochenplans');
        }
        
        appData.wochenplan = await response.json();
        
        // Aktualisiert sowohl die Lese-Ansicht als auch die Edit-Ansicht mit den frischen Daten
        renderWochenplanDisplay();
        if (typeof renderWochenplanEdit === 'function') {
            renderWochenplanEdit();
        }
        
        console.log(`Wochenplan für User ID ${appData.currentUserID} erfolgreich geladen:`, appData.wochenplan);
    } catch (error) {
        console.error("Fehler beim Laden vom Server:", error);
        alert("Backend nicht erreichbar! Hast du 'node server.js' im backend-Ordner gestartet?");
    }
}

// SERVER-FUNKTION: Schreibt den aktuellen Wochenplan (appData.wochenplan)
// per POST /api/wochenplan in die Datenbank. Wird nach jeder
// Drag-&-Drop-Aktion automatisch aufgerufen (siehe saveDragState),
// damit Änderungen sofort gespeichert sind (US-03, "Auto-Save").
async function savePlanToServer() {
    try {
        const response = await fetch(`${API_URL}?userId=${appData.currentUserID}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(appData.wochenplan)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error(`Fehler beim Speichern für User ${appData.currentUserID}:`, response.status, errorData);
            return;
        }

        console.log(`Erfolgreich auf Server für User ${appData.currentUserID} auto-gespeichert!`);
    } catch (error) {
        console.error("Fehler beim Speichern auf dem Server:", error);
    }
}

// Haupt-Event-Listener für das Login/Registrierungs-Formular (US-01).
// Da MVP-Prototyp: es gibt keine echte Nutzerverwaltung im Backend –
// die Anmeldedaten werden rein im Frontend geprüft (siehe Kommentare
// unten). Für die finale Version würde diese Prüfung serverseitig
// gegen die Datenbank erfolgen (inkl. Passwort-Hashing).
// Haupt-Event-Listener für das Login/Registrierungs-Formular (US-01).
// KORREKTUR: "async" hinzugefügt, um synchronisiertes Laden zu ermöglichen!
// Haupt-Event-Listener für das Login/Registrierungs-Formular (US-01).
// KORREKTUR: "async" hinzugefügt, um die Ausführungsreihenfolge zu garantieren!
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();   // verhindert den Standard-Formular-Reload der Seite
    
    const emailInput = document.getElementById('login-email').value.toLowerCase().trim();
    const passwordInput = document.getElementById('login-password').value;
    const errorDisplay = document.getElementById('login-error');

    // Kleiner Helfer: Weist den 4 Personas basierend auf der E-Mail ihre korrekte DB-ID zu
    function getUserIdByEmail(email) {
        if (email.includes('lena')) return 1;
        if (email.includes('jonas')) return 2;
        if (email.includes('marco')) return 3;
        if (email.includes('sara')) return 4;
        return 1; // Fallback
    }

    // FALL 1: Registrierungsmodus aktiv
    if (appData.isRegisterMode) {
        if (emailInput.includes('@') && passwordInput.length >= 6) {
            if (errorDisplay) errorDisplay.classList.add('hidden');
            
            appData.currentUserID = getUserIdByEmail(emailInput);

            const namePart = emailInput.split('@')[0];
            const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
            
            const nameElement = document.getElementById('username-display');
            if (nameElement) nameElement.textContent = formattedName;

            screenLogin.classList.add('hidden');
            screenPlan.classList.remove('hidden');
            bottomNavbar.classList.remove('hidden');
            
            // KORREKTUR: Mit "await" warten wir, bis die Daten wirklich da sind!
            await loadPlanFromServer();
            await loadExercisesFromServer();
            renderWochenplanEdit();
            
            alert(`Konto für ${formattedName} (ID: ${appData.currentUserID}) erfolgreich simuliert!`);
        } else {
            if (errorDisplay) {
                errorDisplay.textContent = "Ungültige E-Mail oder Passwort zu kurz (min. 6 Zeichen)!";
                errorDisplay.classList.remove('hidden');
            }
        }
        return;
    }

    // FALL 2: Normaler Login-Modus.
    if (emailInput.includes('@') && passwordInput === 'passwort123') {
        if (errorDisplay) errorDisplay.classList.add('hidden');

        appData.currentUserID = getUserIdByEmail(emailInput);

        const namePart = emailInput.split('@')[0];
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        
        const nameElement = document.getElementById('username-display');
        if (nameElement) nameElement.textContent = formattedName;

        screenLogin.classList.add('hidden');
        screenPlan.classList.remove('hidden');
        bottomNavbar.classList.remove('hidden');
        
        // KORREKTUR: Mit "await" warten wir, bis die Daten wirklich da sind!
        await loadPlanFromServer();
        await loadExercisesFromServer();
        renderWochenplanEdit();
    } else {
        if (errorDisplay) {
            errorDisplay.textContent = "Falsche Anmeldedaten! (Nutze 'passwort123')";
            errorDisplay.classList.remove('hidden');
        }
    }
});

// Schaltet die Login-Maske visuell zwischen "Anmelden" und
// "Registrieren" um (Titel, Button-Text, Link-Text). Die eigentliche
// Logik dazu liegt im Submit-Handler oben (appData.isRegisterMode).
function toggleLoginMode() {
    appData.isRegisterMode = !appData.isRegisterMode;
    
    const title = document.getElementById('login-title');
    const subtitle = document.getElementById('login-subtitle');
    const btnText = document.getElementById('login-btn-text');
    const toggleLink = document.getElementById('login-toggle-link');
    const errorDisplay = document.getElementById('login-error');
    
    if (errorDisplay) errorDisplay.classList.add('hidden');

    if (appData.isRegisterMode) {
        title.textContent = "Registrierung";
        subtitle.textContent = "Erstelle dein kostenloses FitFlow-Konto";
        btnText.textContent = "Konto erstellen";
        toggleLink.textContent = "Bereits registriert? Hier anmelden";
    } else {
        title.textContent = "FitFlow";
        subtitle.textContent = "Meld dich an und starte durch";
        btnText.textContent = "Anmelden";
        toggleLink.textContent = "Noch kein Konto? Jetzt registrieren";
    }
}

// Blendet das Passwort im Eingabefeld ein/aus (Augen-Icon-Klick).
// Wechselt den input-Typ zwischen "password" (•••) und "text" (Klartext)
// und passt das Icon entsprechend an.
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('login-password');
    const toggleIcon = document.getElementById('password-toggle-icon');
    
    if (!passwordInput || !toggleIcon) return;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fa-solid fa-eye-slash'; // Auge durchgestrichen
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fa-solid fa-eye'; // Auge normal
    }
}

// Steuert die untere Navigation: blendet je nach gewähltem Tab
// ("plan" oder "exercises") den passenden Screen ein und alle
// anderen aus. Der Bearbeitungsmodus (screen-edit) wird hier
// immer ausgeblendet, da man ihn nur über "Übungen verschieben"
// erreicht (siehe startEditMode).
function switchTab(tab) {
    appData.currentTab = tab;
    
    // Holt die Nav-Buttons aus dem HTML
    const navPlan = document.getElementById('nav-plan');
    const navExercises = document.getElementById('nav-exercises');

    if (tab === 'plan') {
        screenPlan.classList.remove('hidden');
        screenExercises.classList.add('hidden');
        screenEdit.classList.add('hidden');
        
        // Farben in der Navbar anpassen (Plan wird grün, Übungen grau)
        if(navPlan) { navPlan.classList.add('text-fit-teal'); navPlan.classList.remove('text-gray-500'); }
        if(navExercises) { navExercises.classList.remove('text-fit-teal'); navExercises.classList.add('text-gray-500'); }
        
        renderWochenplanDisplay();
    } else if (tab === 'exercises') {
        screenPlan.classList.add('hidden');
        screenExercises.classList.remove('hidden');
        screenEdit.classList.add('hidden');
        
        // Farben in der Navbar anpassen (Übungen wird grün, Plan grau)
        if(navPlan) { navPlan.classList.remove('text-fit-teal'); navPlan.classList.add('text-gray-500'); }
        if(navExercises) { navExercises.classList.add('text-fit-teal'); navExercises.classList.remove('text-gray-500'); }
        
        renderExerciseLibrary();
    }
}

// Zeigt den Wochenplan im reinen Lesemodus an (US-02). Erzeugt für
// jeden Wochentag kleine "Chips" mit dem Übungsnamen. Ist der Tag
// leer, wird je nach Wochentag "Ruhetag" oder ein Platzhalter "—"
// angezeigt. Dieser Screen erlaubt keine Bearbeitung – dafür gibt
// es den separaten Drag-&-Drop-Modus (siehe startEditMode).
function renderWochenplanDisplay() {
    ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach(day => {
        const container = document.getElementById(`display-${day}`);
        if (!container) return;
        
        container.innerHTML = "";
        const exercises = appData.wochenplan[day];
        if (exercises && exercises.length > 0) {
            exercises.forEach(ex => {
                const chip = document.createElement('div');
                chip.className = "bg-fit-chip border border-[#444] text-xs px-3 py-1.5 rounded-full text-white";
                chip.textContent = ex.name;
                container.appendChild(chip);
            });
        } else {
            container.innerHTML = `<span class="text-xs text-gray-500">${day === 'Mi' || day === 'So' ? 'Ruhetag' : '—'}</span>`;
        }
    });
}

// Drag & Drop Modus starten
function startEditMode() {
    screenPlan.classList.add('hidden');
    screenEdit.classList.remove('hidden');
    renderWochenplanEdit();
}

// Drag & Drop Modus beenden
function stopEditMode() {
    screenEdit.classList.add('hidden');
    screenPlan.classList.remove('hidden');
    renderWochenplanDisplay();
}

// Baut den Drag-&-Drop-Bearbeitungsmodus auf (US-03). Macht zwei Dinge:
//  1. Befüllt jeden Wochentag mit den aktuell zugewiesenen Übungen
//     als verschiebbare "Chips" und aktiviert Sortable.js darauf.
//  2. Befüllt den Übungs-Pool unten mit allen verfügbaren Übungen,
//     aus dem neue Übungen per Drag in die Wochentage gezogen werden
//     können (siehe Abschnitt 2 weiter unten).
function renderWochenplanEdit() {
    // 1. Wochentage befüllen und sortierbar machen
    ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach(day => {
        const container = document.getElementById(`drag-${day}`);
        if (!container) return;
        
        container.innerHTML = "";
        const exercises = appData.wochenplan[day] || [];
        
        exercises.forEach(ex => {
            const chip = document.createElement('div');
            // flex/items-center/justify-between sorgen dafür, dass der
            // Übungsname links und das Löschen-Kreuz rechts im Chip sitzt
            chip.className = "draggable-chip bg-fit-chip text-xs text-fit-teal border border-fit-teal/40 px-3 py-2 rounded-xl cursor-grab flex items-center justify-between gap-2";
             // data-* Attribute merken sich die Übungsdaten direkt am
            // DOM-Element, damit saveDragState() sie später wieder auslesen kann
            chip.dataset.id = ex.id || "";
            chip.dataset.name = ex.name || "";
            chip.dataset.type = ex.type || "";
            chip.dataset.cat = ex.cat || "";
            
            // innerHTML statt textContent, weil wir zusätzlich ein
            // klickbares "×" zum Entfernen der Übung einbauen
            chip.innerHTML = `
                <span>${ex.name || "Unbekannte Übung"}</span>
                <span class="text-red-400 hover:text-red-500 font-bold text-sm cursor-pointer px-1 transition" onclick="removeExerciseFromDay(this, '${day}')">×</span>
            `;
            
            container.appendChild(chip);
        });

         // Ist der Tag leer, zeigen wir einen Platzhaltertext als Drop-Hinweis
        if (exercises.length === 0) {
            container.innerHTML = `<span class="placeholder-text text-[10px] text-gray-600 self-center mx-auto py-1">Hierher ziehen...</span>`;
        }

         // Sortable.js macht diesen Container zu einer Drag-&-Drop-Zone.
        // Alle Wochentage teilen sich dieselbe 'group', damit Übungen
        // zwischen den Tagen verschoben werden können.
        Sortable.create(container, {
            group: 'weekly-plan-group',
            animation: 150,
            delay: 100,
            delayOnTouchOnly: true,
            onAdd: function() {
                saveDragState();
                renderWochenplanEdit();   // NEU: alles neu zeichnen, damit jeder Chip sein × bekommt
            },
            onRemove: function() {
                if (container.children.length === 0) {
                    container.innerHTML = `<span class="placeholder-text text-[10px] text-gray-600 self-center mx-auto py-1">Hierher ziehen...</span>`;
                }
                saveDragState();
            },
            onEnd: function() {
                saveDragState();
            }
        });
    });

   // 2. ÜBUNGS-POOL BEFÜLLEN (mit Kategorie-Filter, siehe filterPoolCategory)
   const poolContainer = document.getElementById('drag-pool');
   if (poolContainer) {
       poolContainer.innerHTML = "";
       
        // Fallback-Übungen, falls die Datenbank noch keine Daten geliefert hat
       // (z.B. wenn die Seite ohne Backend-Verbindung getestet wird)
       const baseExercises = appData.exercises.length > 0 ? appData.exercises : [
           { id: "ex1", name: "Katze-Kuh-Stretch", cat: "Rückenschonend" },
           { id: "ex2", name: "Vogel-Hund", cat: "Rückenschonend" },
           { id: "ex4", name: "Squats / Kniebeugen", cat: "Muskelaufbau" }
       ];

       const filteredExercises = appData.selectedPoolCategory === 'Alle'
           ? baseExercises
           : baseExercises.filter(ex => ex.cat === appData.selectedPoolCategory);

       filteredExercises.forEach(ex => {
           const chip = document.createElement('div');
           chip.className = "draggable-chip bg-fit-chip text-xs text-white border border-[#444] px-3 py-2 rounded-xl cursor-grab hover:border-fit-teal transition";
           chip.dataset.id = ex.id || "";
           chip.dataset.name = ex.name || "";
           chip.dataset.type = ex.sub || "";
           chip.dataset.cat = ex.cat || "";
           chip.textContent = ex.name || "Übung";
           poolContainer.appendChild(chip);
       });

       // 3. Sortable für den Pool aktivieren – WICHTIG: pull: 'clone'
       // sorgt dafür, dass die Übung im Pool bleibt (wie ein unendlicher
       // Vorrat), wenn man sie auf einen Wochentag zieht. put: false
       // verhindert außerdem, dass man Übungen aus den Wochentagen
       // zurück in den Pool schieben kann.
       Sortable.create(poolContainer, {
           group: {
               name: 'weekly-plan-group',
               pull: 'clone',
               put: false
           },
           animation: 150,
           delay: 100,
           delayOnTouchOnly: true,
           sort: false   // Reihenfolge im Pool selbst bleibt fix
       });
   }
}

// Liest den aktuellen Stand aller Wochentage direkt aus dem DOM aus
// (welche Chips liegen wo) und schreibt das Ergebnis zurück in
// appData.wochenplan. Wird nach jeder Drag-&-Drop-Aktion aufgerufen,
// damit der Zustand danach per savePlanToServer() in der MariaDB
// landet (US-03: "Änderungen werden automatisch übernommen").
function saveDragState() {
    ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach(day => {
        const container = document.getElementById(`drag-${day}`);
        if (!container) return;
        
        const chips = container.querySelectorAll('.draggable-chip');
        appData.wochenplan[day] = [];
        chips.forEach(chip => {
            appData.wochenplan[day].push({
                id: chip.dataset.id,
                name: chip.dataset.name,
                type: chip.dataset.type,
                cat: chip.dataset.cat
            });
        });
    });
    
    savePlanToServer();
}


// Filterfunktion exklusiv für den Übungs-Pool im Bearbeitungsmodus
// Filterfunktion exklusiv für den Übungs-Pool im Bearbeitungsmodus
// (US-03). Anders als filterCategory() in der Bibliothek ist hier
// immer nur EINE Kategorie gleichzeitig aktiv (kein Array, sondern
// ein einzelner String) – das hält den Pool beim Draggen übersichtlich.
function filterPoolCategory(category) {
    appData.selectedPoolCategory = category;
    
    // Optische Aktivierung der Pool-Filter-Buttons
    const filterButtons = document.querySelectorAll('.pool-filter-btn');
    filterButtons.forEach(btn => {
        if (btn.id === `pool-filter-${category}`) {
            btn.className = "pool-filter-btn text-[10px] bg-fit-teal text-white px-2 py-1 rounded-lg transition";
        } else {
            btn.className = "pool-filter-btn text-[10px] bg-fit-chip text-gray-300 px-2 py-1 rounded-lg transition";
        }
    });
    
    // Nur den Pool-Bereich neu zeichnen – die Wochentage bleiben unberührt,
    // damit man beim Filtern keine bereits zugewiesenen Übungen verliert
    const poolContainer = document.getElementById('drag-pool');
    if (poolContainer) {
        poolContainer.innerHTML = "";
        
        const baseExercises = appData.exercises.length > 0 ? appData.exercises : [];
        const filteredExercises = category === 'Alle'
            ? baseExercises
            : baseExercises.filter(ex => ex.cat === category);

        filteredExercises.forEach(ex => {
            const chip = document.createElement('div');
            chip.className = "draggable-chip bg-fit-chip text-xs text-white border border-[#444] px-3 py-2 rounded-xl cursor-grab hover:border-fit-teal transition";
            chip.dataset.id = ex.id || "";
            chip.dataset.name = ex.name || "";
            chip.dataset.type = ex.sub || "";
            chip.dataset.cat = ex.cat || "";
            chip.textContent = ex.name || "Übung";
            poolContainer.appendChild(chip);
        });
    }
}


// Zeigt die Übungsbibliothek an (US-04) und wendet die aktiven
// Kategorie-Filter aus appData.selectedCategory an. Ist kein Filter aktiv, 
// werden alle Übungen angezeigt.
function renderExerciseLibrary() {
    const listContainer = document.getElementById('exercise-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    
    // FILTERN: Wenn das Array leer ist, zeigen wir alle Übungen.
    // Ansonsten zeigen wir alle Übungen, deren Kategorie im Array enthalten ist.
    const filtered = appData.selectedCategory.length === 0 
        ? appData.exercises 
        : appData.exercises.filter(ex => appData.selectedCategory.includes(ex.cat));
        
    filtered.forEach(ex => {
        const card = document.createElement('div');
        card.className = "bg-fit-chip/60 border border-[#333] p-4 rounded-2xl flex justify-between items-center";
        card.innerHTML = `
            <div>
                <h4 class="text-white text-sm font-semibold">${ex.name}</h4>
                <p class="text-xs text-gray-500">${ex.sub || ""}</p>
            </div>
            <span class="text-[10px] bg-[#e6f7f4] text-fit-teal px-2 py-1 rounded-full font-medium">${ex.cat}</span>
        `;
        listContainer.appendChild(card);
    });
    
    const countElement = document.getElementById('exercise-count');
    if (countElement) {
        countElement.textContent = `${filtered.length} Übungen gefunden`;
    }
}

// Steuert die Filter-Buttons in der Übungsbibliothek (US-04).
// Mehrere Kategorien sind gleichzeitig kombinierbar – z.B. Cardio UND
// Rückenschonend zusammen filtern. appData.selectedCategory ist
// deshalb ein Array, im Gegensatz zum einzelnen String beim Pool-Filter.
function filterCategory(category) {
    const btn = document.getElementById(`filter-btn-${category}`);
    if (!btn) return;
    
    // Falls das Array noch ein String sein sollte (Sicherheitshalber initialisieren)
    if (!Array.isArray(appData.selectedCategory)) {
        appData.selectedCategory = [];
    }
    
    if (category === 'Alle') {
        // "Alle" leert die Filterauswahl
        appData.selectedCategory = [];
        
        // Alle Buttons optisch zurücksetzen, "Alle" aktiv setzen
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.className = "filter-btn text-xs bg-fit-chip text-gray-300 font-medium px-4 py-2 rounded-xl transition";
        });
        btn.className = "filter-btn text-xs bg-fit-teal text-white font-medium px-4 py-2 rounded-xl transition";
    } else {
        // Wenn eine echte Kategorie geklickt wird, "Alle" optisch deaktivieren
        const allBtn = document.getElementById('filter-btn-Alle');
        if (allBtn) allBtn.className = "filter-btn text-xs bg-fit-chip text-gray-300 font-medium px-4 py-2 rounded-xl transition";
        
        // Toggle-Logik: Wenn schon gefiltert, nimm es raus. Wenn nicht, füg es hinzu.
        if (appData.selectedCategory.includes(category)) {
            appData.selectedCategory = appData.selectedCategory.filter(c => c !== category);
            btn.className = "filter-btn text-xs bg-fit-chip text-gray-300 font-medium px-4 py-2 rounded-xl transition";
        } else {
            appData.selectedCategory.push(category);
            btn.className = "filter-btn text-xs bg-fit-teal text-white font-medium px-4 py-2 rounded-xl transition";
        }
    }

    // Falls am Ende kein Filter mehr aktiv ist, schalte optisch wieder auf "Alle"
    if (appData.selectedCategory.length === 0) {
        const allBtn = document.getElementById('filter-btn-Alle');
        if (allBtn) allBtn.className = "filter-btn text-xs bg-fit-teal text-white font-medium px-4 py-2 rounded-xl transition";
    }

    // Liste neu zeichnen
    renderExerciseLibrary();
}

// Entfernt eine einzelne Übung direkt aus einem Wochentag über das
// kleine "×"-Symbol am Chip (siehe renderWochenplanEdit). Wird vom
// onclick-Attribut des Kreuz-Symbols aufgerufen.
function removeExerciseFromDay(crossElement, day) {
    // Holt den gesamten Chip (das Elternelement vom Kreuz)
    const chip = crossElement.parentElement;
    const container = chip.parentElement;
    
    // Löscht den Chip aus der HTML-Ansicht
    chip.remove();
    
    // Falls der Tag jetzt komplett leer ist, setzen wir den grauen Platzhalter-Text wieder ein
    if (container.children.length === 0) {
        container.innerHTML = `<span class="placeholder-text text-[10px] text-gray-600 self-center mx-auto py-1">Hierher ziehen...</span>`;
    }
    
    // Liest alle verbleibenden Chips aus und speichert den neuen Zustand in der MariaDB
    saveDragState();
}

// US-02 PROTOTYP: Legt einen komplett neuen, leeren Wochenplan an.
// Im MVP wird dabei einfach der aktuelle Plan auf "leer" zurückgesetzt
// und sofort gespeichert; eine echte Mehrfach-Planverwaltung (mehrere
// gespeicherte Pläne parallel) ist für eine spätere Ausbaustufe vorgesehen.
function createNewPlanPrototype() {
    // 1. Setzt die Wochentage im App-Zustand auf leer zurück
    ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach(day => {
        appData.wochenplan[day] = [];
    });
    
    // 2. Setzt den Standardnamen im Interface
    const titleElement = document.getElementById('plan-title-display');
    if (titleElement) titleElement.textContent = "Standardplan";
    
    // 3. Zeichnet die Übersicht neu & speichert den leeren Zustand live in der MariaDB
    renderWochenplanDisplay();
    savePlanToServer();
    
    alert("Ein neuer, leerer 'Standardplan' wurde angelegt!");
}

// US-02 PROTOTYP: Benennt den aktuell angezeigten Plan um. Nutzt den
// einfachen Browser-Dialog prompt() für den MVP ausreichend, in der
// finalen Version würde das durch ein eigenes Eingabefeld ersetzt.
function renamePlanPrototype() {
    const currentTitle = document.getElementById('plan-title-display').textContent;
    const newTitle = prompt("Gib einen neuen Namen für deinen Trainingsplan ein:", currentTitle);
    
    // Nur übernehmen, wenn tatsächlich Text eingegeben wurde
    if (newTitle && newTitle.trim() !== "") {
        document.getElementById('plan-title-display').textContent = newTitle.trim();
    }
}

// US-02 PROTOTYP: Leert den aktuellen Plan komplett (alle Übungen an
// allen Wochentagen entfernen) nach einer Sicherheitsabfrage.
function clearPlanPrototype() {
    if (confirm("Möchtest du alle Übungen aus dem aktuellen Plan wirklich löschen?")) {
        ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach(day => {
            appData.wochenplan[day] = [];
        });
        renderWochenplanDisplay();
        savePlanToServer();
    }
}

// Meldet den aktuellen User ab, setzt den App-Zustand zurück und
// zeigt wieder den Login-Screen. Wichtig: appData.wochenplan und
// appData.exercises werden geleert, damit beim nächsten Login
// garantiert keine Reste vom vorherigen User sichtbar sind.
function logout() {
    appData.currentUserID = 1;
    appData.wochenplan = {};
    appData.exercises = [];
    appData.selectedCategory = [];
    appData.selectedPoolCategory = 'Alle';

    // Login-Formular leeren, damit nichts vorausgefüllt bleibt
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    const errorDisplay = document.getElementById('login-error');
    if (errorDisplay) errorDisplay.classList.add('hidden');

    // Alle Screens verstecken, nur Login zeigen
    screenPlan.classList.add('hidden');
    screenEdit.classList.add('hidden');
    screenExercises.classList.add('hidden');
    bottomNavbar.classList.add('hidden');
    screenLogin.classList.remove('hidden');
}