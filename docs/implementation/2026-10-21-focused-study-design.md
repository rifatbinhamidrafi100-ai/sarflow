# Focused NISAR investigation

## Decision

Use the existing Brahmaputra observation corridor for the question "How did radar return change across this river corridor?" This is not an event-specific flood conclusion. The existing archive provides dated visual observations; actual calibrated measurements still need authorized access and review.

The core contribution is the traceable path from a question to dated observations, declared numerical inputs and an explicit account of what is not established. Other exploration tools remain available, but the homepage starts with this investigation.

## Evidence assessment

`shared/study-readiness.ts` inspects the existing dataset contract. Synthetic/generated inputs, unsupported source references, unmatched source identities/hashes, duplicate source bytes, unsuitable CRS declarations, unrelated display bounds and missing first/last shared valid support are rejected. Accepted inputs are numerical candidates, not authenticated measurements or validated event detections.

The exported report always separates source-byte verification, exact point support and independent evaluation. The current assessment has no independent evaluation input, so event status and accuracy cannot become positive just because an operator labels a dataset observed. Future integration must attach actual evaluated results rather than replacing this invariant with a self-declared checkbox.

## Interface

`/study` separates observed browse evidence, processed numerical candidates and independent evaluation. The recorded exploratory recipe is a common-valid log ratio, 3 dB threshold, no smoothing. Opening a numerical candidate applies those parameters to the existing analysis workflow. Browse hashes are labeled as image hashes, not measurement hashes.

## Actual external blockers

An eight-byte bounded anonymous request to the current approved NASA HDF5 link required manual Earthdata authentication. No credential was read or saved and no full measurement file was downloaded. C: had approximately 1.7 GB free when checked; a larger operator-supplied location or reviewed authenticated subsetting workflow is necessary before full-product retrieval.

Independent validation also requires a suitable date-matched reference and review; the existing Rasuwa optical mass-movement reference is not Brahmaputra flood truth. Usability testing and organizer reuse guidance require actual people and responses, not generated evidence.
