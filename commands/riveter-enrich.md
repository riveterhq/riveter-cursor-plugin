---
name: riveter-enrich
description: "Run a Riveter AI enrichment on a list of inputs. Usage: /riveter-enrich <prompt describing what to enrich and the inputs>"
---

Use the **riveter-enrich** skill to run an AI enrichment for: $ARGUMENTS

Follow the skill instructions exactly — put the rows in a dataset, estimate the fill with `estimate_cost: true`, start it with `enrich` + `dataset_id`, poll until it finishes, and return the enriched rows with the dataset `id` and the run `id`.
