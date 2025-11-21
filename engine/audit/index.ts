/**
 * Audit Log Service
 * 
 * Records all document changes for compliance
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type AuditAction = 
  | 'BLOCK_UPDATED'
  | 'BLOCK_CREATED'
  | 'BLOCK_DELETED'
  | 'VALIDATION_RUN'
  | 'SUGGESTION_APPLIED'
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_EXPORTED'

export interface AuditEntry {
  document_id: string
  action: AuditAction
  diff_json?: Record<string, any>
  actor_user_id?: string
  metadata?: Record<string, any>
}

export class AuditLogger {
  private supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  /**
   * Log an audit entry
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('audit_log')
        .insert({
          document_id: entry.document_id,
          action: entry.action,
          diff_json: entry.diff_json || {},
          actor_user_id: entry.actor_user_id,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to log audit entry:', error)
      }
    } catch (error) {
      console.error('Audit log error:', error)
    }
  }

  /**
   * Log block update
   */
  async logBlockUpdate(
    documentId: string,
    blockId: string,
    oldText: string,
    newText: string,
    userId?: string
  ): Promise<void> {
    await this.log({
      document_id: documentId,
      action: 'BLOCK_UPDATED',
      diff_json: {
        block_id: blockId,
        old_text: oldText,
        new_text: newText,
        timestamp: new Date().toISOString()
      },
      actor_user_id: userId
    })
  }

  /**
   * Log validation run
   */
  async logValidation(
    documentId: string,
    errors: number,
    warnings: number,
    userId?: string
  ): Promise<void> {
    await this.log({
      document_id: documentId,
      action: 'VALIDATION_RUN',
      diff_json: {
        errors,
        warnings,
        timestamp: new Date().toISOString()
      },
      actor_user_id: userId
    })
  }

  /**
   * Log suggestion applied
   */
  async logSuggestionApplied(
    documentId: string,
    suggestionId: string,
    blockId: string,
    userId?: string
  ): Promise<void> {
    await this.log({
      document_id: documentId,
      action: 'SUGGESTION_APPLIED',
      diff_json: {
        suggestion_id: suggestionId,
        block_id: blockId,
        timestamp: new Date().toISOString()
      },
      actor_user_id: userId
    })
  }

  /**
   * Get audit history for a document
   */
  async getHistory(documentId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Failed to fetch audit history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Audit history error:', error)
      return []
    }
  }
}
