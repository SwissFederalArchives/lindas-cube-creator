/// <reference types="cypress" />

/**
 * UI Smoke Tests - Basic checks without authentication
 *
 * These tests verify the UI is accessible and responding correctly
 * without requiring OIDC authentication setup.
 */

describe('UI Smoke Tests', () => {
  it('should load the application root', () => {
    cy.visit('/')
    cy.get('html').should('exist')
  })

  it('should have the correct page title', () => {
    cy.visit('/')
    cy.title().should('not.be.empty')
  })

  it('should load the app container', () => {
    cy.visit('/')
    cy.get('#app').should('exist')
  })

  it('should respond with 200 status', () => {
    cy.request('/').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.headers['content-type']).to.include('text/html')
    })
  })

  it('should have proper viewport meta tag', () => {
    cy.visit('/')
    cy.get('meta[name="viewport"]').should('exist')
  })
})
