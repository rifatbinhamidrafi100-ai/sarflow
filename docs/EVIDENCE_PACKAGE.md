# Numerical evidence package, version 1.0.0

The analysis JSON and evidence drawer JSON now export the same versioned object. `shared/evidence-package.ts` is the numerical export boundary. Future report, assistant and offline-brief consumers should read this object rather than invent separate metrics.

The package includes full validated input arrays and provenance in `dataset`, selected pair and settings in `parameters`, source identifiers and dates in `observations`, and the reproducible `common-support-log-ratio-v1` method. `result` retains the per-cell values, mask, counts, histogram and sensitivity. `metrics`, `quality`, `labels`, `validation`, and `warnings` describe their interpretation.

Results are recomputed at the boundary and compared with the supplied result, excluding device timing. Mismatched results are rejected. The UI withholds exports during an invalid state. When settings change, an unrun package uses null metrics, not zeroes. Input status is supplied by the dataset; observed status does not independently establish calibration or validation.

Synthetic packages are illustrative and withhold area, including when an input supplied pixel area. Observed packages label the numerical transformation as processed. Candidate area uses supplied pixel area and is not confirmed event extent. Neither package establishes an event, cause, damage, validation accuracy or confidence.

Compatibility: the evidence export preserves its dataset, parameters, result, exported and disclaimer fields. The analysis export migrates to this versioned shape: use `dataset.id` for the dataset identifier, `dataset.status` for data status, `dataset.provenance` for sources, and `metrics.changedCellPercent` for the common-valid-cell percentage. RGB browse comparisons and the separate water processor have not yet been migrated.

This is a JSON contract and a deterministic builder, not a signed attestation or an authenticity guarantee. No persisted-package loader is introduced. No calibrated observation pair or independent event validation was added in this milestone.
