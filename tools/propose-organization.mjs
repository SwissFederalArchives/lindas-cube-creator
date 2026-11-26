import { readFile, writeFile, appendFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const subject = '<urn:cube-creator:publishing-profile>'
const closing = /\n`\s*$/

function iri (value, field) {
  if (!value || /[\s<>"{}|^`\\$]/u.test(value) || !/^https?:\/\//.test(value)) {
    throw new Error(`${field} must be an absolute HTTP(S) IRI`)
  }
  if (!new URL(value).hostname) throw new Error(`${field} must include a hostname`)
  return value
}

export function prepare (source, inputs) {
  if (!/^[1-9][0-9]*$/.test(inputs.TERMDAT_ID || '')) throw new Error('TERMDAT_ID must be a positive entry number')
  const namespace = iri(inputs.NAMESPACE, 'NAMESPACE')
  const graph = iri(inputs.PUBLISH_GRAPH, 'PUBLISH_GRAPH')
  const observer = iri(inputs.OBSERVED_BY, 'OBSERVED_BY')
  const url = new URL(namespace)
  const id = url.pathname.split('/').filter(Boolean).at(-1)
  if (!/[/#]$/.test(namespace) || !/^[a-z][a-z0-9-]*$/.test(id || '')) {
    throw new Error('NAMESPACE must end in / or # and have a lowercase profile ID as its last path segment')
  }
  if (observer.startsWith('https://register.ld.admin.ch/termdat/')) throw new Error('OBSERVED_BY must identify an organisation, not a TERMDAT concept')
  for (const value of [`<organization/${id}>`, `<${namespace}>`, `<${graph}>`, `<${observer}>`]) {
    if (source.includes(value)) throw new Error(`Publishing profile already uses ${value}`)
  }
  const query = `PREFIX schema: <http://schema.org/>
PREFIX cc: <https://cube-creator.zazuko.com/vocab#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
CONSTRUCT {
  ${subject} a schema:Organization ;
    cc:publishGraph <${graph}> ;
    cc:namespace <${namespace}> ;
    schema:dataset <${url.origin}/.well-known/void> ;
    rdfs:label ?name ;
    <http://www.w3.org/ns/dcat#accessURL> <${url.origin}/sparql> ;
    <http://rdfs.org/ns/void#sparqlEndpoint> <${url.origin}/query> ;
    <https://cube.link/observedBy> <${observer}> .
} WHERE {
  GRAPH <https://lindas.admin.ch/fch/termdat> {
    VALUES ?entry { <https://register.ld.admin.ch/termdat/${inputs.TERMDAT_ID}> }
    ?entry a <https://schema.ld.admin.ch/Name>, <https://schema.ld.admin.ch/ValidatedEntry> ; schema:name ?name .
    FILTER NOT EXISTS { ?entry a <https://version.link/Deprecated> }
    FILTER (LANG(?name) IN ("de", "fr", "it", "en", "rm"))
  }
}`
  return { id, query }
}

export function appendProfile (source, triples, id) {
  if (!triples.trim()) throw new Error('No validated, non-deprecated TERMDAT names found in supported languages')
  if (!closing.test(source)) throw new Error('Cannot find organizations template closing delimiter')
  // Convert the temporary CONSTRUCT subject to the API-relative organisation IRI.
  const relative = triples.trim().split('\n').sort().map(line => line.replace(subject + ' ', `<organization/${id}> `)).join('\n')
  const block = `<organization/${id}> {\n${relative}\n}`
  // RDF is already serialized by LINDAS; escape only the enclosing JS template.
  const escaped = block.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
  return source.replace(closing, () => `\n${escaped}\n\n\`\n`)
}

async function main () {
  const file = process.argv[2] || 'apis/core/bootstrap/organizations.ts'
  const source = await readFile(file, 'utf8')
  const { id, query } = prepare(source, process.env)
  const endpoint = new URL('https://lindas.admin.ch/query')
  endpoint.searchParams.set('query', query)
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/n-triples' },
    signal: AbortSignal.timeout(30000)
  })
  if (!response.ok) throw new Error(`LINDAS query failed: HTTP ${response.status}`)
  const updated = appendProfile(source, await response.text(), id)
  const bodyPath = join(process.env.RUNNER_TEMP || tmpdir(), 'organization-proposal.md')
  await writeFile(bodyPath, `Add publishing profile \`${id}\` using [TERMDAT entry ${process.env.TERMDAT_ID}](https://www.termdat.bk.admin.ch/entry/${process.env.TERMDAT_ID}).\n\nThe profile was constructed from validated TERMDAT names on LINDAS production and the supplied publishing settings. Review the translations, organisation identity, graph permissions and public routing before merging.\n`)
  await writeFile(file, updated)
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `profile_id=${id}\n`)
  console.log(`Generated ${id} in ${file}; PR description: ${bodyPath}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
