---
name: riveter-build
description: "Generate a dataset of rows from a natural-language description, optionally filling columns on them. Usage: /riveter-build <description of the rows you want>"
---

Use the **riveter-datasets** skill to generate rows for: $ARGUMENTS

Follow the skill instructions exactly — estimate the build with `estimate_cost: true` first, start it with `build_dataset` (`prompt` + `count`), poll the run, and return the generated rows (and the filled columns, if the user asked for them).
