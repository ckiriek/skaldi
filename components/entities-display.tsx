import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Entity {
  id: string
  entity_type: string
  entity_value: string
  context?: string
  confidence: string
  source?: string
  source_reference?: string
  created_at: string
}

interface EntitiesDisplayProps {
  entities: Entity[]
}

const entityTypeLabels: Record<string, string> = {
  compound: 'Compound/Drug',
  indication: 'Indication',
  endpoint: 'Endpoint',
  dosage: 'Dosage',
  population: 'Population',
  study_design: 'Study Design',
  location: 'Location',
  date: 'Date',
  sponsor: 'Sponsor',
  regulatory: 'Regulatory'
}

const entityTypeColors: Record<string, string> = {
  compound: 'bg-blue-100 text-blue-800',
  indication: 'bg-purple-100 text-purple-800',
  endpoint: 'bg-green-100 text-green-800',
  dosage: 'bg-yellow-100 text-yellow-800',
  population: 'bg-pink-100 text-pink-800',
  study_design: 'bg-indigo-100 text-indigo-800',
  location: 'bg-orange-100 text-orange-800',
  date: 'bg-muted text-foreground',
  sponsor: 'bg-teal-100 text-teal-800',
  regulatory: 'bg-red-100 text-red-800'
}

const confidenceColors: Record<string, string> = {
  high: 'text-green-600',
  medium: 'text-yellow-600',
  low: 'text-muted-foreground'
}

export function EntitiesDisplay({ entities }: EntitiesDisplayProps) {
  if (!entities || entities.length === 0) {
    return null
  }

  // Group entities by type
  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.entity_type]) {
      acc[entity.entity_type] = []
    }
    acc[entity.entity_type].push(entity)
    return acc
  }, {} as Record<string, Entity[]>)

  const sortedTypes = Object.keys(groupedEntities).sort()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Entities</CardTitle>
        <CardDescription>
          {entities.length} entities extracted from uploaded files
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedTypes.map(type => (
            <div key={type}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${entityTypeColors[type] || 'bg-muted'}`}>
                  {entityTypeLabels[type] || type}
                </span>
                <span className="text-muted-foreground">({groupedEntities[type].length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupedEntities[type].map(entity => (
                  <div
                    key={entity.id}
                    className="p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm flex-1">
                        {entity.entity_value}
                      </p>
                      <span className={`text-xs ${confidenceColors[entity.confidence]}`}>
                        {entity.confidence}
                      </span>
                    </div>
                    {entity.context && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {entity.context}
                      </p>
                    )}
                    {entity.source_reference && (
                      <p className="text-xs text-muted-foreground">
                        From: {entity.source_reference}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
