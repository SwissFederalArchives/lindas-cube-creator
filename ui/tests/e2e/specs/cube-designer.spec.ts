import slugify from 'slugify'
import { nanoid } from 'nanoid'

describe('Cube designer', () => {
  let sharedDimensionName: string
  let projectIdentifier: string

  before(() => {
    sharedDimensionName = `Test Dimension ${random()}`
    projectIdentifier = `test-project-${nanoid()}`

    cy.visit('/')

    cy.contains('a', 'Shared Dimensions').click()
    cy.contains('.button', 'Create shared dimension').click()

    cy.get('.quickview').contains('form-property', 'Identifier')
      .find('input')
      .type(toIdentifier(sharedDimensionName))

    cy.get('.quickview').contains('form-property', 'Name')
      .find('input')
      .type(sharedDimensionName)

    cy.get('.quickview').contains('form-property', 'Name')
      .find('select')
      .select('en')

    cy.contains('button', 'Create').click()
    cy.contains('successfully created').should('be.visible')

    const termName = `Test Term ${random()}`
    cy.contains('.button', 'Add term').click()

    cy.contains('form-property', 'Identifier')
      .find('input')
      .type(toIdentifier(termName))

    cy.contains('form-property', 'Name')
      .find('input')
      .type(termName)

    cy.contains('form-property', 'Name')
      .find('select')
      .select('en')

    cy.contains('button', 'Create').click()
    cy.contains('successfully created').should('be.visible')

    cy.visit('/')
    cy.contains('a', 'Cube Projects').click()
    cy.contains('.button', 'New project').click()

    cy.contains('form-property', 'Project name')
      .find('input')
      .type('Test Project for Cube Designer')

    cy.get('form-property').contains('Publishing profile')
      .find('sl-select')
      .click()

    cy.get('sl-menu-item').first().click()

    cy.contains('form-property', 'Cube identifier')
      .find('input')
      .type(projectIdentifier)

    cy.get('div.quickview-body form').submit()
    cy.contains('successfully created').should('be.visible')

    cy.contains('1. CSV Mapping').click()
    cy.get('[data-testid="upload-source"]').click()
    cy.contains('browse files').click()

    cy.fixture('test.csv').then(fileContent => {
      cy.get('input[type="file"]').attachFile({
        fileContent: fileContent.toString(),
        filePath: 'test.csv',
        mimeType: 'text/csv',
      })
    })

    cy.contains('Upload 1 file').click()
    cy.contains('Done').click()
    cy.contains('uploaded').should('be.visible')
    cy.reload()

    cy.contains('column1').click()
    cy.contains('.button', 'Create table from selected columns').click()

    cy.contains('form-property', 'Table name')
      .find('input')
      .type('Test Table')

    cy.contains('.label', 'Cube table')
      .siblings('form-object')
      .find('cc-checkbox')
      .should('be.visible')
      .click()

    cy.get('form').submit()
    cy.contains('Cube: Test Table').should('be.visible')

    cy.contains('2. Cube Metadata').click()
  })

  after(() => {
    cy.visit('/')
    cy.contains('a', 'Cube Projects').click()
    cy.contains('Test Project for Cube Designer').click()
    cy.contains('Delete Project').click()
    cy.contains('Are you sure').should('be.visible')
    cy.get('.modal').contains('button', 'Delete').click({ force: true })
    cy.contains('successfully deleted').should('be.visible')

    cy.visit('/')
    cy.contains('a', 'Shared Dimensions').click()
    cy.contains(sharedDimensionName).click()
    cy.contains('button', 'Delete').click()
    cy.get('.modal').contains('button', 'Delete').click({ force: true })
    cy.contains('successfully deleted').should('be.visible')
  })

  describe('Auto-mapping dimension', () => {
    it('Opens Dimension mapping panel', () => {
      cy.get('[data-testid=dimension-row]').first().within(() => {
        cy.get('[data-testid=edit-dimension]').click()
      })

      cy.contains('h2', 'Update mappings').should('be.visible')
    })

    it('Starts auto-mapping', () => {
      cy.contains('button', 'Auto-fill')
        .click()

      cy.contains('h2', 'Map terms from a Shared Dimension')
    })

    it('Selects shared dimension', () => {
      cy.contains('form-property', 'Shared dimension')
        .find('sh-sl-autocomplete')
        .should('be.visible')
        .click()

      cy.contains('sl-menu-item', sharedDimensionName)
        .click()
    })

    it('Confirms selection', () => {
      cy.contains('button', 'Map terms from a Shared Dimension')
        .click()

      cy.contains('Mappings updated')
        .should('be.visible')
    })

    it('Closes the panel', () => {
      cy.get('.quickview-header')
        .find('button.delete')
        .click()

      cy.contains('Dimension mappings changed')
        .should('be.visible')
    })
  })
})

function random(): string {
  return Date.now().toString()
}

function toIdentifier(name: string): string {
  return slugify(name, { lower: true })
}
