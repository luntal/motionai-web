MOTIONAI – FRONTEND-INTEGRATION MIT FASTAPI UND POSTGRESQL

1. ZIEL UND BESTEHENDE ARCHITEKTUR

Das bestehende MotionAI-Frontend soll mit einem zentralen Backend verbunden werden, damit Benutzer ihre Einstellungen und Prüfungsergebnisse serverseitig speichern und später wieder abrufen können.

Die Website ist öffentlich unter folgender Adresse erreichbar:

https://aimusiclab.hfm-nuernberg.de

Die technische Architektur besteht aus:

Frontend:

* HTML, CSS und JavaScript
* Bereits vorhandene Benutzeroberfläche und Anwendungslogik
* Teilweise bestehende lokale Speicherung mit localStorage

Backend:

* Python
* FastAPI
* SQLAlchemy
* Session-basierte Authentifizierung
* Argon2-Passworthashes
* CSRF-Schutz
* PostgreSQL

Server:

* Ubuntu
* Apache als Webserver
* Vorgeschalteter Reverse Proxy für HTTPS
* FastAPI unter 127.0.0.1:8000
* Backend-Systemdienst: motionai-api

Das Frontend soll die API unter derselben öffentlichen Origin verwenden. Es sollen keine Datenbankverbindungen aus dem Browser heraus hergestellt werden. Der Browser kommuniziert ausschließlich mit dem Backend.

Alle API-Aufrufe sollen relative URLs verwenden, beispielsweise:

/api/auth/login
/api/settings
/api/exams/me

Dadurch bleibt die Anwendung unabhängig von der internen Serveradresse.

2. GRUNDSÄTZLICHE SICHERHEITSANFORDERUNGEN

Die Implementierung muss folgende Regeln einhalten:

* Passwörter dürfen niemals im localStorage oder sessionStorage gespeichert werden.
* Passwörter dürfen nicht in Logs, Fehlermeldungen oder Analyseereignissen erscheinen.
* Session-Cookies dürfen nicht aus JavaScript ausgelesen oder manuell erzeugt werden.
* Die Benutzer-ID darf bei Schreiboperationen nicht vom Frontend festgelegt werden.
* Das Frontend darf keine Administratorrechte selbst vergeben oder annehmen.
* Ein versteckter Menüpunkt ist keine Sicherheitsmaßnahme. Geschützte Daten müssen serverseitig autorisiert werden.
* API-Antworten mit HTTP 401 oder 403 müssen korrekt behandelt werden.
* CSRF-Tokens müssen bei allen geschützten schreibenden Requests mitgesendet werden.
* Es dürfen keine API-Aufrufe an interne IP-Adressen oder localhost aus dem Browser erfolgen.
* Zugangsdaten und sensible Sitzungstoken dürfen nicht in die URL geschrieben werden.
* Benutzerspezifische Daten dürfen nicht zwischen angemeldeten Benutzern vermischt werden.

Die serverseitige Autorisierung ist verbindlich. Das Frontend dient lediglich dazu, die Benutzeroberfläche entsprechend dem Berechtigungsstatus darzustellen.

3. AUTHENTIFIZIERUNG

Das Backend verwendet serverseitig geprüfte Sitzungen.

Nach erfolgreicher Anmeldung oder Registrierung setzt das Backend ein Session-Cookie mit dem Namen:

motionai_session

Das Cookie ist mit folgenden Eigenschaften konfiguriert:

* HttpOnly über die Starlette-Session-Middleware
* Secure beziehungsweise https_only=True
* SameSite=Lax
* Maximale Lebensdauer: 12 Stunden

Das Frontend darf den Inhalt des Cookies nicht selbst verwalten. Der Browser sendet es automatisch mit passenden Requests an dieselbe Origin.

Für fetch-Aufrufe soll folgende Option verwendet werden:

credentials: “same-origin”

