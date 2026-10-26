---
"@cube-creator/ui": patch
---

Override Mocha's pinned js-yaml dependency to 4.1.1 to fix prototype pollution when parsing YAML test configuration (CVE-2025-64718).
