import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch evidence
  const { data: evidence, error } = await supabase
    .from('evidence_sources')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !evidence) {
    notFound()
  }

  const payload = evidence.payload_json as any

  // Generate title from payload
  const getTitle = () => {
    if (evidence.source === 'ClinicalTrials.gov') {
      return payload?.title || evidence.external_id
    } else if (evidence.source === 'PubMed') {
      return payload?.title || evidence.external_id
    } else if (evidence.source === 'openFDA') {
      return payload?.drugName || evidence.external_id
    }
    return evidence.external_id
  }

  // Generate external URL based on source
  const getExternalUrl = () => {
    if (evidence.source === 'ClinicalTrials.gov' && evidence.external_id) {
      return `https://clinicaltrials.gov/study/${evidence.external_id}`
    } else if (evidence.source === 'PubMed' && evidence.external_id) {
      return `https://pubmed.ncbi.nlm.nih.gov/${evidence.external_id}/`
    }
    return null
  }

  const title = getTitle()
  const externalUrl = getExternalUrl()

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/projects/${evidence.project_id}`} className="hover:opacity-70 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              evidence.source === 'ClinicalTrials.gov' ? 'bg-blue-100 text-blue-700' :
              evidence.source === 'PubMed' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {evidence.source}
            </span>
            {evidence.external_id && (
              <span className="text-sm text-gray-600">{evidence.external_id}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View on {evidence.source}
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>


      {/* Clinical Trial Details */}
      {evidence.source === 'ClinicalTrials.gov' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {payload?.phase && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Phase</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{Array.isArray(payload.phase) ? payload.phase.join(', ') : payload.phase}</p>
                </CardContent>
              </Card>
            )}
            {payload?.status && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.status}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {payload?.sponsor && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sponsor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.sponsor}</p>
                </CardContent>
              </Card>
            )}
            {payload?.startDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Start Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.startDate}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {payload?.completionDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completion Date</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{payload.completionDate}</p>
              </CardContent>
            </Card>
          )}

          {payload?.studyType && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Study Type</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{payload.studyType}</p>
              </CardContent>
            </Card>
          )}

          {payload?.conditions && Array.isArray(payload.conditions) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {payload.conditions.map((cond: string, idx: number) => (
                    <span key={idx} className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded">
                      {cond}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {payload?.interventions && Array.isArray(payload.interventions) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Interventions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {payload.interventions.map((intervention: string, idx: number) => (
                    <span key={idx} className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded">
                      {intervention}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Publication Details */}
      {evidence.source === 'PubMed' && (
        <>
          {payload?.authors && Array.isArray(payload.authors) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Authors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{payload.authors.join(', ')}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            {payload?.journal && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Journal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.journal}</p>
                </CardContent>
              </Card>
            )}
            {payload?.publication_year && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Year</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.publication_year}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {payload?.abstract && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Abstract</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{payload.abstract}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Safety Report Details */}
      {evidence.source === 'openFDA' && (
        <>
          {payload?.drugName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-xs text-gray-500">Drug Name</p>
                  <p className="text-sm font-medium">{payload.drugName}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-4">
            {payload?.receiptDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Report Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.receiptDate}</p>
                </CardContent>
              </Card>
            )}
            {payload?.patientAge && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Patient Age</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.patientAge}</p>
                </CardContent>
              </Card>
            )}
            {payload?.patientSex && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Patient Sex</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.patientSex}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {payload?.seriousness && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seriousness</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{payload.seriousness}</p>
              </CardContent>
            </Card>
          )}

          {payload?.reactions && Array.isArray(payload.reactions) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {payload.reactions.map((reaction: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                      {reaction}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {payload?.outcomes && Array.isArray(payload.outcomes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {payload.outcomes.map((outcome: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      {outcome === '1' ? 'Recovered/Resolved' :
                       outcome === '2' ? 'Recovering/Resolving' :
                       outcome === '3' ? 'Not Recovered/Not Resolved' :
                       outcome === '4' ? 'Recovered/Resolved with Sequelae' :
                       outcome === '5' ? 'Fatal' :
                       outcome === '6' ? 'Unknown' : outcome}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

    </div>
  )
}