Da die Website und die API unter derselben Origin erreichbar sind, ist keine Cross-Origin-Kommunikation erforderlich.

3.1 REGISTRIERUNG

Endpoint:

POST /api/auth/register

Content-Type:

application/json

Request:

{
“email”: “user@example.org”,
“password”: “ein-langes-sicheres-passwort”
}

Die E-Mail-Adresse wird serverseitig normalisiert und validiert.

Passwortanforderungen des aktuellen Backends:

* Mindestens 12 Zeichen
* Höchstens 128 Zeichen

Bei erfolgreicher Registrierung:

* HTTP 201 Created
* JSON mit Benutzerinformationen
* Neue authentifizierte Sitzung
* Neuer CSRF-Token in der Sitzung

Die öffentliche Registrierung weist dem Benutzer automatisch die Rolle user zu.

Mögliche relevante Fehler:

* HTTP 400: ungültige E-Mail-Adresse
* HTTP 409: E-Mail-Adresse bereits registriert
* HTTP 422: Request entspricht nicht dem Pydantic-Modell

Die Registrierung benötigt aktuell keinen CSRF-Token, da die CSRF-Middleware diesen Endpunkt ausdrücklich von der Tokenpflicht ausnimmt. Der erlaubte Origin muss trotzdem vorhanden sein.

3.2 LOGIN

Endpoint:

POST /api/auth/login

Request:

{
“email”: “user@example.org”,
“password”: “ein-langes-sicheres-passwort”
}

Bei erfolgreicher Anmeldung:

* HTTP 200 OK
* JSON mit id, email und role
* Session-Cookie wird gesetzt
* Ein neuer CSRF-Token wird erzeugt

Die Login-Anfrage benötigt keinen CSRF-Token, muss aber den erlaubten Origin verwenden.

Der Benutzer ist erst nach erfolgreicher Antwort authentifiziert.

3.3 AKTUELLEN BENUTZER ABRUFEN

Endpoint:

GET /api/auth/me

Bei gültiger Sitzung liefert das Backend die Informationen des angemeldeten Benutzers:

{
“id”: “…”,
“email”: “user@example.org”,
“role”: “user”
}

Ohne gültige Sitzung:

HTTP 401 Unauthorized

Beim Start der Anwendung soll das Frontend diesen Endpoint aufrufen, um festzustellen, ob bereits eine gültige Sitzung besteht.

Es darf nicht allein anhand eines localStorage-Wertes entschieden werden, ob ein Benutzer angemeldet ist.

3.4 LOGOUT

Endpoint:

POST /api/auth/logout

Diese Anfrage benötigt:

* Eine gültige Origin
* Einen gültigen CSRF-Token, sofern eine angemeldete Sitzung besteht

Das Backend löscht die Sitzung und antwortet mit:

{
“status”: “ok”,
“message”: “Abgemeldet.”
}

Nach erfolgreichem Logout muss das Frontend:

* Den angemeldeten Benutzer aus seinem Anwendungszustand entfernen
* Benutzerspezifische Daten aus dem aktiven Speicherzustand entfernen
* Geschützte Ansichten schließen
* Zur Anmeldeansicht wechseln
* Keine weiteren Schreiboperationen mit Daten des vorherigen Benutzers ausführen

Nicht benutzerspezifische Anwendungsdaten können erhalten bleiben.

4. CSRF-SCHUTZ

Das Backend prüft bei allen schreibenden HTTP-Methoden den Origin-Header.

Erlaubter Origin:

https://aimusiclab.hfm-nuernberg.de

Die CSRF-Middleware akzeptiert folgende sichere Methoden ohne diese Prüfung:

GET
HEAD
OPTIONS

Alle anderen Methoden müssen den erlaubten Origin besitzen.

Bei angemeldeten Sitzungen benötigen schreibende Requests zusätzlich einen gültigen CSRF-Token.

4.1 CSRF-TOKEN ABRUFEN

Endpoint:

