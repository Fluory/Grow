# Project Start – Grow

> Gründungsdokument nach `Entwicklungsplan/templates/base/PROJECT-START.md`. Discovery (1–6) stammt
> aus dem Konzept „Daily Isle – eine Welt, die jeden Tag wächst" (28.09.2026, @Flo); die drei
> Mechaniken des Konzepts wurden auf drei Repos verteilt – dieses Repo ist die **Generative
> Evolution**: echtes Wetter in Heilbronn, L-System-Pflanzen, Jahreszeiten.

**Aktueller Status:** `foundation-ready`
**Orchestrator / Projektverantwortung:** @Fluory · **Datum gestartet:** 2026-09-28

---

## 1. Problem und Ziel

**Problem:** Generative Kunst wird meist von jemandem gesteuert (Seed, Parameter, Knopfdruck) und ist
danach fertig. Tägliche Commits sind meist bedeutungslos.

**Zielgruppe:** GitHub- und Open-Source-Publikum, Creative-Coding- und Botanik-Interessierte,
Menschen, die einem langsamen, ehrlichen Experiment zusehen wollen.

**Nutzenversprechen:** Ein Garten, den niemand kontrolliert: Das echte Wetter von gestern in
Heilbronn wirkt zuerst (Regen lässt wachsen, Sonne reifen, Frost stoppt, Sturm fällt), dann trifft
der Gärtner (Claude-Routine) genau eine Entscheidung – ein Commit pro Tag. Pflanzen sind L-Systeme,
die mit jedem Regentag komplexer werden.

**Erster Meilenstein:** Der Garten wächst täglich allein mit echtem Wetter: Repo, `world.json`,
Wetter-Client, Renderer, Routine, Website.

**Erfolgskriterien:**
- [ ] 30 Tage in Folge genau ein Commit pro Tag auf `main`, jeder mit echtem (oder markiert wiederholtem) Wetter
- [ ] Jede Tagesänderung besteht `world:check` (Regeln, Replay des Logs, generierte Dateien)
- [ ] Website zeigt den Garten des jeweiligen Commits (Vercel-Deploy je Merge)

**Nicht-Ziele (erster Meilenstein):** Inselregeln (→ `one-tile-a-day`), Community-Wünsche (→
`wished-into-being`), Wettervorhersagen, Konten, Kommentare, Tracking, Monetarisierung.

## 2. Scope und Nutzerablauf

| Rolle | Darf / braucht |
|---|---|
| Besucher | Website ansehen, Garten-Explorer mit Zeitleiste, Wetterarchiv, Logbuch lesen |
| Routine (Claude) | Wetter abrufen, genau eine Entscheidung über `npm run day`, ein PR |
| Maintainer | Code-PRs, Regeln ändern, Review |

**Vertical Slice:** 08:53 Routine startet → `status` → `weather` (Open-Meteo, Cache, Fallback) →
`plan` (Wetterwirkung + legale Entscheidungen) → Claude wählt + schreibt Lore → `apply`
(Regelprüfung) → `verify` → PR → CI grün → Squash-Merge (1 Commit) → Vercel-Deploy →
Fehlerfall: Wetterdienst weg = letztes Wetter wiederholt + markiert; Regelverstoß = Exit 2 +
neuer Versuch/`auto`; CI rot = kein Merge, Tag bleibt leer.

## 3. Reifegrad und Risiko

- **Stufe:** P0 – öffentliches Experiment (keine Konten, keine personenbezogenen Daten außer Hosting-Logs)
- **Sichtbarkeit:** `public` – Begründung: bewusst Open Source, die Historie ist das Werk
- **Sprache:** Code, Doku, Commits, Lore, Website englisch; Rechtstexte deutsch

