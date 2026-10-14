# Family Budget — AutoLog setup test build

## Visible changes in this build
- Added **Set Up AutoLog** on Home and in Backup/Settings.
- Added a setup panel with separate paths for new bank messages and historical messages.
- The new-message button opens Apple Shortcuts on iPhone; the historical path opens the app's existing export/import workflow.
- Updated the service-worker cache version to `2026-10-13-7` so the new UI can be fetched after deployment.

## Important limitation
This is an app-side setup UI, not an end-to-end automatic Shortcut installer. A website cannot silently create iPhone Shortcuts or grant Messages permissions. A real installable Shortcut must be created/shared through Apple's Shortcuts workflow, then tested on the device. The historical workflow still requires a Shortcut named `Export bank messages` that exports to `FamilyBudget-history.txt`.

## Preserved
- Existing `FamilyBudget-messages.txt` new-message file workflow.
- Existing transaction storage, parser, duplicate detection, review queue, backup/restore and offline PWA assets.

## Test steps
1. Deploy this ZIP to a test deployment first.
2. Open Home and tap **Set Up AutoLog**; confirm the setup panel is visible.
3. Open Backup and confirm the same entry is available.
4. On iPhone, tap **Open Apple Shortcuts** and confirm Shortcuts opens. This does not create an automation by itself.
5. Confirm old-message import still opens the existing historical import panel.

JavaScript syntax and ZIP integrity are checked; full iPhone Shortcut installation and message-fetching are not yet end-to-end tested.