GET /api/auth/csrf

Antwort:

{
“csrf_token”: “…”
}

Das Frontend soll diesen Endpoint nach erfolgreicher Anmeldung oder Registrierung aufrufen und den Token im Arbeitsspeicher halten.

Der Token soll nicht in URLs oder Logs erscheinen.

Für schreibende Requests muss der Header gesetzt werden:

X-CSRF-Token: <CSRF_TOKEN>

Zusätzlich muss bei schreibenden Requests der Origin vorhanden sein. Bei normalen Browseranfragen wird dieser Header vom Browser erzeugt. JavaScript kann und muss ihn nicht manuell setzen.

Bei den hier verwendeten Same-Origin-Requests genügt es, credentials: “same-origin” zu setzen.

4.2 CSRF-TOKEN ERNEUERN

Der Token muss nach Login oder Registrierung neu abgerufen werden, weil das Backend bei diesen Vorgängen die Sitzung zurücksetzt und einen neuen Token erzeugt.

Bei HTTP 403 mit der Antwort:

{
“detail”: “CSRF-Prüfung fehlgeschlagen.”
}

soll das Frontend den CSRF-Token einmal neu abrufen und die Anfrage nur dann erneut senden, wenn dies sicher ist.

Wichtig: Eine schreibende Anfrage darf nicht blind wiederholt werden, wenn unklar ist, ob die erste Anfrage bereits erfolgreich ausgeführt wurde.

Bei:

{
“detail”: “Unzulässiger Origin.”
}

muss die Origin-Konfiguration geprüft werden. Dieser Fehler sollte nicht durch wiederholte Requests umgangen werden.

5. JAVASCRIPT-API-CLIENT

Es soll eine zentrale Funktion für API-Anfragen geben, damit Authentifizierung, Fehlerbehandlung und CSRF-Schutz nicht in jeder Komponente separat implementiert werden.

Empfohlene Struktur:

* apiRequest()
* getCsrfToken()
* login()
* register()
* logout()
* getCurrentUser()
* loadSettings()
* saveSettings()
* loadExams()
* saveExam()

Der API-Client muss:

* Relative URLs verwenden
* credentials: “same-origin” setzen
* JSON korrekt serialisieren
* Content-Type: application/json setzen, wenn ein JSON-Body gesendet wird
* Bei geschützten Schreiboperationen X-CSRF-Token setzen
* HTTP-Fehler zentral behandeln
* Die Antwort nicht ungeprüft als erfolgreich interpretieren

Ein möglicher Grundaufbau:

async function apiRequest(path, options = {}) {
const method = (options.method || “GET”).toUpperCase();

const headers = new Headers(options.headers || {});
const isJsonBody =
    options.body !== undefined &&
    options.body !== null &&
    !(options.body instanceof FormData);
if (isJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
}
const safeMethods = ["GET", "HEAD", "OPTIONS"];
if (!safeMethods.includes(method)) {
    const csrfToken = await getCsrfToken();
    headers.set("X-CSRF-Token", csrfToken);
}
const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: "same-origin"
});
if (response.status === 401) {
    // Authentifizierungsstatus überprüfen und
    // geschützte Ansichten gegebenenfalls schließen.
}
if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
        body?.detail || `HTTP-Fehler ${response.status}`
    );
}
if (response.status === 204) {
    return null;
}
return response.json();

}

Dies ist ein Architekturbeispiel und muss an die vorhandene Frontendstruktur angepasst werden.

getCsrfToken() soll den Token über GET /api/auth/csrf abrufen und im Arbeitsspeicher zwischenspeichern. Nach Login, Registrierung und Logout muss dieser Cache passend aktualisiert beziehungsweise geleert werden.

Der API-Client darf nicht pauschal bei jedem HTTP-403 den Token erneuern. Ein 403 kann auch bedeuten, dass die Benutzerrolle nicht ausreicht.

