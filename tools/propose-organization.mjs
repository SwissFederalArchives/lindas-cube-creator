import { readFile, writeFile, appendFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

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
  const names = new Map()
  for (const { name } of bindings) {
    const lang = name['xml:lang']
    if (!languages.includes(lang)) continue
    if (!name.value.trim() || (names.has(lang) && names.get(lang) !== name.value)) {
      throw new Error(`Empty or ambiguous TERMDAT name for ${lang}`)
    }
    names.set(lang, name.value)
  }
  if (!names.size) throw new Error('No validated, non-deprecated TERMDAT names found in supported languages')
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
  const body = `Add publishing profile \`${id}\` using [TERMDAT entry ${inputs.TERMDAT_ID}](https://www.termdat.bk.admin.ch/entry/${inputs.TERMDAT_ID}) from LINDAS production.

TERMDAT modification date: ${bindings[0]?.modified?.value || 'not provided'}.
Missing languages: ${missing.join(', ') || 'none'}.

Publishing settings are supplied by the operator. Review the generated profile,
organisation identity, graph permissions and public routing before merging.
`
  return { id, source: source.replace(/\n`\s*$/, () => `\n${block}\n\`\n`), body }
}

async function main () {
  const inputs = process.env
  if (!/^[1-9][0-9]*$/.test(inputs.TERMDAT_ID || '')) throw new Error('TERMDAT_ID must be a positive entry number')
  const endpoint = new URL('https://lindas.admin.ch/query')
  endpoint.searchParams.set('query', `PREFIX schema: <http://schema.org/>
    PREFIX lindas: <https://schema.ld.admin.ch/>
    SELECT ?name ?modified WHERE {
      GRAPH <https://lindas.admin.ch/fch/termdat> {
        VALUES ?entry { <https://register.ld.admin.ch/termdat/${inputs.TERMDAT_ID}> }
        ?entry a lindas:Name, lindas:ValidatedEntry ; schema:name ?name .
        FILTER NOT EXISTS { ?entry a <https://version.link/Deprecated> }
        OPTIONAL { ?entry schema:dateModified ?modified }
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
