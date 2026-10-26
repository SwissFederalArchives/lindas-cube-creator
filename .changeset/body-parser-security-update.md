---
"@cube-creator/core-api": patch
"@cube-creator/cli": patch
---

Update body-parser from 1.20.3 to 1.20.9 and its request-parsing dependencies to address security issues, including CVE-2026-111181 and CVE-2026-12590. Invalid body-size limit configuration now throws instead of silently disabling limit enforcement.