6. BENUTZEREINSTELLUNGEN

Das Backend bietet bereits persistente Benutzereinstellungen.

6.1 EINSTELLUNGEN LADEN

Endpoint:

GET /api/settings

Authentifizierung:

* Gültige Sitzung erforderlich

Antwort:

{
“settings”: {}
}

Das Objekt enthält die gespeicherten Einstellungen des angemeldeten Benutzers.

Wenn noch kein Einstellungsdatensatz existiert, antwortet das Backend aktuell mit HTTP 404.

6.2 EINSTELLUNGEN SPEICHERN

Endpoint:

PUT /api/settings

Request:

{
“settings”: {
“exampleSetting”: true
}
}

Authentifizierung:

* Gültige Sitzung erforderlich
* Gültiger CSRF-Token erforderlich
* Erlaubter Origin erforderlich

Antwort:

{
“settings”: {
“exampleSetting”: true
}
}

Das gesamte settings-Objekt wird ersetzt. Das Frontend muss deshalb vor dem Speichern alle Einstellungen zusammenführen, die erhalten bleiben sollen.

Es darf nicht nur eine einzelne geänderte Einstellung gesendet werden, wenn dadurch andere Einstellungen verloren gehen würden.

6.3 EMPFOHLENES SPEICHERVERHALTEN

Die vorhandene lokale Speicherung kann als temporärer Zustand oder Cache erhalten bleiben.

Die Datenbank soll jedoch die zentrale persistente Quelle für benutzerspezifische Einstellungen sein.

Empfohlener Ablauf:

* Nach erfolgreichem Login Einstellungen aus der API laden.
* Die Antwort in den Anwendungszustand übernehmen.
* Erst danach die benutzerspezifische Oberfläche vollständig initialisieren.
* Änderungen lokal übernehmen.
* Einstellungen über PUT /api/settings speichern.
* Fehler beim Speichern sichtbar machen.
* Bei Logout den aktiven Zustand des vorherigen Benutzers entfernen.

Bei automatischem Speichern muss verhindert werden, dass parallele Requests in falscher Reihenfolge eintreffen und ältere Zustände neuere überschreiben.

7. PRÜFUNGSERGEBNISSE

Prüfungsergebnisse werden in der Datenbank über das Modell UserExam gespeichert.

Die relevanten Felder sind:

* id
* user_id
* exam_type
* result
* score
* started_at
* completed_at
* created_at

Das Feld result enthält ein JSON-Objekt und wird in PostgreSQL als JSONB gespeichert.

7.1 EIGENE PRÜFUNGEN LADEN

Endpoint:

GET /api/exams/me

Optionale Query-Parameter:

* limit
* offset

Das Backend begrenzt limit auf maximal 100 Datensätze.

Beispiel:

GET /api/exams/me?limit=50&offset=0

Authentifizierung:

* Gültige Sitzung erforderlich

Die Antwort ist eine Liste von Prüfungsdatensätzen.

Jeder Datensatz enthält:

* id
* user_id
* user_email
* exam_type
* result
* score
* started_at
* completed_at
* created_at

Die API filtert serverseitig nach der ID des angemeldeten Benutzers.

Das Frontend darf die Benutzertrennung nicht selbst implementieren, indem es alle Prüfungen lädt und anschließend nach user_id filtert. Die Datenbankabfrage ist bereits auf den angemeldeten Benutzer eingeschränkt.

7.2 NEUE PRÜFUNG SPEICHERN

Endpoint:

POST /api/exams

Request:

{
“exam_type”: “example”,
“score”: 85,
“result”: {
“id”: “example-exam-id”,
“timestamp”: “2026-10-20T10:00:00Z”,
“totalScore”: 85,
“tasks”: []
}
}

Das Beispiel dient nur zur Illustration. Das konkrete result-Objekt muss dem tatsächlich verwendeten Prüfungsformat der Anwendung entsprechen.

Erlaubte Request-Felder:

