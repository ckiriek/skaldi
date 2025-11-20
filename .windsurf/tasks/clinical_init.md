# Skaldi – Clinical Init Tasks (Windsurf)

This file defines the initial setup and refactoring tasks for the clinical documentation engine in Skaldi.

You MUST follow:
- `.windsurf/rules/clinical_rules.md`
- `.windsurf/rules/clinical_rules_tasks.md`

Do not ignore or override those rules.

Execute tasks sequentially, top to bottom.  
Ask for clarification only if you are completely blocked.

---

## TASK 0 – Confirm project scan and context

1. Scan the repository and identify:
   - main application entry points,
   - backend / API / orchestrator modules,
   - any existing code related to:
     - clinical document generation,
     - forms for entering trial data,
     - Supabase integration,
     - AI agents / tools / prompt orchestration.

2. Produce a short internal summary (in a new file):

   clinical_guidelines/orchestration_overview.md
This file must include:

current flows for generating documents (what is already implemented),

where prompts and agents are defined,

how Supabase is currently used,

what document types (Protocol, IB, CSR, ICF, etc.) are already supported or partially supported.

Do NOT change behaviour yet. This task is strictly mapping and documentation.

TASK 1 – Map document types and existing generation flows

Based on the codebase and clinical_reference/ contents, identify which clinical document types are relevant for Skaldi:

Protocol

CSR (Clinical Study Report)

IB (Investigator’s Brochure)

ICF (Informed Consent Form)

Synopsis

Product Summary / SPC-like docs

(SAP to be added later)

In clinical_guidelines/templates.md:

Create or update sections that list:

each document type,

a short description (1–2 sentences, business / regulatory purpose),

whether generation is:

already implemented,

partially implemented,

planned.

Do not invent new document types without clear justification.

TASK 2 – Extract section structures (TOC) from reference corpus

Use ONLY .md files in clinical_reference/ as reference. Do NOT modify them.

For each document type, select 1–2 best examples:

CSR – bcd-063_CSR.md, BCD-063_dop_report.md

IB – bcd-063_IB_part1.md, bcd-089_IB.md

Protocol – protocol_femilex.md, protocol_perindopril.md, protocol_sitaglipin.md

ICF – ICF_linex.md, ICF_ozeltamivir.md, ICF_sitaglipin.md

Summaries – summary_linex.md, summary_podhaler.md

Synopsis – synopsis_femoston.md

Overview – trials_overview_linex.md

From each example, extract:

full list of top level sections,

sub-sections (1–2 levels deep),

their order and naming.

In clinical_guidelines/templates.md:

For each document type, create a Section Map in markdown.

Example format:

## CSR – Section Map (based on BCD-063)

1. Title Page
2. Synopsis
3. Ethics
4. Investigators and Study Administrative Structure
5. Introduction
6. Study Objectives
7. Investigational Plan
   7.1 Overall Study Design
   7.2 Discussion of Study Design
   ...
8. Study Patients
9. Efficacy Evaluation
10. Safety Evaluation
11. Discussion and Overall Conclusions
12. References
13. Appendices


Align these section maps with ICH where applicable (e.g. ICH E3 for CSR, ICH E6 for Protocol, etc.). If reference documents deviate slightly from guidance, note that in a short comment in templates.md, but do NOT rewrite the references.

TASK 3 – Design the template file structure in templates_en/

You must now establish a clean template file structure.

Create folder structure (if it does not exist):

templates_en/
  csr/
  protocol/
  ib/
  icf/
  synopsis/
  spc/


For each document type, create initial JSON skeleton files, one per major section or logical block.

Example (CSR):

templates_en/csr/
  synopsis.json
  introduction.json
  objectives.json
  study_design.json
  endpoints.json
  populations.json
  efficacy_evaluation.json
  safety_evaluation.json
  statistics.json
  conclusions.json


Example (Protocol):

templates_en/protocol/
  synopsis.json
  objectives.json
  study_design.json
  schedule_of_assessments.json
  eligibility_criteria.json
  treatments.json
  safety_monitoring.json


Each JSON file must have at least the following fields (schema-level, content can stay placeholder for now):

{
  "document_type": "CSR",
  "section_id": "csr_synopsis",
  "section_name": "Synopsis",
  "description": "High-level summary of study design, population, endpoints and main results.",
  "expected_inputs": [
    "compound_name",
    "indication",
    "phase",
    "study_design_type",
    "primary_endpoints",
    "secondary_endpoints",
    "sample_size"
  ],
  "constraints": [
    "ICH E3 structure",
    "No speculative efficacy claims",
    "Results must be linked to actual study data"
  ],
  "template_type": "text_block",
  "language": "en",
  "version": 1
}


Do NOT fill in long English clinical text yet. This task is about file and schema structure, not the final wording.

TASK 4 – Audit and centralise existing prompts and agents

You must now reconcile current agents/prompts/orchestration with the new template structure.

Search the codebase for:

existing prompts for document generation,

definitions of AI agents (or tools),

