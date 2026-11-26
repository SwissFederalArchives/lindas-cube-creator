/* eslint-disable no-template-curly-in-string */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { propose } from './propose-organization.mjs'

const source = 'export const organizations = turtle`\n<organizations> {}\n`\n'
const inputs = {
  TERMDAT_ID: '3076',
  NAMESPACE: 'https://example.org/health/foph/',
  PUBLISH_GRAPH: 'https://lindas.admin.ch/foph/cube',
  OBSERVED_BY: 'https://ld.admin.ch/office/II.1.6'
}
const row = (value, lang) => ({ name: { value, 'xml:lang': lang } })
const bindings = [
  row('Bundesamt für Gesundheit', 'de'),
  row('Federal Office of Public Health', 'en')
]

test('adds names and derived publishing settings while preserving existing content', () => {
  const result = propose(source, bindings, inputs)
  assert.equal(result.id, 'foph')
  assert.ok(result.source.startsWith(source.slice(0, source.lastIndexOf('`'))))
  assert.ok(result.source.includes('${rdfs.label} "Bundesamt für Gesundheit"@de'))
  assert.ok(result.source.includes('${rdfs.label} "Federal Office of Public Health"@en'))
  assert.ok(result.source.includes('<https://example.org/.well-known/void>'))
  assert.ok(result.source.includes('${_void.sparqlEndpoint} <https://example.org/query>'))
  assert.ok(result.source.includes(`<${inputs.PUBLISH_GRAPH}>`))
  assert.ok(result.source.includes(`<${inputs.OBSERVED_BY}>`))
  assert.ok(result.body.includes('Missing languages: fr, it, rm'))
  assert.ok(result.body.includes('/entry/3076'))
  assert.throws(() => propose(result.source, bindings, inputs), /already uses/)
})

test('rejects unusable entries and invalid publishing inputs', () => {
  assert.throws(() => propose(source, [], inputs), /validated/)
  assert.throws(() => propose(source, [...bindings, row('Another name', 'de')], inputs), /ambiguous/)
  for (const override of [
    { NAMESPACE: 'https://example.org/Bad/' },
    { NAMESPACE: 'https://example.org/' },
    { NAMESPACE: 'https://example.org/no-delimiter' },
    { PUBLISH_GRAPH: 'https://example.org/${bad}' },
    { OBSERVED_BY: 'https://register.ld.admin.ch/termdat/3076' }
  ]) assert.throws(() => propose(source, bindings, { ...inputs, ...override }))
})

test('preserves RDF escaping through the TypeScript template without evaluating names', () => {
  const name = 'Office "quoted" \\ newline\n tab\t ` ${throwIfExecuted()} $& $` $\' $$'
  const result = propose(source, [...bindings, row(name, 'fr')], inputs)
  const label = result.source.split('\n').find(line => line.endsWith('@fr ;')).trim()
  const evaluated = runInNewContext('`' + label + '`', { rdfs: { label: 'label' } })
  assert.equal(evaluated, `label ${JSON.stringify(name)}@fr ;`)
})
