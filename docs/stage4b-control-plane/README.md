# Stage 4B Control Plane

This folder tracks the Stage 4B implementation work for the Stage 3 backend repo.
It is intentionally small: the graded artifacts remain working code and
`SOLUTION.md`.

## Rules

- Stage 4A files are reference-only and must not be edited.
- Existing Stage 3 auth, RBAC, API versioning, CLI, web portal, pagination, CSV
  export, and query response shapes must remain intact.
- Each implementation slice starts with a teach-back and ends with changed files,
  tests run, evidence id, and operator defense notes.
- Every major decision maps to a requirement and records alternatives or
  trade-offs.
- Completed gates cite an evidence id from `05_evidence_log.md`.

## Files

- `01_requirements_trace.md` maps requirements to implementation and evidence.
- `02_execution_roadmap.md` tracks task packets and gate status.
- `03_teach_back_protocol.md` defines the required operator explanation format.
- `04_decisions_log.md` records implementation decisions and trade-offs.
- `05_evidence_log.md` records commands, observations, and artifacts.
- `06_test_matrix.md` tracks required and regression tests.
- `07_interview_defense_bank.md` keeps concise defense prompts and answers.
- `task-packets/` contains slice-level task notes.
