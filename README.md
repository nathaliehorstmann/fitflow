# 🏋️‍♂️ FitFlow – Fitness & Exercise Tracker (MVP)

FitFlow ist eine Full-Stack-Webanwendung zur Verwaltung und Nachverfolgung von Fitness-Workouts. Das Projekt entstand im Rahmen einer Hochschulleistung im Bereich **Agiles Projektmanagement** und deckt den gesamten Zyklus von der Stakeholder-Analyse über Agile User Stories bis hin zum voll funktionsfähigen MVP ab.

---

## 🚀 Features & Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla / DOM-Manipulation)
- **Backend:** Node.js, Express.js (REST API)
- **Datenbank:** MariaDB (Relationales Datenmodell)
- **Analytics Pipeline:** SQL Data Extraction & Power BI Business Intelligence Dashboard
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
├── analytics/          # Data Pipeline (SQL Export, CSV Data & Power BI Reports)
│   ├── dashboard_overview.png
│   ├── export_analytics.sql
│   ├── fitflow_analytics_data.csv
│   ├── FitFlow_Analytics.pdf
│   └── FitFlow_Analytics.zip
├── backend/            # Express REST API & Server-Logik
├── database/           # SQL-Dump (schema.sql)
├── docs/               # Projektdokumentation & Agile Artefakte
│   └── FitFlow_Abschlussprojekt.pdf
└── frontend/           # HTML/CSS/JS Client
```

---

## 📄 Dokumentation

- [Agiles Projektmanagement (PDF)](docs/FitFlow_Abschlussprojekt.pdf) – Detaillierte Übersicht zu Stakeholderanalyse, User Personas und MoSCoW-Backlog.

---

## 📊 Power BI Analytics Dashboard

Zur Analyse der Trainingsdaten wurde eine Analytics-Pipeline aufgebaut:
- **Datenquelle:** MariaDB (`users`, `exercises`, `wochenplan`)
- **Export:** SQL-Extraktion exportiert nach `analytics/fitflow_analytics_data.csv`
- **Visualisierung:** Interaktives Power BI Dashboard

![Power BI Dashboard Overview](analytics/dashboard_overview.png)

### Key Insights & Metrics
- **Gesamtanzahl Übungen:** KPI-Erfassung über alle aktiven Wochenpläne.
- **Kategorie-Fokus:** Gegenüberstellung von Muskelaufbau, Cardio und rückenschonenden Übungen.
- **Wochenverteilung:** Analyse der Übungsdichte pro Wochentag.
```