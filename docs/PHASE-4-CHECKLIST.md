# Phase 4 Checklist

Phase 4 is reserved for remaining loose ends, reliability work, regression testing, judge-readiness, and submission polish.

## Review workflow follow-ups

- [ ] **Show a checkpoint confirmation modal after “Approve As-Is” when findings are still unresolved.**
  - Trigger the modal when the reviewer chooses **Approve As-Is** while one or more findings remain unresolved.
  - Use the same visual style and interaction pattern as the existing completion modal shown after all findings have been resolved.
  - Clearly confirm that the changes/findings reviewed so far have been accepted, while stating that the remaining findings are still pending and still need review. Make it explicit that the overall review has **not** reached final approval and remains in the **Pending** queue.
  - Provide two clear actions:
    - **Continue Reviewing** — close the modal and return to the Review Studio so the reviewer can continue with the outstanding findings.
    - **Go to Command Center** — navigate back to the home/dashboard view.
  - Do not mark unresolved findings as approved, rejected, or otherwise resolved as a side effect of showing the modal.
  - Keep the existing final-completion experience unchanged when the reviewer has resolved every finding.

### Acceptance checks

- [ ] With at least one unresolved finding, selecting **Approve As-Is** saves the reviewer checkpoint and opens the confirmation modal.
- [ ] The modal clearly communicates that reviewed changes were accepted, but outstanding findings remain pending.
- [ ] **Continue Reviewing** returns to the Review Studio with unresolved findings available to review.
- [ ] **Go to Command Center** returns to the dashboard/home view.
- [ ] The review remains **Pending** until all findings are resolved and a final decision is recorded.
- [ ] When no findings remain unresolved, the existing final approval flow appears instead of the checkpoint modal.
