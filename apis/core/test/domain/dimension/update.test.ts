import type { NamedNode } from '@rdfjs/types'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import clownface, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import sinon from 'sinon'
import DatasetExt from 'rdf-ext/lib/Dataset'
import { prov, rdf, schema, sh, qudt, time } from '@tpluscode/rdf-ns-builders'
import { cc, meta, md } from '@cube-creator/core/namespace'
import { ex } from '@cube-creator/testing/lib/namespace'
import { namedNode } from '@cube-creator/testing/clownface'
import { update } from '../../../lib/domain/dimension/update'
import { TestResourceStore } from '../../support/TestResourceStore'
import '../../../lib/domain'
import * as projectQuery from '../../../lib/domain/cube-projects/queries'

describe('domain/dimension/update', function () {
  let store: TestResourceStore
  let metadataCollection: GraphPointer<NamedNode, DatasetExt>
  let findProject: sinon.SinonStub

  beforeEach(() => {
    const project = namedNode(ex('project/test'))

    metadataCollection = namedNode('dimension')
      .addOut(rdf.type, cc.DimensionMetadataCollection)
      .addOut(schema.hasPart, $rdf.namedNode('dimension/pollutant'), dimension => {
        dimension.addOut(schema.about, ex.pollutantDimension)
          .addOut(schema.name, $rdf.literal('Year', 'en'))
          .addOut(qudt.scaleType, qudt.IntervalScale)
      })
      .addOut(schema.hasPart, $rdf.namedNode('dimension/station'), dimension => {
        dimension.addOut(schema.about, ex.stationDimension)
          .addOut(schema.name, $rdf.literal('Station', 'en'))
          .addOut(qudt.scaleType, qudt.NominalScale)
          .addOut(cc.dimensionMapping, ex.stationMappingResource)
      })
    store = new TestResourceStore([
      metadataCollection,
      project,
    ])

    sinon.restore()
    findProject = sinon.stub(projectQuery, 'findProject')
  })

  it('replaces all triples about a dimension', async () => {
    // given
    const dimensionMetadata = namedNode('dimension/pollutant')
      .addOut(schema.about, ex.pollutantDimension)
      .addOut(schema.name, [
        $rdf.literal('Jahr', 'de'),
        $rdf.literal('Year', 'en'),
      ])
      .addOut(qudt.scaleType, qudt.IntervalScale)
      .addOut(schema.description, [
        $rdf.literal('Das Jahr', 'de'),
        $rdf.literal('The year', 'en'),
      ])

    // when
    const updated = await update({
      store,
      metadataCollection: metadataCollection.term,
      dimensionMetadata,
    })

    // then
    expect(updated.dataset).to.have.property('size').eq(6)
    expect(updated).to.matchShape({
      property: [{
        path: schema.about,
        hasValue: ex.pollutantDimension,
        minCount: 1,
        maxCount: 1,
      }, {
        path: qudt.scaleType,
        hasValue: qudt.IntervalScale,
        minCount: 1,
        maxCount: 1,
      }, {
        path: schema.name,
        [sh.hasValue.value]: [
          $rdf.literal('Year', 'en'),
          $rdf.literal('Jahr', 'de'),
        ],
        maxCount: 2,
        minCount: 2,
      }, {
        path: schema.description,
        [sh.hasValue.value]: [
          $rdf.literal('The year', 'en'),
          $rdf.literal('Das Jahr', 'de'),
        ],
        maxCount: 2,
        minCount: 2,
      }],
    })
  });

  [qudt.NominalScale, qudt.OrdinalScale].forEach(_scale => {
    it(`initializes a dimension mapping resource when scale of measure is set to ${_scale.value}`, async () => {
      // given
      const dimensionMetadata = namedNode('dimension/pollutant')
        .addOut(schema.about, ex.pollutantDimension)
        .addOut(qudt.scaleType, _scale)
      findProject.resolves(ex('project/test'))

      // when
      const updated = await update({
        store,
        metadataCollection: metadataCollection.term,
        dimensionMetadata,
      })
      const mappingResource = await store.get(updated.out(cc.dimensionMapping).term)

      // then
      expect(updated).to.matchShape({
        property: [{
          path: cc.dimensionMapping,
          minCount: 1,
          maxCount: 1,
          nodeKind: sh.IRI,
          pattern: 'project\\/test\\/dimension-mapping\\/pollutant-.+$',
        }],
      })
      expect(mappingResource).to.matchShape({
        property: [{
          path: rdf.type,
          hasValue: prov.Dictionary,
          minCount: 2,
          maxCount: 2,
        }, {
          path: schema.about,
          minCount: 1,
          maxCount: 1,
          hasValue: ex.pollutantDimension,
        }],
      })
    })
  })

  it('deletes the dimension mapping resource when scale of measure changes to anything but Nominal or Ordinal', async () => {
    // given
    const dimensionMetadata = namedNode('dimension/station')
      .addOut(schema.about, ex.stationDimension)
      .addOut(qudt.scaleType, qudt.IntervalScale)

    // when
    const updated = await update({
      store,
      metadataCollection: metadataCollection.term,
      dimensionMetadata,
    })
    const mappingResource = await store.get(updated.out(cc.dimensionMapping).term, { allowMissing: true })

    // then
    expect(updated).to.matchShape({
      property: [{
        path: cc.dimensionMapping,
        minCount: 0,
        maxCount: 0,
      }],
    })
    expect(mappingResource).to.be.undefined
  })

  it('deletes the dimension mapping resource when scale of measure is removed', async () => {
    // given
    const dimensionMetadata = namedNode('dimension/station')
      .addOut(schema.about, ex.stationDimension)

    // when
    const updated = await update({
      store,
      metadataCollection: metadataCollection.term,
      dimensionMetadata,
    })
    const mappingResource = await store.get(updated.out(cc.dimensionMapping).term, { allowMissing: true })

    // then
    expect(updated).to.matchShape({
      property: [{
        path: cc.dimensionMapping,
        minCount: 0,
        maxCount: 0,
      }],
    })
    expect(mappingResource).to.be.undefined
  })

  it('keeps dimension mapping resource unchanged when scale of measure does not change', async () => {
    // given
    const dimensionMetadata = namedNode('dimension/station')
      .addOut(schema.about, ex.stationDimension)
      .addOut(qudt.scaleType, qudt.NominalScale)

    // when
    const updated = await update({
      store,
      metadataCollection: metadataCollection.term,
      dimensionMetadata,
    })

    // then
    expect(updated).to.matchShape({
      property: [{
        path: cc.dimensionMapping,
        minCount: 1,
        maxCount: 1,
        hasValue: ex.stationMappingResource,
      }],
    })
  })

  it('normalizes hierarchy proxy URL to canonical IRI in schema:isBasedOn', async () => {
    // given
    const canonicalIri = 'https://ld.admin.ch/cube/dimension/hierarchy/my-hierarchy'
    const proxyUrl = `https://cube-creator.lindas.admin.ch/dimension/_hierarchy/proxy?id=${encodeURIComponent(canonicalIri)}`
    const dimensionMetadata = clownface({ dataset: $rdf.dataset() })
      .namedNode('dimension/pollutant')
      .addOut(schema.about, ex.pollutantDimension)
      .addOut(meta.inHierarchy, inHierarchy => {
        inHierarchy.addOut(schema.isBasedOn, $rdf.namedNode(proxyUrl))
      })

    // when
    const updated = await update({
      store,
      metadataCollection: metadataCollection.term,
      dimensionMetadata,
    })

    // then
    const isBasedOn = updated.out(meta.inHierarchy).out(schema.isBasedOn).value
    expect(isBasedOn).to.eq(canonicalIri)
  })

  it('normalizes direct managed-dimensions hierarchy IRIs to canonical IRIs', async () => {
    // given
    const directIri = 'https://cube-creator.lindas.admin.ch/dimension/hierarchy/my-hierarchy'
    const dimensionMetadata = clownface({ dataset: $rdf.dataset() })
      .namedNode('dimension/pollutant')
      .addOut(schema.about, ex.pollutantDimension)
      .addOut(meta.inHierarchy, inHierarchy => {
        inHierarchy.addOut(schema.isBasedOn, $rdf.namedNode(directIri))
      })

    // when
    const updated = await update({
      store,
      metadataCollection: metadataCollection.term,
      dimensionMetadata,
    })

    // then
    const isBasedOn = updated.out(meta.inHierarchy).out(schema.isBasedOn).value
    expect(isBasedOn).to.eq('https://ld.admin.ch/cube/dimension/hierarchy/my-hierarchy')
  })

  it('normalizes copied hierarchy references throughout the hierarchy subgraph', async () => {
    // given
    const dimensionMetadata = clownface({ dataset: $rdf.dataset() })
      .namedNode('dimension/pollutant')
      .addOut(schema.about, ex.pollutantDimension)
      .addOut(meta.inHierarchy, inHierarchy => {
        inHierarchy
          .addOut(schema.isBasedOn, $rdf.namedNode('https://cube-creator.lindas.admin.ch/dimension/hierarchy/my-hierarchy'))
          .addOut(md.sharedDimension, $rdf.namedNode('https://cube-creator.lindas.admin.ch/dimension/my-dimension'))
          .addOut(meta.hierarchyRoot, $rdf.namedNode('https://cube-creator.lindas.admin.ch/dimension/my-dimension/root'))
          .addOut(meta.nextInHierarchy, nextInHierarchy => {
            nextInHierarchy.addOut(sh.path, $rdf.namedNode('https://cube-creator.lindas.admin.ch/dimension/my-dimension/child'))
          })
      })

    // when
    const updated = await update({
      store,
      metadataCollection: metadataCollection.term,
      dimensionMetadata,
    })

    // then
    const hierarchy = updated.out(meta.inHierarchy)
    expect(hierarchy.out(schema.isBasedOn).value).to.eq('https://ld.admin.ch/cube/dimension/hierarchy/my-hierarchy')
    expect(hierarchy.out(md.sharedDimension).value).to.eq('https://ld.admin.ch/cube/dimension/my-dimension')
    expect(hierarchy.out(meta.hierarchyRoot).value).to.eq('https://ld.admin.ch/cube/dimension/my-dimension/root')
    expect(hierarchy.out(meta.nextInHierarchy).out(sh.path).value).to.eq('https://ld.admin.ch/cube/dimension/my-dimension/child')
  })

  it('replaces child blank nodes recursively', async () => {
    // given
    const dimensionMetadata = clownface({ dataset: $rdf.dataset() })
      .namedNode('dimension')
      .addOut(schema.about, ex.pollutantDimension)
      .addOut(meta.dataKind, dataKind => {
        dataKind.addOut(rdf.type, time.GeneralDateTimeDescription)
        dataKind.addOut(time.unitType, unitType => {
          unitType.addOut(rdf.type, time.Year)
        })
      })

    // when
    const updated = await update({
      store,
      metadataCollection: metadataCollection.term,
      dimensionMetadata,
    })

    // then
    expect(updated).to.matchShape({
      property: [{
        path: schema.about,
      }, {
        path: meta.dataKind,
        node: {
          property: [{
            path: rdf.type,
            hasValue: time.GeneralDateTimeDescription,
            minCount: 1,
            maxCount: 1,
          }, {
            path: time.unitType,
            node: {
              property: {
                path: rdf.type,
                hasValue: time.Year,
                minCount: 1,
                maxCount: 1,
              },
            },
          }],
        },
      }],
    })
  })
})