* exam_type: String, 1 bis 100 Zeichen
* result: JSON-Objekt
* score: Zahl oder null

Authentifizierung:

* Gültige Sitzung erforderlich
* Gültiger CSRF-Token erforderlich
* Erlaubter Origin erforderlich

Erfolgreiche Antwort:

* HTTP 201 Created
* Vollständiger gespeicherter Datensatz entsprechend AdminExamResponse

Der Server bestimmt user_id anhand der authentifizierten Sitzung.

Das Frontend darf keine user_id mitsenden, um die Zuordnung zu bestimmen.

Das Frontend soll exam_type und result aus dem tatsächlichen Prüfungsergebnis erzeugen. Die Punktzahl score soll mit dem Feld im Ergebnisobjekt konsistent sein.

7.3 ZEITSTEMPEL UND IDs

Vor der Implementierung muss geprüft werden, wie die bestehende Anwendung Prüfungs-IDs und Zeitstempel erzeugt.

Wenn bereits eine eindeutige Prüfungs-ID vorhanden ist, kann sie innerhalb von result erhalten bleiben. Die Datenbank-ID id ist davon getrennt und wird vom Backend-Modell verwaltet.

started_at, completed_at und created_at sind Datenbankfelder. Das Frontend sollte deren Bedeutung nicht mit einem Zeitstempel innerhalb von result verwechseln.

Falls die Datenbank Zeitstempel automatisch erzeugt, sollen diese serverseitigen Werte maßgeblich bleiben.

8. VERHALTEN BEI PRÜFUNGSABSCHLUSS

Das Frontend muss den tatsächlichen Zeitpunkt erkennen, an dem ein Prüfungsergebnis vollständig vorliegt.

Empfohlener Ablauf:

1. Prüfung abschließen.
2. Ergebnisobjekt vollständig erzeugen.
3. Ergebnis lokal im aktuellen Anwendungszustand übernehmen.
4. POST /api/exams ausführen.
5. Die Antwort auf HTTP 201 prüfen.
6. Die vom Backend zurückgegebene Datenbank-ID übernehmen.
7. Den erfolgreichen Speicherstatus im Frontend markieren.

Bei Netzwerkfehlern darf das Prüfungsergebnis nicht stillschweigend verloren gehen.

Es soll ein klarer Zustand vorgesehen werden:

* lokal vorhanden, noch nicht synchronisiert
* Synchronisierung läuft
* erfolgreich synchronisiert
* Synchronisierung fehlgeschlagen

Ein erneuter Speicherungsversuch darf nicht unkontrolliert doppelte Prüfungen erzeugen. Der aktuelle POST-Endpunkt bietet noch keine ausdrücklich definierte Idempotenzgarantie. Bei unklarem Ausgang einer Anfrage sollte das Frontend deshalb zunächst den Serverzustand prüfen oder eine gezielte Wiederholungsstrategie verwenden.

Ein lokaler Cache kann die Bedienbarkeit verbessern, ist aber kein Ersatz für die serverseitige Speicherung.

9. BENUTZERWECHSEL UND DATENTRENNUNG

Das Frontend muss strikt zwischen Benutzersitzungen unterscheiden.

Nach erfolgreichem Login:

* aktuellen Benutzer über /api/auth/me bestätigen
* Einstellungen laden
* eigene Prüfungen laden
* benutzerspezifischen Zustand initialisieren

Nach Logout:

* aktive benutzerspezifische Daten aus dem Speicher entfernen
* laufende Synchronisierungen des alten Benutzers abbrechen, soweit möglich
* keine Antworten alter Requests in die neue Benutzersitzung übernehmen

Wenn Benutzer A abgemeldet wird und Benutzer B sich anmeldet, darf kein lokaler Zustand von A an B gesendet werden.

