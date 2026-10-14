# Family Budget — SMS Shortcut integration notes

Family Budget remains local-first and does not read iPhone Messages directly.

## Existing new-message workflow
- Keep using the existing `FamilyBudget-messages.txt` flow. This test build does not overwrite or replace that file or the user's existing automation.
- In-app AutoLog setup provides an entry point to Apple Shortcuts, but iOS requires the automation itself to be created/installed and authorized on-device.

## Historical workflow
- The app can launch a Shortcut named `Export bank messages` with `shortcuts://run-shortcut?name=Export%20bank%20messages`.
- That Shortcut must be created/shared separately and must export available messages to `FamilyBudget-history.txt`.
- In Family Budget, choose the export, preview the transactions, and send new items to Review. Existing duplicate handling is retained.

## Limitation
A web app ZIP cannot silently create an Apple Shortcut, grant Messages permission, or guarantee that iOS exposes all historical messages. Do not describe AutoLog as fully installed until the actual Shortcut has been shared, installed, and tested on an iPhone.
