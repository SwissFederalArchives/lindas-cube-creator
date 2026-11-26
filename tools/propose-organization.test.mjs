/* eslint-disable no-template-curly-in-string */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { propose } from './propose-organization.mjs'

const source = readFileSync(new URL('../apis/core/bootstrap/organizations.ts', import.meta.url), 'utf8')
const inputs = {
  TERMDAT_ID: '3076',
  NAMESPACE: 'https://health.ld.admin.ch/foph/',
  PUBLISH_GRAPH: 'https://lindas.admin.ch/foph/cube',
  OBSERVED_BY: 'https://ld.admin.ch/office/II.1.6'
}
const row = (p, value, lang) => ({ p: { value: p }, o: { value, ...(lang ? { 'xml:lang': lang } : {}) } })
const type = value => row('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', value)
const bindings = [
  type('https://schema.ld.admin.ch/Name'),
  type('https://schema.ld.admin.ch/ValidatedEntry'),
  row('http://schema.org/name', 'Bundesamt für Gesundheit', 'de'),
  row('http://schema.org/name', 'Federal Office of Public Health', 'en'),
  row('http://schema.org/alternateName', 'FOPH', 'en')
]

test('copies names, derives defaults, and preserves existing profiles', () => {
  const result = propose(source, bindings, inputs)
  assert.equal(result.id, 'foph')
  assert.ok(result.source.startsWith(source.slice(0, source.lastIndexOf('`'))))
  assert.ok(result.source.includes('${rdfs.label} "Bundesamt für Gesundheit"@de'))
  assert.ok(result.source.includes('${_void.sparqlEndpoint} <https://health.ld.admin.ch/query>'))
  assert.ok(result.body.includes('Missing languages: fr, it, rm'))
  assert.ok(result.body.includes('/entry/3076'))
})

test('derives the profile ID and service base from the namespace', () => {
  const result = propose(source, bindings, { ...inputs, NAMESPACE: 'https://example.org/health/bag/' })
  assert.equal(result.id, 'bag')
  assert.ok(result.source.includes('<https://example.org/.well-known/void>'))
})

test('rejects missing, unvalidated, deprecated and ambiguous entries', () => {
  assert.throws(() => propose(source, [], inputs), /validated/)
  assert.throws(() => propose(source, bindings.filter(row => !row.o.value.endsWith('ValidatedEntry')), inputs), /validated/)
  assert.throws(() => propose(source, [...bindings, type('https://version.link/Deprecated')], inputs), /validated/)
  assert.throws(() => propose(source, [...bindings, row('http://schema.org/name', 'Another name', 'de')], inputs), /ambiguous/)
  assert.throws(() => propose(source, bindings.filter(row => row.p.value !== 'http://schema.org/name'), inputs), /no supported/)
})

test('does not require an English abbreviation', () => {
  const noAbbreviation = bindings.filter(row => row.p.value !== 'http://schema.org/alternateName')
  assert.equal(propose(source, noAbbreviation, inputs).id, 'foph')
})

test('rejects duplicate profile IDs, namespaces, graphs and observers', () => {
  for (const override of [
    { NAMESPACE: 'https://example.org/bafu/' },
    { NAMESPACE: 'https://environment.ld.admin.ch/foen/' },
    { PUBLISH_GRAPH: 'https://lindas.admin.ch/foen/cube' },
    { OBSERVED_BY: 'https://ld.admin.ch/office/VII.1.7' }
  ]) assert.throws(() => propose(source, bindings, { ...inputs, ...override }), /already uses/)
})

test('rejects invalid identifiers, template injection and concept observers', () => {
  for (const override of [
    { NAMESPACE: 'https://example.org/Bad/' },
    { NAMESPACE: 'https://example.org/' },
    { NAMESPACE: 'https://example.org/no-delimiter' },
    { PUBLISH_GRAPH: 'https://example.org/${bad}' },
    { OBSERVED_BY: 'https://register.ld.admin.ch/termdat/3076' },
    { NAMESPACE: 'https://example.org/${bad}/' }
  ]) assert.throws(() => propose(source, bindings, { ...inputs, ...override }))
})

test('preserves RDF escaping through the TypeScript template without executing names', () => {
  const name = 'Office "quoted" \\ newline\n tab\t ` ${throwIfExecuted()} $& $` $\' $$'
  const result = propose(source, [...bindings, row('http://schema.org/name', name, 'fr')], inputs)
  const ns = base => new Proxy({}, { get: (_, key) => `<${base}${key}>` })
  const turtle = (strings, ...values) => strings.reduce((text, part, i) => text + part + (values[i] || ''), '')
  const evaluated = runInNewContext(result.source.replace(/^import .*\n/gm, '').replace('export const', 'const') + '\norganizations', {
    turtle,
    schema: ns('http://schema.org/'),
    rdfs: ns('http://www.w3.org/2000/01/rdf-schema#'),
    rdf: ns('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
    hydra: ns('http://www.w3.org/ns/hydra/core#'),
    dcat: ns('http://www.w3.org/ns/dcat#'),
    _void: ns('http://rdfs.org/ns/void#'),
    cc: ns('https://cube-creator.zazuko.com/vocab#'),
    cube: ns('https://cube.link/')
  })
  assert.ok(evaluated.includes(`${JSON.stringify(name)}@fr`))
})
