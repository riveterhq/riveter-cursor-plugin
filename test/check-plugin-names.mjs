#!/usr/bin/env node
// Fails when the plugin's prose names a tool, argument, field, or help topic
// that public/api_docs/openapi.yaml does not define (docs/cli-plan.md check 5).
// The plugin is hand-written text; this is what keeps it from drifting the way
// it did with `dry_run`.
//
// Checked, in every .md / .mdc under rules/, skills/, commands/:
//   - `mcp(riveter:<tool>)` in a skill's allowed-tools: the tool must exist;
//   - a code block of the form `tool_name({ ... })`: tool_name must exist and
//     every top-level key of the object must be one of its arguments;
//   - every backticked snake_case token (`estimate_cost`, `credit_detail`,
//     `datasets_vs_enrichment`): it must be a tool name, an argument name, a
//     schema property, an enum value, a help topic, or a token the spec itself
//     writes in backticks;
//   - DEPRECATED_NAMES never appear, even though the spec still mentions them.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

// Usage: node test/check-plugin-names.mjs [plugin-dir] — the directory
// defaults to this plugin; pass another to check an installed copy.
const thisPluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = process.argv[2] ?? thisPluginRoot;
const specText = await readSpecText();
const spec = parseYaml(specText);

// In the monorepo the spec is next door; in the public mirror
// (riveterhq/riveter-cursor-plugin) it is only online.
async function readSpecText() {
  const monorepoSpecPath = join(thisPluginRoot, "..", "public", "api_docs", "openapi.yaml");
  if (existsSync(monorepoSpecPath)) return readFileSync(monorepoSpecPath, "utf8");
  const publishedSpecUrl = process.env.RIVETER_OPENAPI_URL ?? "https://docs.riveterhq.com/openapi.yaml";
  const response = await fetch(publishedSpecUrl);
  if (!response.ok) throw new Error(`could not fetch the spec from ${publishedSpecUrl}: HTTP ${response.status}`);
  return response.text();
}

const DEPRECATED_NAMES = ["dry_run"];
const SNAKE_TOKEN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;

// --- the spec's vocabulary ---------------------------------------------------

const toSnakeCase = (operationId) => operationId.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

function resolveSchema(schema) {
  if (!schema?.$ref) return schema;
  const name = schema.$ref.split("/").pop();
  return resolveSchema(spec.components.schemas[name]);
}

function topLevelPropertyNames(schema, out = new Set()) {
  const resolved = resolveSchema(schema);
  if (!resolved) return out;
  for (const name of Object.keys(resolved.properties ?? {})) out.add(name);
  for (const member of [...(resolved.allOf ?? []), ...(resolved.oneOf ?? []), ...(resolved.anyOf ?? [])]) {
    topLevelPropertyNames(member, out);
  }
  return out;
}

// Path-level parameters are inherited by every operation on the path, as the
// MCP parser does.
function argumentNames(pathItem, operation) {
  const names = new Set();
  for (const parameter of [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]) {
    const resolved = parameter.$ref ? spec.components.parameters[parameter.$ref.split("/").pop()] : parameter;
    if (resolved?.name) names.add(resolved.name);
  }
  for (const content of Object.values(operation.requestBody?.content ?? {})) {
    for (const name of topLevelPropertyNames(content.schema)) names.add(name);
  }
  return names;
}

function toolCatalog() {
  const tools = new Map();
  for (const pathItem of Object.values(spec.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (operation?.operationId) tools.set(toSnakeCase(operation.operationId), argumentNames(pathItem, operation));
    }
  }
  tools.set("help", new Set(["topic"]));
  return tools;
}

function collectStrings(value, out) {
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "properties" && child && typeof child === "object") {
        for (const name of Object.keys(child)) out.add(name);
      }
      if (key === "enum" && Array.isArray(child)) {
        for (const item of child) if (typeof item === "string") out.add(item);
      }
      collectStrings(child, out);
    }
  }
}

