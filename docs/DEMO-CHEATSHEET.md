# DPCMS — Live Demo Cheat-Sheet

> **One page. Follow top to bottom.** Left = what to click. Right = what to say.
> Tell ONE story: a customer gives consent → uses their rights → a breach happens → the bank proves compliance.
> **Go slowly. Pause after each screen loads.** Don't talk and click at the same moment — click, let it load, then talk.

## BEFORE YOU WALK IN (do this 30 min early)
- [ ] Open **https://dpcms-sigma.vercel.app** and sign in: `dpcmsadmin` / `dpcms@2026` *(rotate password if it was shared publicly; have the new one written down).*
- [ ] Open a **second browser tab** also signed in, so you can switch between customer and admin views fast.
- [ ] Zoom the browser to ~125% so the room can read it. Hide your bookmarks bar.
- [ ] Turn on the **mobile hotspot** as network backup.
- [ ] Open the **offline fallback**: the screenshot images in the project folder (`tour-01` … `tour-16`, `walk-01` … `walk-14`). If Wi-Fi dies, present these instead — the story is the same.
- [ ] Have this sheet printed or on a second device (phone), not on the screen you're sharing.

---

## THE GOLDEN PATH (10–12 min)

| # | DO THIS (click) | SAY THIS |
|---|---|---|
| 1 | Go to **`/rfp-matrix`**. Scroll so they see the rows + RA badges. Click ONE row to jump into the app. | "This is your RFP, line by line. Every row is green — Readily Available — and **every row is clickable** straight to the working screen and its evidence. No other bidder can do this." |
| 2 | Go to the **public site `/`**. Switch language to **Malayalam**. Show the **cookie banner**. Open a privacy notice and press **Read Aloud**. | "This is a Kerala bank, so we lead in Malayalam. One click changes the language. And for customers who can't read easily, the notice is **read aloud** — accessibility built in." |
| 3 | Go to **customer portal `/me`** → **Consents**. **Grant** a consent for a purpose. Then **Download** the consent artefact and open the file. | "Here a customer gives consent. The bank gets a **digitally signed consent record** — tamper-proof and compatible with the government's consent framework. The customer can download their own copy any time." |
| 4 | Click **Withdraw** on that consent. Show the history / new record. | "One click to withdraw. Notice the original record is **never altered** — we add a new signed record. The full history is always provable." |
| 5 | In `/me`, **Raise a request** (a DSR) — choose access or erasure, submit. | "Now the customer exercises their rights under the DPDP Act — here, a request to access or erase their data." |
| 6 | Switch to **admin tab** → **`/admin/dsr`**. Show the request in the queue with the **green/amber/red SLA timer**. | "On the bank's side, it lands in the officer's queue immediately, with a **live countdown** against the legal 30-day deadline — green, amber, red. Nothing gets missed." |
| 7 | Go to **`/admin/breach`** → open or create an incident. Show the **72-hour countdown**. Click **Generate report (PDF)**. | "If there's a breach, the clock starts automatically against the reporting deadline. With one click we generate the **official Data Protection Board report**, on bank letterhead." |
| 8 | **★ THE BIG ONE ★** Go to **`/admin/audit`**. Click **Verify chain** / recompute. Let the green "verified" result show. **Pause.** | "And here is the proof for your auditors. Everything I just did is in a **tamper-evident log**. I'm re-computing its cryptographic integrity **right now, live**… and it verifies. If anyone altered a single record, this would turn red." *(Let it sit. This is the moment.)* |
| 9 | Go to **`/admin/integrations`**. Show the 6 connectors. Toggle a **Finacle "new account opening"** event; show consent enforcement firing. | "These connect to the bank's core systems — Finacle, NPCI, Aadhaar, DigiLocker, Account Aggregator. For the demo they're simulated with the **real data formats**; at production we connect the live systems. Watch — a new account event automatically triggers a consent check." |
| 10 | Go to **`/admin/reporting`** (board dashboard) and the **SBOM** download. | "For leadership, a board-level compliance dashboard. And for your security team, a full software bill of materials — one click." |

**→ End demo. Switch back to the slides (Slide 8).** Say: *"That's the system, working today. Let me show you how we take it to production for KSCB."*

---

## IF SOMETHING BREAKS
- **Page won't load / Wi-Fi dies** → calmly switch to the **screenshot fallback** (`tour-*.png` / `walk-*.png`). Say: "Let me show you these from our captured walkthrough — it's the same flow." Don't apologise repeatedly; keep moving.
- **Login fails** → use the second pre-signed-in tab. Never debug live in front of them.
- **A click is slow** (the free database wakes from sleep — first action can take a few seconds) → fill the silence: "It's waking from idle — on free infrastructure it sleeps to save cost; production stays warm." Turns a pause into a credibility point.
- **You lose your place** → the story is always: consent → withdraw → request → breach → **prove it (audit)**. Get back to the audit verification; that's the climax.

## THE 3 MOMENTS THAT WIN — make sure these happen
1. **Clicking the RFP matrix** (step 1) — "nobody else has this."
2. **Malayalam + read-aloud** (step 2) — the Kerala/heart moment.
3. **Live audit-chain verification** (step 8) — the auditor's "wow." **Do not rush this one.**