| Frage | Ja/Nein | Konsequenz |
|---|---|---|
| Öffentliche Nutzer? | Ja | Recht-Add-on (Impressum, Datenschutz) |
| Login / Rollen? | Nein | – |
| Personenbezogene Daten? | Nein | nur Server-Logs beim Hoster |
| Persistente Datenbank? | Nein | Garten liegt in Git |
| Externe APIs? | Ja | Open-Meteo (frei, ohne Schlüssel), nur von der Routine; strikt geparst (zod), Fallback |
| LLM / Agentenfunktion? | Ja | KI-Add-on: Prompt versioniert (`ROUTINE.md`), Evals (`evals/`) |
| Öffentliche Website? | Ja | Impressum/Datenschutz, Daten per Env-Variablen |

**Aktivierte Add-ons:** KI/RAG, Recht.

## 4. Technikentscheidungen

| Bereich | Entscheidung | Warum | Status |
|---|---|---|---|
| Sprache | TypeScript 6 (Engine, CLI, Website) | eine Sprache für Engine und Website; TS 7 ohne Compiler-API | gesetzt |
| Frontend | Next.js 16 App Router, statisch, MDX-Kapitel | Vorgabe des Orchestrators | gesetzt |
| 3D / Motion | React Three Fiber (eine persistente Canvas), GSAP + ScrollTrigger + SplitText, Lenis, View Transitions | Vorgabe des Orchestrators | gesetzt |
| Wetter | Open-Meteo Forecast-API (gestern, Tageswerte) + Archiv-API für das Referenzjahr | frei, ohne Schlüssel, CC BY 4.0 | gesetzt |
| Pflanzen | parametrische, stochastische L-Systeme mit 3D-Turtle, ein Skelett für SVG und 3D | Konzept „L-System-Bäume" | gesetzt |
| Datenbank | keine – `world/world.json` in Git | jeder Commit = ein nachvollziehbarer Tag | gesetzt |
| Hosting | Vercel (Hobby) | Deploy je Merge, keine Server | gesetzt |
| CI | GitHub Actions (systemweit) | SYSTEM.md §11 | gesetzt |
| KI | Claude-Routine (Claude Code in der Cloud) | tägliche Entscheidung + Lore | gesetzt |

**Offene Entscheidungen aus dem Konzept – als Default entschieden, änderbar:**
Name englisch („Grow", Repo-Name) · Thema Garten mit Bach · Stil botanische Vektorzeichnung (README)
+ Low-Poly-3D (Website) · Garten 64 × 3 Reihen · Ort Heilbronn (49,1427 N, 9,2109 E) · persönlicher
Account `Fluory` · Uhrzeit 08:53 (versetzt zu den Schwesterinseln).

## 5. Sicherheit, Daten und Betrieb

- Keine Secrets im Repo; Impressumsdaten nur als Vercel-Umgebungsvariablen. Open-Meteo braucht keinen Schlüssel.
- Wetterantworten sind untrusted input: nur Zahlen werden übernommen, Schema-Validierung (zod), Grenzen je Wert.
- `.claude/settings.json` mit Read-Sperren, Wächter-Hooks, Auto Memory aus.
- Betrieb: kein Server; Rollback = `git revert` des Tages-Commits (neuer Commit, Historie bleibt).

## 6. Planung und Arbeitsfluss

Board `Inbox → Ready → In Progress → In Review → Done`; Labels aus `.github/labels.json`
(Workflow `Labels`). Merge nach Risikomatrix SYSTEM.md §5; Ausnahme: Tages-PR der Routine (Register).

## 7. Setup-Freigabe

- [x] Problem, Ziel und Nicht-Ziele verstanden – aus dem Konzept
- [x] Vertical Slice festgelegt
- [x] Stufe und Risikoprofil entschieden (P0, KI + Recht, externe API Open-Meteo)
- [x] Sichtbarkeit entschieden (public)
- [x] Tech-Stack entschieden (Vorgabe im Auftrag)
- [x] Budget: 0 € (GitHub Free, Vercel Hobby, Open-Meteo frei, vorhandenes Claude-Abo)
- [x] Orchestrator gibt Setup frei – Auftrag „Setze die 3 Ideen um" vom 2026-09-28

**Freigabe durch:** @Fluory · **Datum:** 2026-09-28
