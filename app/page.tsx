import Link from 'next/link'
import { FileText, Shield, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F0EDE5] to-[#F0EDE5]">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Skaldi
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered platform for automating clinical trial documentation
          </p>
        </header>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <Zap className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold">Fast Generation</h3>
            </div>
            <p className="text-gray-600">
              Reduce document preparation time from weeks to hours with AI-powered generation
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold">Regulatory Compliance</h3>
            </div>
            <p className="text-gray-600">
              Built-in validation against ICH/GCP/FDA guidelines with audit trail
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <FileText className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold">Single Source of Truth</h3>
            </div>
            <p className="text-gray-600">
              Linked documents automatically update when source data changes
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </Link>
          <p className="text-sm text-gray-500">
            Demo credentials: admin@democro.com (see seed data)
          </p>
        </div>

        {/* Status */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>✅ Supabase Connected</p>
          <p className="mt-2">Database: 11 tables | RLS: Enabled | Seed data: Loaded</p>
        </div>
      </div>
    </main>
  )
}
