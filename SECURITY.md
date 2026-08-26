# Security and privacy policy

## Supported status

This repository is an early public proof, not a supported device-management or production agent system. The browser prototypes operate locally and do not require external network access. The included AppLoad material is experimental and has not completed public physical-device acceptance.

## Reporting a vulnerability

After the GitHub repository exists, report vulnerabilities through its private **Security advisories** page. Do not put secrets, personal data, device identifiers, or network details in a public issue.

If private reporting is not enabled, open a content-free issue asking the maintainer to enable a private reporting route. Do not include exploit details or sensitive evidence in that issue.

## Data rules

- Use invented fixtures in tests, examples, screenshots, and demos.
- Store real notes, calendars, handwriting, game history, and generated personal documents outside the repository.
- Never commit `.env` files, credentials, tokens, SSH material, provider configuration, device identifiers, internal addresses, logs, or recovery records.
- Do not log note text, handwriting, calendar content, prompts, model replies, credentials, addresses, or device identifiers by default.
- Treat files arriving from an e-ink device or agent runtime as untrusted input.

## Adapter boundary

The public reMarkable and Hermes work is an interface boundary until sanitized, reusable adapter code and tests exist. A content workflow must not silently modify device services, network settings, power policy, boot behavior, update behavior, or recovery configuration.