function specVocabulary(tools) {
  const words = new Set();
  for (const [tool, args] of tools) {
    words.add(tool);
    for (const arg of args) words.add(arg);
  }
  collectStrings(spec.components, words);
  collectStrings(spec.paths, words);
  for (const topic of Object.keys(spec.info["x-mcp-help"] ?? {})) words.add(topic);
  for (const match of specText.matchAll(/`([a-z][a-z0-9_]*)`/g)) words.add(match[1]);
  for (const name of DEPRECATED_NAMES) words.delete(name);
  return words;
}

// --- the plugin's text -------------------------------------------------------

function markdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if ([".md", ".mdc"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

function allowedToolReferences(text) {
  return [...text.matchAll(/mcp\(riveter:([a-z0-9_]+)\)/g)].map((match) => match[1]);
}

function backtickedTokens(text) {
  const tokens = new Set();
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    const token = match[1];
    if (SNAKE_TOKEN.test(token)) tokens.add(token);
  }
  return tokens;
}

// Walks a `tool_name(...)` call from its opening parenthesis to the matching
// close, skipping string contents, and returns the top-level keys of the
// argument object (depth 1 inside the call), so nested data keys are not checked.
function callArgumentKeys(text, openParenIndex) {
  const keys = [];
  let depth = 0;
  for (let i = openParenIndex; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      const end = text.indexOf('"', i + 1);
      if (end === -1) return { keys, end: text.length };
      const rest = text.slice(end + 1).trimStart();
      if (depth === 2 && rest.startsWith(":")) keys.push(text.slice(i + 1, end));
      i = end;
      continue;
    }
    if ("({[".includes(char)) depth++;
    if (")}]".includes(char)) depth--;
    if (depth === 0) return { keys, end: i };
  }
  return { keys, end: text.length };
}

function toolCallBlocks(text) {
  const calls = [];
  for (const block of text.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
    const body = block[1];
    let cursor = 0;
    for (const call of body.matchAll(/^([a-z][a-z0-9_]*)\(/gm)) {
      if (call.index < cursor) continue;
      const parsed = callArgumentKeys(body, call.index + call[0].length - 1);
      calls.push({ tool: call[1], keys: parsed.keys });
      cursor = parsed.end;
    }
  }
  return calls;
}

// --- the check ---------------------------------------------------------------

function checkFile(path, tools, vocabulary) {
  const text = readFileSync(path, "utf8");
  const problems = [];
  for (const tool of allowedToolReferences(text)) {
    if (!tools.has(tool)) problems.push(`allowed-tools names an unknown tool: ${tool}`);
  }
  for (const call of toolCallBlocks(text)) {
    const args = tools.get(call.tool);
    if (!args) {
      problems.push(`code block calls an unknown tool: ${call.tool}`);
      continue;
    }
    for (const key of call.keys) {
      if (!args.has(key)) problems.push(`${call.tool}(...) sends an argument it does not take: ${key}`);
    }
  }
  for (const token of backtickedTokens(text)) {
    if (!vocabulary.has(token)) problems.push(`\`${token}\` is not in the spec`);
  }
  for (const name of DEPRECATED_NAMES) {
    if (new RegExp(`\\b${name}\\b`).test(text)) problems.push(`uses the deprecated name ${name}`);
  }
  return problems;
}

const tools = toolCatalog();
const vocabulary = specVocabulary(tools);
let failed = false;
let checkedFiles = 0;
for (const dir of ["rules", "skills", "commands"]) {
  for (const path of markdownFiles(join(pluginRoot, dir))) {
    checkedFiles++;
    const problems = checkFile(path, tools, vocabulary);
    if (problems.length === 0) continue;
    failed = true;
    console.error(relative(pluginRoot, path));
    for (const problem of problems) console.error(`  - ${problem}`);
  }
}
if (!failed) console.log(`cursor-plugin: ${checkedFiles} files name only tools, arguments, fields, and topics the spec defines (${tools.size} tools)`);
process.exit(failed ? 1 : 0);
