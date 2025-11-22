SKALDI — FULL VALIDATION TEST RUN
Test Pack of 5 Real Clinical Protocols

Goal: Validate the complete Skaldi pipeline (IB → Protocol → SAP → ICF → CSR → CrossDoc → StudyFlow → Statistics Engine) using 5 real clinical reference trials from /clinical_reference.

🔥 Overview

Skaldi must automatically generate, validate, cross-check and analyze 5 test projects based on real-world reference protocols:

#	Project	Reference Files	Correct Product Type	Notes
1	Femilex	protocol_femilex.md	⭐ Innovator	Gynecological, no RLD
2	Perindopril	protocol_perindopril.md	⭐ Generic	ACE inhibitor, RLD: Aceon (NDA020886)
3	Sitagliptin	protocol_sitaglipin.md	⭐ Generic	DPP-4 inhibitor, RLD: Januvia (NDA021995)
4	Linex / Probiotic	summary_linex.md, ICF_linex.md, trials_overview_linex.md	⭐ Hybrid	Probiotic combination, no RLD
5	Podhaler (Tobramycin)	summary_podhaler.md	⭐ Innovator	Inhalation device, Novartis original
🧪 What Windsurf Must Do

Для каждого из 5 проектов Windsurf выполняет одинаковый сценарий:

1. Create Project with Correct Metadata
Required fields:
Project Title: <auto-generate from filename>
Compound / Drug Name: <from reference>
Sponsor Organization: Skaldi Test Validation
Phase: Extract from reference (default: Phase 3)
Indication: Extract from reference title/content
Product Type: (see table above)

Study Design defaults (если нет в reference):
Design Type: Randomized
Blinding: Double Blind
Number of Arms: 2
Duration: infer from visit schedule or default 24 weeks
Primary Endpoint: Выписать из reference файла
Secondary Endpoints: Выписать из reference файла
Visit Schedule: Выписать из reference файла
Safety Monitoring: Vital signs, ECG, Labs
Analysis Populations: ITT, PP, SAF

2. Generate All Documents

Для каждого проекта Skaldi должен создать:

 Investigator’s Brochure (IB)

 Protocol

 Informed Consent Form (ICF)

 Statistical Analysis Plan (SAP)

 Clinical Study Report (CSR)

Important:
Generation should use real-world reference content for enrichment (Phase C) and structure (Phase A–G).

3. Run Cross-Document Validation (Phase F)

Route to call:

POST /api/crossdoc/validate


Pass document IDs:

ibId
protocolId
sapId
icfId
csrId


Expected outputs:

Count Critical / Error / Warning / Info

Issue list with categories:

IB ↔ Protocol

Protocol ↔ SAP

Protocol ↔ ICF

Protocol ↔ CSR

Global

Auto-fixable subset

4. Run Cross-Doc Auto-Fix

Call:

POST /api/crossdoc/auto-fix


Fix all issues with:

strategy: "balanced"


Then re-run validation.

Expected result:
Critical issues must be eliminated or reduced to ≤1 (alignment mismatches).

5. Study Flow Generation (Phase G)

Route:

POST /api/studyflow/generate


Generate:

Visit model

Procedure inference

Endpoint-procedure map

ToP matrix

Auto-added visits (Baseline, EOT)

Window bounding

Treatment cycles

6. Study Flow Validation

Route:

POST /api/studyflow/validate


Collect:

Unsupported timing

Missing primary assessment procedures

Alignment errors

Cycle inconsistencies

7. Study Flow Auto-Fix

Route:

POST /api/studyflow/auto-fix


With:

strategy: "balanced"


Expected result:
Final flow must be valid, consistent, and exportable.

8. Statistics Engine (Phase E) Validation

Run:

POST /api/statistics/sample-size
POST /api/statistics/map-test
POST /api/statistics/generate-sap


Expected:

Correct test selection

Correct sample size formula

SAP-consistent statistical structure

No contradictions with Protocol primary endpoint

9. Export All Documents for Manual Comparison

Export formats:

docx

pdf (if enabled)

html

Skaldi must attach:

IB_<project>.docx
Protocol_<project>.docx
SAP_<project>.docx
ICF_<project>.docx
CSR_<project>.docx
ToP_<project>.xlsx
StudyFlow_<project>.json
CrossDocValidation_<project>.json

📁 10. Compare Against Real Reference Documents

Windsurf must load the real reference markdown files:

/clinical_reference/
    protocol_femilex.md
    protocol_perindopril.md
    protocol_sitaglipin.md
    summary_linex.md
    ICF_linex.md
    summary_podhaler.md
    ...


And produce a comparison report:

Comparison categories:

Endpoints similarity

Objectives alignment

Visit structure match %

Procedures correctness

Populations & inclusion/exclusion

Dosing schema

Safety assessments

Statistical methods

Overall content fidelity

Deliverable:

COMPARISON_<project>.md

📊 Expected Output Summary per Project

For each of the 5 projects Windsurf must output:

[1] Auto-generated documents (5 files)
[2] Validation summary (crossdoc)
[3] Auto-fix patch summary
[4] StudyFlow matrix + exports
[5] StudyFlow validation report
[6] Statistics Engine report
[7] Reference comparison report

🎯 Completion Criteria

For each project:

 No Critical issues after auto-fix

 CrossDoc Error ≤ 2

 StudyFlow valid

 Statistical test mappings correct

 Sample size valid

 SAP consistent with Protocol

 ToP matrix complete

 Differences with reference documents minimized

🚀 Final Step

Produce:

FULL_SKALDI_SYSTEM_VALIDATION_REPORT.md


Containing:

Summary table for all 5 projects

Quality score per module (IB, Protocol, SAP, ICF, CSR)

CrossDoc performance

StudyFlow performance

Procedures inference accuracy

Endpoint alignment accuracy

Final readiness score