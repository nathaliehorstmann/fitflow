# 🏋️‍♂️ FitFlow – Fitness & Exercise Tracker (MVP)

FitFlow ist eine Full-Stack-Webanwendung zur Verwaltung und Nachverfolgung von Fitness-Workouts. Das Projekt entstand im Rahmen einer Hochschulleistung im Bereich **Agiles Projektmanagement** und deckt den gesamten Zyklus von der Stakeholder-Analyse über Agile User Stories bis hin zum voll funktionsfähigen MVP ab.

---

## 🚀 Features & Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla / DOM-Manipulation)
- **Backend:** Node.js, Express.js (REST API)
- **Datenbank:** MariaDB (Relationales Datenmodell)
- **Agile Artefakte:** Stakeholderanalyse, User Personas, MoSCoW-priorisiertes Backlog

---

## 🛠️ Installation & Setup

### 1. Voraussetzungen
- [Node.js](https://nodejs.org/) (LTS)
- [MariaDB](https://mariadb.org/) oder MySQL Server

### 2. Datenbank einrichten
1. Erstelle eine lokale MariaDB-Datenbank namens `fitflow`:
   ```sql
   CREATE DATABASE fitflow;
   ```
2. Importiere das Datenbankschema aus dem Repository:
   ```bash
   mysql -u root -p fitflow < database/schema.sql
   ```

### 3. Backend starten
Navigiere in den Backend-Ordner, installiere die Abhängigkeiten und starte den Server:
```bash
cd backend
npm install
node server.js
```
*(Das Backend läuft standardmäßig auf http://localhost:3000)*

### 4. Frontend starten
Öffne die Datei `frontend/index.html` direkt im Browser oder nutze die VS Code Erweiterung **Live Server**.

---

## 📁 Repository-Struktur

```text
fitflow/
├── backend/            # Express REST API & Server-Logik
├── frontend/           # HTML/CSS/JS Client
└── database/           # SQL-Dump (schema.sql)

## 📄 Dokumentation

- [Agiles Projektmanagement (PDF)](docs/FitFlow_Abschlussprojekt.pdf) – Detaillierte Übersicht zu Stakeholderanalyse, User Personas und MoSCoW-Backlog.
```