Es ist insbesondere zu prüfen, ob die bisherige Anwendung einen globalen localStorage-Schlüssel verwendet, in dem Prüfungen oder Einstellungen aller Benutzer gemeinsam gespeichert werden.

Falls ja, muss die lokale Speicherung angepasst werden. Eine Möglichkeit ist die Trennung nach Benutzer-ID. Auch dann muss bei jedem Schreibvorgang geprüft werden, ob der aktive Benutzer noch derselbe ist, für den die Daten erzeugt wurden.

Die Benutzer-ID im lokalen Speicher ist jedoch keine Berechtigungsgrundlage. Sie dient ausschließlich der Organisation lokaler Daten.

10. ADMINISTRATORFUNKTIONEN

Das Backend bietet folgende Administrator-Endpunkte:

GET /api/admin/users

GET /api/admin/exams

GET /api/admin/users/{user_id}/exams

Die Endpunkte sind durch require_admin geschützt.

Das Backend prüft, ob die Rolle des authentifizierten Benutzers admin ist.

Ein normaler Benutzer erhält bei einem Administrator-Endpunkt:

HTTP 403 Forbidden

mit:

{
“detail”: “Keine Administratorberechtigung.”
}

Das Frontend kann anhand des Feldes role in /api/auth/me entscheiden, ob Administratorfunktionen angezeigt werden.

Diese Anzeige ist jedoch keine Sicherheitsmaßnahme. Alle Zugriffe müssen weiterhin serverseitig autorisiert werden.

Administrator-Endpunkte dürfen nicht verwendet werden, um normale Benutzer mit ihren eigenen Daten zu versorgen. Dafür existieren die Endpunkte /api/settings und /api/exams/me.

11. FEHLERBEHANDLUNG

Folgende Statuscodes müssen berücksichtigt werden:

HTTP 200:
Request erfolgreich.

HTTP 201:
Ressource erfolgreich erstellt.

HTTP 400:
Request konnte aufgrund eines fachlichen oder validierungsbezogenen Fehlers nicht verarbeitet werden.

HTTP 401:
Benutzer ist nicht angemeldet oder die Sitzung ist ungültig.

HTTP 403:
Origin, CSRF-Prüfung oder Berechtigungsprüfung fehlgeschlagen.

HTTP 404:
Ressource oder Einstellungsdatensatz nicht gefunden.

HTTP 409:
Konflikt, beispielsweise eine bereits registrierte E-Mail-Adresse.

HTTP 422:
Request entspricht nicht dem erwarteten Datenmodell.

HTTP 429:
Rate-Limit überschritten.

HTTP 500:
Unerwarteter Serverfehler.

Das Frontend soll Fehler verständlich darstellen, aber keine internen Stacktraces oder Datenbankdetails anzeigen.

Bei HTTP 401 muss der Authentifizierungsstatus überprüft werden. Bei HTTP 403 darf nicht automatisch von einer abgelaufenen Sitzung ausgegangen werden.

Bei HTTP 429 sollte das Frontend unnötige Wiederholungen vermeiden.

12. EMPFOHLENE REIHENFOLGE DER FRONTEND-IMPLEMENTIERUNG

Phase 1:

* Zentralen API-Client implementieren.
* Session-Cookies automatisch mitsenden.
* CSRF-Token abrufen und verwalten.
* Fehlerbehandlung zentralisieren.

Phase 2:

* Registrierung und Login anschließen.
* Aktuellen Benutzer über /api/auth/me laden.
* Logout implementieren.
* Anwendungszustand beim Benutzerwechsel zurücksetzen.

Phase 3:

* Einstellungen über GET /api/settings laden.
* Einstellungen über PUT /api/settings speichern.
* Bestehende lokale Speicherung kontrolliert integrieren.

Phase 4:

* Prüfungen über GET /api/exams/me laden.
* Prüfungsergebnisse nach Abschluss über POST /api/exams speichern.
* Synchronisierungsstatus anzeigen.
* Doppelte Speicherungen und verlorene Daten vermeiden.

