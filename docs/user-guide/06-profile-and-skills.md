# Profile, modes, and skills

Profile settings control **how the AI sounds and what background it uses** when answering.

## Profile modes (personas)

**Settings → Profile** — each mode is a persona with:

| Field | Purpose |
|-------|---------|
| **Name** | Mode label shown in the overlay and recaps |
| **Instructions** | System-style guidance (tone, role, constraints) |
| **Notes sections** | Optional structured notes template |
| **Reference files** | Playbooks, docs, PDFs attached to this mode |

Switch the active mode from the Profile panel. The active mode name appears in session recaps.

## Mode templates

Click **Add from template** to start from presets:

- General
- Sales
- Recruiting
- Looking for work
- Team meet
- Lecture
- Gen AI engineer
- And others in the template picker

Templates pre-fill instructions you can edit.

## Reference files

Upload PDF, TXT, or MD files per mode. Enabled references are included in Ask context when Intelligence routing decides they are relevant.

With **Intelligence → Reference file vectors** enabled, chunks are embedded for semantic retrieval; keyword fallback always remains.

## Personal background (global)

Separate from modes, under Profile:

| Asset | Purpose |
|-------|---------|
| **Resume** | Upload PDF/TXT/MD — text extracted for first-person answers about your experience |
| **Job description** | Target role notes so answers align with a specific position |

These apply across modes when routing includes them.

## Mode auto-suggest

When **Intelligence → Auto-detect meeting type** is on, VeilAssist watches live transcript keywords and may show a banner suggesting a different profile mode. Switch or dismiss from the overlay.

## Skills

**Settings → Skills** — shorter reusable instruction blocks than full modes.

| Step | Action |
|------|--------|
| Create | Add name, slug, and instruction body |
| Use | Type `/slug` or `/slug your question` in the overlay input |
| Templates | Add starter skills from the panel |

Skills stack with the active profile mode and transcript context.

## Stronger candidate voice

**Intelligence → Customize → Stronger candidate voice** (Profile tree v2) keeps answers anchored to structured resume/JD sections — first person, your real experience, fewer generic claims.
