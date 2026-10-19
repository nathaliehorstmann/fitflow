// ============================================================
// FitFlow Backend (Node.js + Express)
// Stellt eine REST-API bereit, über die das Frontend (app.js)
// den Wochenplan und die Übungsbibliothek liest und schreibt.
// Datenhaltung erfolgt in MariaDB (Tabellen: wochenplan, exercises).
// MVP-Hinweis: Es gibt aktuell keine echte Nutzer-Authentifizierung;
// alle Routen arbeiten fest mit userId = 1 (siehe US-01 Ausblick).
//
// BI- & ANALYTICS-ERWEITERUNG:
// Neben der REST-API dient das relationale MariaDB-Schema als 
// Datenquelle für ein lokal angebundenes Metabase-BI-Dashboard, 
// um Trainingsstatistiken und KPI-Nutzungsmuster zu simulieren.
// ============================================================

// 1. Umgebungsvariablen ganz oben laden
require('dotenv').config();

const express = require('express');
const cors = require('cors');     // erlaubt Anfragen vom Frontend (anderer Origin/Port)
const mariadb = require('mariadb');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json()); // erlaubt das Parsen von JSON-Request-Bodies (z.B. beim POST)

// 2. Datenbank-Verbindung einrichten
const pool = mariadb.createPool({
     host: process.env.DB_HOST || '127.0.0.1', 
     port: 3306,
     user: process.env.DB_USER || 'nathy',            
     password: process.env.DB_PASSWORD, // Gehört auf GitHub in die .env (die in .gitignore steht)
     database: process.env.DB_NAME || 'fitflow',
     connectionLimit: 5
});

// Hilfsfunktion: Verbindung testen beim Serverstart
pool.getConnection()
    .then(conn => {
        console.log("Erfolgreich mit MariaDB (fitflow) verbunden!");
        conn.release();
    })
    .catch(err => {
        console.error("Datenbank-Verbindungsfehler:", err);
    });


// ROUTE 1: Wochenplan für einen bestimmten User aus der DB holen.
app.get('/api/wochenplan', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Holt die userId aus den Query-Parametern (z.B. /api/wochenplan?userId=2)
        // Wenn keine mitgeschickt wird, nimmt der Server standardmäßig die 1
        const userId = req.query.userId || 1; 

        const rows = await conn.query(`
            SELECT w.wochentag, e.id, e.name, e.cat 
            FROM wochenplan w
            JOIN exercises e ON w.exercise_id = e.id
            WHERE w.user_id = ?
        `, [userId]);

        const wochenplanFormatiert = {
            "Mo": [], "Di": [], "Mi": [], "Do": [], "Fr": [], "Sa": [], "So": []
        };

        rows.forEach(row => {
            if (wochenplanFormatiert[row.wochentag]) {
                wochenplanFormatiert[row.wochentag].push({
                    id: row.id,
                    name: row.name,
                    cat: row.cat
                });
            }
        });

        res.json(wochenplanFormatiert);

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.release();
    }
});


// ROUTE 2: Aktualisierten Wochenplan vom Frontend empfangen und in DB speichern.
app.post('/api/wochenplan', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Holt die userId aus den Query-Parametern (?userId=...)
        const userId = req.query.userId || 1; 
        const neuerPlan = req.body; // Nimmt den puren Wochenplan direkt entgegen

        await conn.beginTransaction();

        // 1. Alten Plan für den GENAUEN User komplett löschen
        await conn.query("DELETE FROM wochenplan WHERE user_id = ?", [userId]);

        // 2. Neuen Plan Zeile für Zeile eintragen
        for (const [tag, uebungen] of Object.entries(neuerPlan)) {
            // Falls uebungen aus irgendeinem Grund kein Array ist, überspringen
            if (!Array.isArray(uebungen)) continue; 
            
            for (const uebung of uebungen) {
                await conn.query(
                    "INSERT INTO wochenplan (user_id, wochentag, exercise_id) VALUES (?, ?, ?)",
                    [userId, tag, uebung.id]
                );
            }
        }

        await conn.commit();
        res.json({ success: true, message: `Erfolgreich für User ${userId} in der MariaDB gespeichert!` });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Fehler beim Speichern:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.release();
    }
});

// ROUTE 3: Alle Übungen aus der Übungsbibliothek (Tabelle "exercises") holen.
// Wird beim Login/Registrieren aufgerufen (loadExercisesFromServer in app.js)
// und füllt sowohl die Übungsbibliothek (US-04) als auch den
// Drag-&-Drop-Übungspool (US-03) im Frontend.
app.get('/api/exercises', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Holt alle Übungen mit den für das Frontend benötigten Feldern
        const rows = await conn.query("SELECT id, name, sub, cat FROM exercises");
        
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.release();
    }
});

// Server erst starten, NACHDEM alle Routen registriert wurden
app.listen(PORT, () => {
    console.log(`FitFlow-Backend läuft auf http://localhost:${PORT}`);
});