Phase 5:

* Administratoroberfläche anschließen, falls erforderlich.
* Administratorrechte ausschließlich über die API prüfen lassen.

13. VERBINDLICHE TESTS VOR DER FREIGABE

Der Agent soll mindestens folgende Fälle testen:

Authentifizierung:

* Registrierung eines neuen Benutzers
* Login mit korrekten Zugangsdaten
* Login mit falschen Zugangsdaten
* Abruf des aktuellen Benutzers
* Logout
* Zugriff auf geschützte Endpunkte ohne Sitzung

CSRF:

* Schreibrequest mit gültigem Token
* Schreibrequest ohne Token
* Schreibrequest mit falschem Token
* Schreibrequest mit unzulässigem Origin

Benutzereinstellungen:

* Einstellungen speichern
* Einstellungen erneut laden
* Prüfen, dass nicht veränderte Einstellungen erhalten bleiben

Prüfungen:

* Prüfung speichern
* Prüfung erneut laden
* Prüfen, dass das JSON-Ergebnis vollständig erhalten bleibt
* Prüfen, dass der Benutzer die gespeicherte Prüfung sieht

Benutzertrennung:

* Benutzer A registrieren und eine Prüfung speichern
* Benutzer A abmelden
* Benutzer B anmelden
* Prüfen, dass B die Prüfung von A nicht über /api/exams/me erhält
* Prüfen, dass B keine Einstellungen von A sieht
* Prüfen, dass B keine Prüfungen für A speichern kann

Administratorrechte:

* Administratorzugriff mit einem Admin-Konto testen
* Dieselben Endpunkte mit einem normalen Benutzer testen
* HTTP 403 für den normalen Benutzer erwarten

14. AKTUELLER NACHGEWIESENER BACKEND-STAND

Folgende Punkte wurden bereits erfolgreich getestet:

* Das FastAPI-Modul lässt sich mit der vorhandenen Backend-Konfiguration importieren.
* Der Dienst motionai-api läuft.
* /api/health liefert HTTP 200.
* Die Anmeldung funktioniert bei Verwendung des erlaubten Origin.
* Ein CSRF-Token kann abgerufen werden.
* POST /api/exams liefert HTTP 201.
* Der gespeicherte Datensatz erscheint anschließend in GET /api/exams/me.

Die API-Grundlage für das Speichern und Abrufen von Prüfungen ist damit vorhanden.

15. WICHTIGE GRENZEN UND NOCH ZU PRÜFENDE PUNKTE

Die oben beschriebenen Funktionen beziehen sich auf den aktuell vorliegenden Backend-Code und die bereits durchgeführten Tests.

Vor einer produktiven Freigabe müssen insbesondere folgende Punkte im Gesamtsystem geprüft werden:

* Die genaue Struktur der Prüfungsobjekte im bestehenden Frontend.
* Die Behandlung mehrfacher Speicherungsversuche.
* Die Integration mit eventuell vorhandenen lokalen Datenbeständen.
* Die Synchronisierung paralleler Änderungen.
* Die Behandlung abgelaufener Sitzungen.
* Die korrekte Verarbeitung von Datum und Uhrzeit.
* Die Berechtigungen für Administratorfunktionen.
* Die Behandlung von Datenbankfehlern und Netzwerkunterbrechungen.

Die bestehende API bietet noch keinen ausdrücklich definierten Mechanismus für idempotente Schreiboperationen. Falls Prüfungen bei Verbindungsabbrüchen automatisch erneut gesendet werden sollen, muss eine geeignete Strategie entwickelt werden.

Der Agent soll die bestehende Anwendungslogik möglichst erhalten und nur die notwendigen Stellen für Authentifizierung, Laden, Speichern und Synchronisierung ändern. Vorhandene Funktionen dürfen nicht ohne Prüfung entfernt oder ersetzt werden.

ENDE DER ANLEITUNG