---
trigger: always_on
---

# Clinical Task Interpretation Rules (Skaldi)

These rules apply whenever Windsurf receives a task inside the Skaldi repository.

---

## 1. Identify the task category

Before acting, determine what the task affects:

- **reference corpus** (`clinical_reference/`)
- **document templates** (`templates_en/`, `clinical_guidelines/templates.md`)
- **Supabase schema** (tables, migrations, structure)
- **document orchestration** (generation flow, section assembly)
- **UI/UX only** (does not affect clinical content)

This classification determines which rules and files apply.

---

## 2. Required pre-checks before editing

For any task that touches document logic, structure, templates or references:

1. Read or re-read:
   - `clinical_guidelines/system.md`
   - relevant sections of `clinical_guidelines/templates.md`

2. Inspect applicable files in `clinical_reference/`  
   (these files are the gold standard examples).

3. Confirm whether existing templates or Supabase records already cover the requested functionality.

---

## 3. Requirements for proposed changes

Any change must:

- respect all rules in `clinical_rules.md`,
- maintain regulatory consistency,
- minimise risk of breaking auditability,
- preserve alignment with ICH, FDA, EMA conventions,
- keep document generation deterministic and template-based,
- move Skaldi toward production-ready behaviour.

---

## 4. Conflict handling

If a requested change contradicts existing rules, templates or regulatory logic:

- do **not** apply the change silently,
- instead explicitly highlight the conflict in the response,
- provide a compliant alternative or safe adaptation.

Windsurf must never implement changes that reduce regulatory quality, traceability or internal consistency.

---