orchestration flows that call models for:

Protocol,

IB,

CSR,

ICF,

Synopsis.

Create a new documentation file:

clinical_guidelines/prompts.md


For each agent / major prompt:

name of agent/tool,

file/module where it is defined,

purpose (e.g. "generate CSR synopsis", "draft IB nonclinical section"),

what inputs it expects,

what outputs it produces,

which document type and section it targets.

Identify all prompts that:

hardcode structure instead of using templates,

mix multiple sections in one generation,

mix UI copy with clinical text,

contain long, inline instructions that should live in templates_en.

Propose a refactoring plan in prompts.md:

which prompts should be replaced by template-driven ones,

where new template-based prompts will live,

how orchestration will map document_type + section → template + prompt.

Do not start refactoring yet – just map and plan.

TASK 5 – Propose the Supabase schema for templates and structure

Now you must design how Supabase will hold clinical document templates and structure.

Create a new file:

clinical_guidelines/data_model.md


In it, propose a Supabase/Postgres data model with at least the following conceptual tables:

document_templates

document_structure

document_examples

regulatory_rules

style_guide

For each table, define:

fields (name, type, purpose),

primary keys,

relationships to other tables (foreign keys, many-to-one, etc.),

how it maps to files in:

templates_en/

clinical_reference/

clinical_guidelines/templates.md

Design with the following constraints:

templates must be versioned,

templates must be filterable by document_type, section_id, language,

structure must represent TOC (parent/child hierarchy, ordering),

examples must reference both templates and source reference documents,

regulatory_rules must be able to express QC checks (e.g. "Objective X must have Endpoint Y").

Only after the model is documented and stable in data_model.md, you may later (in a separate task) generate SQL migrations for Supabase. Do NOT create migrations as part of this task.

TASK 6 – Align orchestration with template and data model

Now you must ensure that the generation engine conceptually maps to the new structure.

In clinical_guidelines/orchestration_overview.md, extend the document with a section:

## Future orchestration model (template-driven)


Describe:

how the system should handle a "Generate Document" request:

intake of parameters (compound, indication, phase, etc.),

identification of document_type,

retrieval of section map from document_structure,

retrieval of relevant templates from document_templates,

assembly of prompts for each section,

sequential or parallel generation of sections,

QC pass using regulatory_rules,

final assembly into a single document.

Explicitly map:

which parts are handled by:

Supabase,

backend / orchestrator code,

AI model,

reference corpus,

and where in the repository each part lives.

Do NOT yet implement or change orchestration code. This task is about having a clear, documented design that aligns with rules.

TASK 7 – Review and tag forms / UI that collect study parameters

Forms – критичны для того, какие поля вообще попадут в документ.

Find all forms / UI components that:

collect clinical trial parameters,

let the user specify:

compound name,

drug class,

indication,

phase,

population (adult/paediatric, etc.),

primary/secondary endpoints,

visit schedule details,

safety and lab panels,

statistical assumptions.

In clinical_guidelines/system.md, add a short section:

## Data entry – clinical parameters

- List relevant forms and components.
- Identify which document types each form feeds into.
- Identify missing fields that are required for robust template-based generation.


Do not rewrite the UI at this step. Only document and identify gaps.

TASK 8 – Define initial QC rule set

You must now propose which QC checks will be implemented first.

In clinical_guidelines/templates.md, for each document type, add a subsection:

### QC – Minimal checks


Describe in bullet points:

which sections must always be present,

which cross-links must be consistent (e.g. Objectives ↔ Endpoints ↔ Analysis Sets),

which tables must exist (e.g. Schedule of Assessments),

which abbreviations must be defined.

In clinical_guidelines/data_model.md, for regulatory_rules, describe how such rules could be stored:

as structured conditions,

reference to document_type / section_id,

possibly simple expression language or JSON-based rules.

You are not implementing engine code yet – only defining specification.

TASK 9 – Safety and backwards compatibility check

Before any further major refactors:

Summarise in clinical_guidelines/system.md under a new heading:

## Backwards compatibility and risk notes


which existing behaviours must NOT be broken,

which parts are experimental or allowed to change,

where guard rails are needed to avoid generating incorrect or misleading documents.

Based on this, mark any high-risk areas in:

prompts.md

orchestration_overview.md

data_model.md

Use short, direct comments like: > RISK: changing this may break CSR generation for existing customers.

TASK 10 – Report status and prepare for implementation phase

This is the final task of the init phase.

Create a short status file:

clinical_guidelines/init_status.md


It must include:

which tasks from this file are complete,

which are partial,

which are blocked (with reasons),

any new insights about:

reference corpus quality,

gaps in existing prompts/agents,

missing fields in forms,

data model adjustments.

Do NOT start large scale implementation (code refactors, Supabase migrations, massive prompt rewrites) until this init phase is fully documented and stable.

After completing this file, the next phase will be:

implementing Supabase schema,

wiring templates_en into the orchestrator,

refactoring prompts and agents to use templates and rules,

implementing the first wave of QC checks.