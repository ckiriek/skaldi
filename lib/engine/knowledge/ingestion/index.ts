/**
 * Phase H.2: Data Ingestion Layer
 * 
 * Export all ingestion modules
 */

export { fetchFdaLabelsByInn } from './fda_label'
export { fetchFdaNdcByInn } from './fda_ndc'
export { fetchDailyMedByInn } from './dailymed'
export { fetchCtGovStudies } from './ctgov'
export { extractEmaEpar, parseEmaPdfText } from './ema_pdf'

export type {
  FdaLabelRecord,
  FdaNdcRecord,
  DailyMedRecord,
  CtGovRecord,
  CtGovEndpoint,
  CtGovStudyDesign,
  CtGovEligibility,
  EmaEparRecord
} from '../types'
