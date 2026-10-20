# 🎼 MotionAI

Schnellzugriff: [Webapp öffnen](https://luntal.github.io/motionai-web/)

MotionAI ist eine browserbasierte, plattformübergreifende Web-App, die Dirigiergesten mithilfe der Kamera erkennt und analysiert.  
Ziel ist es, Musiker:innen und Dirigent:innen beim Lernen, Üben und Verbessern ihrer Schlagtechnik durch direktes visuelles Feedback zu unterstützen.

---

## ✨ Features

- 🎥 **Echtzeit-Bewegungserkennung** über die Webcam  
- 🎯 **Analyse von Dirigiergesten** (z. B. Taktmuster, Bewegungsfluss)  
- 📊 **Direktes Feedback** zur Ausführung und Präzision  
- 🧠 Unterstützung beim **Erlernen von Schlagfiguren**  
- 💻 browserbasiert

---

## 🧩 Technologie-Stack

- **Frontend:** JavaScript, HTML   
- **Motion-Tracking:** Google Media-Pipe Solutions  

---

## 🚀 Ziel des Projekts

MotionAI soll eine intuitive und zugängliche Lernhilfe für Dirigieren sein – sowohl für Anfänger als auch Fortgeschrittene.  
Durch visuelles Feedback und Analysefunktionen wird das eigenständige Üben effektiver und messbarer.

---

## 📦 Installation (WIP)

Anleitung folgt – aktuell befindet sich das Projekt in Entwicklung.

---

## Backend-Anbindung

Ohne Anmeldung läuft die App als lokaler Gast (nur `localStorage`, kein Sync); über „Anmelden“ (`/api/auth/*`) wird auf das Konto gewechselt. Eingeloggt werden Einstellungen (max. 1 MiB, entprellt) per `PUT /api/settings` gespeichert, Prüfungsergebnisse per `POST /api/exams` (`exam_type` = `exam-level-<n>`). `localStorage` dient nur noch als Cache pro Konto und wird beim Abmelden gelöscht. Admin-Konten arbeiten im lokalen DozentIn-Profil. Code: `src/api.js`, `src/authUi.js`.
