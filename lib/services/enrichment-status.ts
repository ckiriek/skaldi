/**
 * Enrichment Status Service
 * 
 * Manages enrichment status tracking
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type EnrichmentStatus = 
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'

export interface EnrichmentProgress {
  project_id: string
  status: EnrichmentStatus
  progress_percent: number
  current_step?: string
  total_steps?: number
  completed_steps?: number
  started_at?: string
  completed_at?: string
  error_message?: string
  metadata?: {
    compounds_fetched?: number
    trials_fetched?: number
    literature_fetched?: number
    chunks_created?: number
  }
}

export class EnrichmentStatusService {
  private supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  /**
   * Set enrichment status
   */
  async setStatus(
    projectId: string,
    status: EnrichmentStatus,
    options?: {
      currentStep?: string
      progressPercent?: number
      errorMessage?: string
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        enrichment_status: status,
        updated_at: new Date().toISOString()
      }

      if (options?.currentStep) {
        updateData.enrichment_progress = options.currentStep
      }

      if (options?.progressPercent !== undefined) {
        updateData.enrichment_progress_percent = options.progressPercent
      }

      if (options?.errorMessage) {
        updateData.enrichment_error = options.errorMessage
      }

      if (status === 'RUNNING' && !options?.currentStep) {
        updateData.enrichment_started_at = new Date().toISOString()
      }

      if (status === 'COMPLETED' || status === 'FAILED') {
        updateData.enrichment_completed_at = new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)

      if (error) {
        console.error('Failed to update enrichment status:', error)
      }
    } catch (error) {
      console.error('Error setting enrichment status:', error)
    }
  }

  /**
   * Get enrichment status
   */
  async getStatus(projectId: string): Promise<EnrichmentProgress | null> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error || !data) {
        return null
      }

      return {
        project_id: projectId,
        status: (data as any).enrichment_status || 'PENDING',
        progress_percent: (data as any).enrichment_progress_percent || 0,
        current_step: (data as any).enrichment_progress,
        started_at: (data as any).enrichment_started_at,
        completed_at: (data as any).enrichment_completed_at,
        error_message: (data as any).enrichment_error
      }
    } catch (error) {
      console.error('Error getting enrichment status:', error)
      return null
    }
  }

  /**
   * Update progress
   */
  async updateProgress(
    projectId: string,
    completedSteps: number,
    totalSteps: number,
    currentStep: string
  ): Promise<void> {
    const progressPercent = Math.round((completedSteps / totalSteps) * 100)

    await this.setStatus(projectId, 'RUNNING', {
      currentStep,
      progressPercent
    })
  }

  /**
   * Mark as queued
   */
  async markQueued(projectId: string): Promise<void> {
    await this.setStatus(projectId, 'QUEUED', {
      currentStep: 'Waiting in queue',
      progressPercent: 0
    })
  }

  /**
   * Mark as running
   */
  async markRunning(projectId: string, step: string): Promise<void> {
    await this.setStatus(projectId, 'RUNNING', {
      currentStep: step,
      progressPercent: 10
    })
  }

  /**
   * Mark as completed
   */
  async markCompleted(projectId: string, metadata?: Record<string, any>): Promise<void> {
    await this.setStatus(projectId, 'COMPLETED', {
      currentStep: 'Enrichment complete',
      progressPercent: 100,
      metadata
    })
  }

  /**
   * Mark as failed
   */
  async markFailed(projectId: string, errorMessage: string): Promise<void> {
    await this.setStatus(projectId, 'FAILED', {
      currentStep: 'Enrichment failed',
      errorMessage
    })
  }
}
