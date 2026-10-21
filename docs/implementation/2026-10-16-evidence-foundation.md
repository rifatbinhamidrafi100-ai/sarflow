# SARFlow evidence foundation

## Authorized scope
The user authorized local implementation of the research-platform roadmap on October 16. Preserve existing recognition of synthetic teaching arrays versus actual satellite observations. Competition eligibility and reuse rules remain unverified; no publication or submission is authorized.

## Design
Extend the existing analysis workflow with a versioned evidence package rather than build a separate application. The package carries the original dataset, selected observations, processing parameters, optional result, a stable method identifier, explicit evidence labels, metrics, quality status, and limitations. Existing evidence and analysis downloads consume the same builder. Preserve legacy export fields for compatibility.

Validate the dataset and pair at the package boundary. Recompute the deterministic result when exporting to reject stale or altered results, including a result generated with different smoothing settings. Withhold physical area for synthetic data even if an input supplied a pixel area. Never infer an event, validation accuracy, or confidence from a threshold mask. An observed input is operator-supplied status, not proof of calibration.

## Implementation checklist
- [x] Inspect and recover public source into a separate directory without overwriting the original.
- [x] Install locked dependencies and run baseline checks.
- [x] Add evidence package builder and negative tests for mismatched results, invalid pairs, and synthetic physical-area claims.
- [x] Connect existing evidence drawer and analysis download to the package.
- [x] Apply compatible dependency security updates after inspecting the audit.
- [x] Run focused tests, full JavaScript checks, production build, and desktop/mobile browser checks.
- [x] Document remaining scientific/data and environment blockers in the verification report.

## Next increments
Acquire suitable calibrated inputs through official access with user-controlled authentication; inspect masks and geometry; reproduce imported measurements; evaluate one event against independent reference evidence. Extend to a second hazard only with independently evaluated data. Reports, bilingual explanations, offline delivery, and map consumers will build on the package contract.
