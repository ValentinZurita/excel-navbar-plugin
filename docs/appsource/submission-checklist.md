# Sheet Navigator AppSource submission checklist

Official Microsoft Learn references supplied for this preparation pass:

- Office Add-in submission guide: <https://learn.microsoft.com/en-us/partner-center/marketplace-offers/add-in-submission-guide>
- Marketplace offer checklist: <https://learn.microsoft.com/en-us/partner-center/marketplace-offers/checklist>

Status key:

- Ready: repository evidence is available and draft material exists.
- Human decision: requires publisher, legal, pricing, or business choice.
- Partner Center action: must be completed in Microsoft Partner Center or the live certification UI.
- Gap: material still needs to be produced or captured.

## Partner Center setup

- [ ] Partner Center action — Enroll in the Microsoft 365 and Copilot program.
- [ ] Partner Center action — Create a new offer under Marketplace offers > Microsoft 365 and Copilot > New offer.
- [ ] Human decision — Confirm publisher account, seller profile, tax/payment prerequisites if requested by Partner Center, and public publisher identity.
- [ ] Human decision — Choose final offer alias/internal name.
- [ ] Human decision — Choose final market/language availability and release timing.
- [ ] Human decision — Decide final commercial model in Partner Center. Current repository license is CC BY-NC 4.0: non-commercial use is allowed; commercial use requires separate written permission.
- [ ] Human decision — Define a commercial permission contact/process if commercial use requests will be accepted.

## Package and legal links

- [x] Ready — Manifest URL identified: <https://valentinzurita.github.io/excel-navbar-plugin/excel-navbar-plugin.xml>
- [x] Ready — Product URL identified: <https://valentinzurita.github.io/excel-navbar-plugin/>
- [x] Ready — Privacy policy URL identified: <https://valentinzurita.github.io/excel-navbar-plugin/privacy.html>
- [x] Ready — Terms / EULA URL identified: <https://valentinzurita.github.io/excel-navbar-plugin/terms.html>
- [x] Ready — Support URL identified: <https://valentinzurita.github.io/excel-navbar-plugin/support.html>
- [x] Ready — Repository support channel identified: <https://github.com/ValentinZurita/excel-navbar-plugin/issues>
- [ ] Partner Center action — Upload and validate the Office Add-in manifest in Partner Center.
- [ ] Partner Center action — Confirm every URL is reachable over HTTPS from Partner Center validation at submission time.
- [ ] Human decision — Confirm the legal pages are final for public AppSource review and distribution.

## Listing assets

- [x] Ready — Draft product title in `docs/appsource/listing.md`.
- [x] Ready — Draft short summary in `docs/appsource/listing.md`.
- [x] Ready — Draft HTML-ready long description in `docs/appsource/listing.md`.
- [x] Ready — Draft feature bullets in `docs/appsource/listing.md`.
- [x] Ready — Draft target audience in `docs/appsource/listing.md`.
- [x] Ready — Draft keywords in `docs/appsource/listing.md`.
- [x] Ready — Suggested category/industry values in `docs/appsource/listing.md`.
- [x] Ready — Pricing/availability disclosure drafted around CC BY-NC 4.0 and separate commercial permission.
- [x] Ready — Existing icon assets identified in `assets/` by repository inventory.
- [x] Ready — Existing demo GIF assets identified in `assets/landing/` and referenced by `docs/appsource/screenshot-plan.md`.
- [ ] Gap — Capture at least one final static screenshot from a real Excel client for Partner Center upload.
- [ ] Gap — Confirm current Partner Center image dimensions, file types, count, and localization requirements in the live submission UI before upload.
- [ ] Human decision — Select final screenshots, alt text/descriptions, and any localized listing variants.

## Certification notes

- [x] Ready — Reviewer manifest/package facts drafted in `docs/appsource/certification-notes.md`.
- [x] Ready — Excel on the web, Windows, and Mac reviewer instructions drafted.
- [x] Ready — No-account/no-purchase/no-SSO disclosures drafted.
- [x] Ready — Feature test cases and expected behavior drafted.
- [x] Ready — Windows and macOS keyboard shortcuts documented from `shortcuts.json` and README evidence.
- [x] Ready — Known limitations documented without claiming unsupported capabilities.
- [x] Ready — Accessibility notes documented.
- [x] Ready — Privacy/data handling notes documented from current privacy page.
- [ ] Partner Center action — Paste complete notes into the certification notes field during submission.

## Validation

- [ ] Partner Center action — Run Partner Center manifest validation.
- [ ] Partner Center action — Resolve any validation findings returned by Microsoft.
- [ ] Partner Center action — Confirm HTTPS EULA, privacy, and support links pass validation.
- [ ] Partner Center action — Confirm listing required fields pass validation.
- [ ] Partner Center action — Confirm uploaded screenshots/icons pass validation.
- [ ] Partner Center action — Smoke-test the production manifest in Excel on the web.
- [ ] Partner Center action — Smoke-test the production manifest in Excel for Windows.
- [ ] Partner Center action — Smoke-test the production manifest in Excel for Mac.
- [ ] Human decision — Decide whether any certification notes need to call out organization policy or managed-device limitations before final submission.

## Final submission

- [ ] Partner Center action — Review every Partner Center page for completeness.
- [ ] Partner Center action — Submit through Review and publish.
- [ ] Partner Center action — Monitor certification feedback.
- [ ] Human decision — Decide how to handle any Microsoft certification requests, especially requests involving licensing, legal wording, data handling, or screenshot replacement.
- [ ] Partner Center action — Publish after approval according to the selected release timing.
