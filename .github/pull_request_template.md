## Required release evidence

- [ ] Browser tests pass at 1360px desktop and 390px mobile.
- [ ] Compare the **current** and **reconstructed original** goal-banner screenshots in the `dashboard-visual-evidence` artifact. Confirm the height is visually close to half and the subtitle is gone.
- [ ] Review full-page desktop/mobile screenshots for clipping, overflow, unexpected wrapping, and readability.
- [ ] Confirm all five summary cards have distinct visible borders on the same desktop row.
- [ ] Confirm saved holdings, costs, priorities and watchlist remain intact.
- [ ] After deployment, verify the **published** GitHub Pages workflow passes (version manifest, Refresh requests and screenshots).

**Do not approve solely on a green CI badge.** A human must inspect the screenshots and approve the release. This checklist alone does not enforce branch protection; configure required checks and required reviewers in GitHub repository settings.

### Screenshot approval gate (fail closed)
- [ ] Generate candidate snapshots using the separate `Generate visual baseline candidates` workflow.
- [ ] A human inspects and explicitly approves the candidate images against the request and prior approved reference.
- [ ] Commit **approved** PNG baselines into `tests/release-visual.spec.cjs-snapshots/` (Playwright platform-specific names).
- [ ] Run the ordinary browser workflow **without** `--update-snapshots`. Missing or mismatched baselines must fail.
- [ ] Review any `*-diff.png` artifacts and approve intended differences before changing baselines.
- [ ] Configure GitHub rulesets/branch protection to require the browser-check job and pull-request approval. This is not enforced merely by this checklist.
