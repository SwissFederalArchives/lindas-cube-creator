import { readFile, writeFile, appendFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const schema = 'http://schema.org/'
const lindas = 'https://schema.ld.admin.ch/'
const type = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const languages = ['de', 'fr', 'it', 'en', 'rm']

function iri (value, field) {
  if (!value || /[\s<>"{}|^`\\$]/u.test(value) || !/^https?:\/\//.test(value)) {
    throw new Error(`${field} must be an absolute HTTP(S) IRI`)
  }
  if (!new URL(value).hostname) throw new Error(`${field} must include a hostname`)
  return value
}

// Escape both the RDF literal and the enclosing TypeScript template literal.
function literal (value) {
  return JSON.stringify(value).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

export function propose (source, bindings, inputs) {
  const values = predicate => bindings.filter(row => row.p.value === predicate).map(row => row.o)
  const types = values(type).map(term => term.value)
  if (!types.includes(lindas + 'Name') || !types.includes(lindas + 'ValidatedEntry') ||
      types.includes('https://version.link/Deprecated')) {
    throw new Error('TERMDAT entry must be a validated, non-deprecated Name entry')
  }
  const names = new Map()
  for (const term of values(schema + 'name')) {
    const lang = term['xml:lang']
    if (!languages.includes(lang)) continue
    if (!term.value.trim() || (names.has(lang) && names.get(lang) !== term.value)) {
      throw new Error(`Empty or ambiguous TERMDAT name for ${lang}`)
    }
    names.set(lang, term.value)
  }
  if (!names.size) throw new Error('TERMDAT entry has no supported language names')
  const namespace = iri(inputs.NAMESPACE, 'NAMESPACE')
  if (!namespace.endsWith('/') && !namespace.endsWith('#')) {
    throw new Error('NAMESPACE must end with / or #')
  }
  const namespaceUrl = new URL(namespace)
  const id = namespaceUrl.pathname.split('/').filter(Boolean).at(-1)
  if (!/^[a-z][a-z0-9-]*$/.test(id || '')) {
    throw new Error('The last NAMESPACE path segment must use lowercase letters, digits and hyphens')
  }
  const graph = iri(inputs.PUBLISH_GRAPH, 'PUBLISH_GRAPH')
  const observer = iri(inputs.OBSERVED_BY, 'OBSERVED_BY')
  if (observer.startsWith('https://register.ld.admin.ch/termdat/')) {
    throw new Error('OBSERVED_BY must identify the organisation, not its TERMDAT concept')
  }
  const service = namespaceUrl.origin
  for (const value of [`<organization/${id}>`, `<${namespace}>`, `<${graph}>`, `<${observer}>`]) {
    if (source.includes(value)) throw new Error(`Publishing profile already uses ${value}`)
  }
  if (!/\n`\s*$/.test(source)) throw new Error('Cannot find organizations template closing delimiter')
  const labels = languages.filter(lang => names.has(lang))
    .map(lang => `    \${rdfs.label} ${literal(names.get(lang))}@${lang} ;`).join('\n')
  const block = `<organization/${id}> {
  <organization/${id}>
    a \${schema.Organization} ;
    \${cc.publishGraph} <${graph}> ;
    \${cc.namespace} <${namespace}> ;
    \${schema.dataset} <${service}/.well-known/void> ;
${labels}
    \${dcat.accessURL} <${service}/sparql> ;
    \${_void.sparqlEndpoint} <${service}/query> ;
    \${cube.observedBy} <${observer}> ;
  .
}
`
  const missing = languages.filter(lang => !names.has(lang))
  const body = `Add publishing profile \`${id}\` using [TERMDAT entry ${inputs.TERMDAT_ID}](https://www.termdat.bk.admin.ch/entry/${inputs.TERMDAT_ID}).

Names copied from the validated entry in the LINDAS production graph \`https://lindas.admin.ch/fch/termdat\`.
TERMDAT modification date: ${values(schema + 'dateModified')[0]?.value || 'not provided'}.
Languages included: ${[...names.keys()].join(', ')}. Missing languages: ${missing.join(', ') || 'none'}.

| Publishing setting | Value |
| --- | --- |
| Namespace | ${namespace} |
| Publishing graph | ${graph} |
| Observed by | ${observer} |
| Public service base | ${service} |

Publishing settings were supplied by the operator; endpoints and dataset URL follow the existing profile convention.
Review the organisation identity, graph permissions and public routing before merging. This proposal does not provision infrastructure.
`
  return { id, source: source.replace(/\n`\s*$/, () => `\n${block}\n\`\n`), body }
}

async function main () {
  const inputs = process.env
  if (!/^[1-9][0-9]*$/.test(inputs.TERMDAT_ID || '')) throw new Error('TERMDAT_ID must be a positive entry number')
  const endpoint = new URL('https://lindas.admin.ch/query')
  endpoint.searchParams.set('query', `SELECT ?p ?o WHERE {
    GRAPH <https://lindas.admin.ch/fch/termdat> {
      <https://register.ld.admin.ch/termdat/${inputs.TERMDAT_ID}> ?p ?o
    }
  }`)
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/sparql-results+json' },
    signal: AbortSignal.timeout(30000)
  })
  if (!response.ok) throw new Error(`LINDAS query failed: HTTP ${response.status}`)
  const { results: { bindings } } = await response.json()
  const file = process.argv[2] || 'apis/core/bootstrap/organizations.ts'
  const result = propose(await readFile(file, 'utf8'), bindings, inputs)
  const bodyPath = join(inputs.RUNNER_TEMP || tmpdir(), 'organization-proposal.md')
  await writeFile(bodyPath, result.body)
  await writeFile(file, result.source)
  if (inputs.GITHUB_OUTPUT) await appendFile(inputs.GITHUB_OUTPUT, `profile_id=${result.id}\n`)
  console.log(`Generated ${result.id} in ${file}; PR description: ${bodyPath}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
