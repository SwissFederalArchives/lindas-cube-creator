/* eslint-disable no-template-curly-in-string */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { prepare, appendProfile } from './index.mjs'

const source = 'export const organizations = turtle`\n<organizations> {}\n`\n'
const inputs = {
  TERMDAT_ID: '3076',
  NAMESPACE: 'https://example.org/health/foph/',
  PUBLISH_GRAPH: 'https://lindas.admin.ch/foph/cube',
  OBSERVED_BY: 'https://ld.admin.ch/office/II.1.6'
}
const triple = '<urn:cube-creator:publishing-profile> <http://www.w3.org/2000/01/rdf-schema#label> "Bundesamt für Gesundheit"@de .\n'

test('appends CONSTRUCT output while preserving existing content and rejecting duplicate profiles', () => {
  const { id, bindings } = prepare(source, inputs)
  assert.equal(id, 'foph')
  assert.ok(bindings.includes('<https://example.org/health/foph/>'))
  assert.ok(bindings.includes('<https://example.org/.well-known/void>'))
  const updated = appendProfile(source, triple, id)
  assert.ok(updated.startsWith(source.slice(0, source.lastIndexOf('`'))))
  assert.ok(updated.includes('<organization/foph> {'))
  assert.ok(updated.includes('    ${rdfs.label} "Bundesamt für Gesundheit"@de ;'))
  assert.throws(() => prepare(updated, inputs), /already uses/)
})

test('rejects empty results and invalid publishing inputs', () => {
  assert.throws(() => appendProfile(source, '', 'foph'), /validated/)
  for (const override of [
    { TERMDAT_ID: '3076> }' },
    { NAMESPACE: 'https://example.org/Bad/' },
    { NAMESPACE: 'https://example.org/' },
    { NAMESPACE: 'https://example.org/no-delimiter' },
    { PUBLISH_GRAPH: 'https://example.org/${bad}' },
    { OBSERVED_BY: 'https://register.ld.admin.ch/termdat/3076' }
  ]) assert.throws(() => prepare(source, { ...inputs, ...override }))
})

test('preserves serialized RDF through the JS template without evaluating names', () => {
  const name = 'Office "quoted" \\ newline\n tab\t ` ${throwIfExecuted()} $& $` $\' $$'
  const rdf = `<urn:cube-creator:publishing-profile> <http://www.w3.org/2000/01/rdf-schema#label> ${JSON.stringify(name)}@fr .\n`
  const updated = appendProfile(source, rdf, 'foph')
  const evaluated = runInNewContext(updated.replace('export const', 'const') + '\norganizations', {
    turtle: (strings, ...values) => strings.reduce((result, text, i) => result + text + (values[i] || ''), ''),
    rdfs: { label: 'label' }
  })
  assert.ok(evaluated.includes(`${JSON.stringify(name)}@fr ;`))
})
