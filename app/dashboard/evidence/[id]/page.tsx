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

  // Generate external URL based on source
  const getExternalUrl = () => {
    if (evidence.source === 'ClinicalTrials.gov' && evidence.external_id) {
      return `https://clinicaltrials.gov/study/${evidence.external_id}`
    } else if (evidence.source === 'PubMed' && evidence.external_id) {
      return `https://pubmed.ncbi.nlm.nih.gov/${evidence.external_id}/`
    }
    return null
  }

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
          <h1 className="text-2xl font-bold">{evidence.title}</h1>
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

      {/* Snippet/Summary */}
      {evidence.snippet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{evidence.snippet}</p>
          </CardContent>
        </Card>
      )}

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
                  <p className="text-sm">{payload.phase}</p>
                </CardContent>
              </Card>
            )}
            {payload?.overall_status && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.overall_status}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {payload?.brief_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Brief Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{payload.brief_summary}</p>
              </CardContent>
            </Card>
          )}

          {payload?.detailed_description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detailed Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{payload.detailed_description}</p>
              </CardContent>
            </Card>
          )}

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
            {payload?.start_date && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Start Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.start_date}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {payload?.condition && Array.isArray(payload.condition) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {payload.condition.map((cond: string, idx: number) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {cond}
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
          {payload?.openfda && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payload.openfda.brand_name && (
                  <div>
                    <p className="text-xs text-gray-500">Brand Name</p>
                    <p className="text-sm font-medium">{payload.openfda.brand_name.join(', ')}</p>
                  </div>
                )}
                {payload.openfda.generic_name && (
                  <div>
                    <p className="text-xs text-gray-500">Generic Name</p>
                    <p className="text-sm font-medium">{payload.openfda.generic_name.join(', ')}</p>
                  </div>
                )}
                {payload.openfda.manufacturer_name && (
                  <div>
                    <p className="text-xs text-gray-500">Manufacturer</p>
                    <p className="text-sm">{payload.openfda.manufacturer_name.join(', ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            {payload?.receivedate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Report Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.receivedate}</p>
                </CardContent>
              </Card>
            )}
            {payload?.serious !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Serious Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payload.serious ? 'Yes' : 'No'}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {payload?.patient?.reaction && Array.isArray(payload.patient.reaction) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payload.patient.reaction.map((reaction: any, idx: number) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded">
                      <p className="text-sm font-medium">{reaction.reactionmeddrapt}</p>
                      {reaction.reactionoutcome && (
                        <p className="text-xs text-gray-600">Outcome: {reaction.reactionoutcome}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Full JSON Payload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full Data (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
