/**
 * Template Engine for Asetria Writer
 * 
 * Uses Handlebars for template rendering with custom helpers
 */

import Handlebars from 'handlebars'
import fs from 'fs/promises'
import path from 'path'

/**
 * Register custom Handlebars helpers
 */
export function registerHelpers() {
  // Greater than or equal
  Handlebars.registerHelper('gte', function(a: number, b: number) {
    return a >= b
  })

  // Less than or equal
  Handlebars.registerHelper('lte', function(a: number, b: number) {
    return a <= b
  })

  // Equal
  Handlebars.registerHelper('eq', function(a: any, b: any) {
    return a === b
  })

  // Not equal
  Handlebars.registerHelper('ne', function(a: any, b: any) {
    return a !== b
  })

  // Format number with decimals
  Handlebars.registerHelper('decimal', function(value: number, decimals: number = 2) {
    if (typeof value !== 'number') return value
    return value.toFixed(decimals)
  })

  // Format percentage
  Handlebars.registerHelper('percent', function(value: number, decimals: number = 1) {
    if (typeof value !== 'number') return value
    return `${value.toFixed(decimals)}%`
  })

  // Format date
  Handlebars.registerHelper('date', function(dateString: string, format: string = 'YYYY-MM-DD') {
    if (!dateString) return ''
    const date = new Date(dateString)
    // Simple format: YYYY-MM-DD
    if (format === 'YYYY-MM-DD') {
      return date.toISOString().split('T')[0]
    }
    // Full format: November 11, 2025
    if (format === 'long') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }
    return date.toISOString()
  })

  // Capitalize first letter
  Handlebars.registerHelper('capitalize', function(str: string) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  })

  // Uppercase
  Handlebars.registerHelper('upper', function(str: string) {
    if (!str) return ''
    return str.toUpperCase()
  })

  // Lowercase
  Handlebars.registerHelper('lower', function(str: string) {
    if (!str) return ''
    return str.toLowerCase()
  })

  // Join array
  Handlebars.registerHelper('join', function(arr: string[], separator: string = ', ') {
    if (!Array.isArray(arr)) return ''
    return arr.join(separator)
  })

  // Default value if empty
  Handlebars.registerHelper('default', function(value: any, defaultValue: any) {
    return value || defaultValue
  })

  // Math operations
  Handlebars.registerHelper('add', function(a: number, b: number) {
    return a + b
  })

  Handlebars.registerHelper('subtract', function(a: number, b: number) {
    return a - b
  })

  Handlebars.registerHelper('multiply', function(a: number, b: number) {
    return a * b
  })

  Handlebars.registerHelper('divide', function(a: number, b: number) {
    if (b === 0) return 0
    return a / b
  })

  // Conditional helpers
  Handlebars.registerHelper('and', function(a: any, b: any) {
    return a && b
  })

  Handlebars.registerHelper('or', function(a: any, b: any) {
    return a || b
  })

  Handlebars.registerHelper('not', function(a: any) {
    return !a
  })

  // Array length
  Handlebars.registerHelper('length', function(arr: any[]) {
    if (!Array.isArray(arr)) return 0
    return arr.length
  })

  // Check if array is empty
  Handlebars.registerHelper('isEmpty', function(arr: any[]) {
    if (!Array.isArray(arr)) return true
    return arr.length === 0
  })

  // Check if array is not empty
  Handlebars.registerHelper('isNotEmpty', function(arr: any[]) {
    if (!Array.isArray(arr)) return false
    return arr.length > 0
  })

  console.log('✅ Handlebars helpers registered')
}

/**
 * Template Engine class
 */
export class TemplateEngine {
  private templatesDir: string
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate>

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(process.cwd(), 'lib', 'templates')
    this.compiledTemplates = new Map()
    registerHelpers()
  }

  /**
   * Load and compile a template
   */
  async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache
    if (this.compiledTemplates.has(templateName)) {
      return this.compiledTemplates.get(templateName)!
    }

    // Load template file
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`)
    
    try {
      const templateSource = await fs.readFile(templatePath, 'utf-8')
      const compiled = Handlebars.compile(templateSource)
      
      // Cache compiled template
      this.compiledTemplates.set(templateName, compiled)
      
      console.log(`✅ Template loaded: ${templateName}`)
      return compiled
    } catch (error) {
      console.error(`❌ Failed to load template: ${templateName}`, error)
      throw new Error(`Template not found: ${templateName}`)
    }
  }

  /**
   * Render a template with data
   */
  async render(templateName: string, data: any): Promise<string> {
    const template = await this.loadTemplate(templateName)
    
    try {
      const rendered = template(data)
      console.log(`✅ Template rendered: ${templateName}`)
      return rendered
    } catch (error) {
      console.error(`❌ Failed to render template: ${templateName}`, error)
      throw new Error(`Template rendering failed: ${templateName}`)
    }
  }

  /**
   * Render a template from string
   */
  renderString(templateString: string, data: any): string {
    try {
      const template = Handlebars.compile(templateString)
      return template(data)
    } catch (error) {
      console.error('❌ Failed to render template string', error)
      throw new Error('Template string rendering failed')
    }
  }

  /**
   * Register a partial template
   */
  async registerPartial(partialName: string, templateName: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'partials', `${templateName}.hbs`)
    
    try {
      const templateSource = await fs.readFile(templatePath, 'utf-8')
      Handlebars.registerPartial(partialName, templateSource)
      console.log(`✅ Partial registered: ${partialName}`)
    } catch (error) {
      console.error(`❌ Failed to register partial: ${partialName}`, error)
      throw new Error(`Partial not found: ${partialName}`)
    }
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.compiledTemplates.clear()
    console.log('✅ Template cache cleared')
  }

  /**
   * List available templates
   */
  async listTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.templatesDir)
      return files
        .filter(file => file.endsWith('.hbs'))
        .map(file => file.replace('.hbs', ''))
    } catch (error) {
      console.error('❌ Failed to list templates', error)
      return []
    }
  }
}

// Export singleton instance
export const templateEngine = new TemplateEngine()

// Export Handlebars for direct use if needed
export { Handlebars }
