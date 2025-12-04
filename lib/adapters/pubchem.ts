/**
 * PubChem Adapter
 * 
 * Resolves compound names to InChIKey (canonical identifier)
 * Fetches chemical structure and properties
 * 
 * API: https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
 */

import type { Compound } from '@/lib/types/regulatory-data'

const PUBCHEM_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'

interface PubChemCompoundResponse {
  PC_Compounds: Array<{
    id: {
      id: {
        cid: number
      }
    }
    atoms?: any
    bonds?: any
    props: Array<{
      urn: {
        label: string
        name?: string
      }
      value: {
        sval?: string
        fval?: number
        ival?: number
      }
    }>
  }>
}

export class PubChemAdapter {
  private baseUrl = PUBCHEM_BASE_URL
  private lastRequestTime = 0
  private minRequestInterval = 200 // 200ms = 5 req/sec (PubChem limit)

  /**
   * Rate limiting: wait if needed
   */
  private async rateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  /**
   * Resolve compound name to InChIKey
   * 
   * @param name - Compound name (e.g., "Metformin Hydrochloride", "AST-256")
   * @returns InChIKey or null if not found
   */
  async resolveToInChIKey(name: string): Promise<string | null> {
    try {
      await this.rateLimit()

      // Step 1: Search by name to get CID
      const searchUrl = `${this.baseUrl}/compound/name/${encodeURIComponent(name)}/cids/JSON`
      const searchResponse = await fetch(searchUrl)

      if (!searchResponse.ok) {
        if (searchResponse.status === 404) {
          console.warn(`PubChem: Compound "${name}" not found`)
          return null
        }
        throw new Error(`PubChem search failed: ${searchResponse.status}`)
      }

      const searchData = await searchResponse.json()
      const cid = searchData.IdentifierList?.CID?.[0]

      if (!cid) {
        console.warn(`PubChem: No CID found for "${name}"`)
        return null
      }

      // Step 2: Get InChIKey from CID
      await this.rateLimit()
      const inchikeyUrl = `${this.baseUrl}/compound/cid/${cid}/property/InChIKey/JSON`
      const inchikeyResponse = await fetch(inchikeyUrl)

      if (!inchikeyResponse.ok) {
        throw new Error(`PubChem InChIKey fetch failed: ${inchikeyResponse.status}`)
      }

      const inchikeyData = await inchikeyResponse.json()
      const inchikey = inchikeyData.PropertyTable?.Properties?.[0]?.InChIKey

      if (!inchikey) {
        console.warn(`PubChem: No InChIKey found for CID ${cid}`)
        return null
      }

      console.log(`✅ PubChem: Resolved "${name}" → ${inchikey} (CID: ${cid})`)
      return inchikey

    } catch (error) {
      console.error(`PubChem resolveToInChIKey error for "${name}":`, error)
      return null
    }
  }

  /**
   * Fetch full compound data from PubChem
   * 
   * @param name - Compound name
   * @returns Compound object or null
   */
  async fetchCompound(name: string): Promise<Compound | null> {
    try {
      await this.rateLimit()

      // Search by name to get CID
      const searchUrl = `${this.baseUrl}/compound/name/${encodeURIComponent(name)}/cids/JSON`
      const searchResponse = await fetch(searchUrl)

      if (!searchResponse.ok) {
        if (searchResponse.status === 404) {
          console.warn(`PubChem: Compound "${name}" not found`)
          return null
        }
        throw new Error(`PubChem search failed: ${searchResponse.status}`)
      }

      const searchData = await searchResponse.json()
      const cid = searchData.IdentifierList?.CID?.[0]

      if (!cid) {
        return null
      }

      // Fetch full compound data
      await this.rateLimit()
      const compoundUrl = `${this.baseUrl}/compound/cid/${cid}/JSON`
      const compoundResponse = await fetch(compoundUrl)

      if (!compoundResponse.ok) {
        throw new Error(`PubChem compound fetch failed: ${compoundResponse.status}`)
      }

      const compoundData: PubChemCompoundResponse = await compoundResponse.json()
      const pcCompound = compoundData.PC_Compounds?.[0]

      if (!pcCompound) {
        return null
      }

      // Extract properties
      const props = pcCompound.props || []
      const getProp = (label: string): string | number | undefined => {
        const prop = props.find(p => p.urn.label === label || p.urn.name === label)
        return prop?.value?.sval || prop?.value?.fval || prop?.value?.ival
      }

      const inchikey = getProp('InChIKey') as string
      const iupacName = getProp('IUPAC Name') as string
      const molecularFormula = getProp('Molecular Formula') as string
      const molecularWeight = getProp('Molecular Weight') as number
      const smiles = getProp('SMILES') as string
      const synonyms = (getProp('Synonym') as string)?.split('\n') || []

      if (!inchikey) {
        console.warn(`PubChem: No InChIKey found for CID ${cid}`)
        return null
      }

      const compound: Compound = {
        inchikey,
        name: iupacName || name,
        synonyms: synonyms.slice(0, 10), // Limit to 10 synonyms
        mechanism_of_action: undefined, // Not available from PubChem
        atc_codes: [], // Not available from PubChem
        molecular_weight: molecularWeight,
        molecular_formula: molecularFormula,
        smiles,
        chemical_structure_url: `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${cid}&t=l`,
        
        // Provenance
        source: 'PubChem',
        source_id: cid.toString(),
        source_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
        retrieved_at: new Date().toISOString(),
        confidence: 'high',
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log(`✅ PubChem: Fetched compound data for "${name}" (InChIKey: ${inchikey})`)
      return compound

    } catch (error) {
      console.error(`PubChem fetchCompound error for "${name}":`, error)
      return null
    }
  }

  /**
   * Search compounds by name (returns multiple matches)
   * 
   * @param query - Search query
   * @param limit - Max results (default: 10)
   * @returns Array of {cid, name}
   */
  async searchCompounds(query: string, limit: number = 10): Promise<Array<{ cid: number; name: string }>> {
    try {
      await this.rateLimit()

      // Use autocomplete API for partial matches
      const autocompleteUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/${encodeURIComponent(query)}/json?limit=${limit}`
      console.log('🔬 PubChem autocomplete URL:', autocompleteUrl)
      
      const searchResponse = await fetch(autocompleteUrl)

      if (!searchResponse.ok) {
        if (searchResponse.status === 404) {
          console.log('🔬 PubChem: No results (404)')
          return []
        }
        throw new Error(`PubChem search failed: ${searchResponse.status}`)
      }

      const searchData = await searchResponse.json()
      console.log('🔬 PubChem autocomplete response:', searchData)
      
      // Autocomplete returns {total, dictionary_terms: {compound: ["name1", "name2", ...]}}
      const names = searchData.dictionary_terms?.compound || []
      
      // Return names (we don't have CIDs from autocomplete, but that's ok for autocomplete)
      const results = names.slice(0, limit).map((name: string, index: number) => ({
        cid: index, // Dummy CID for autocomplete
        name
      }))

      console.log('🔬 PubChem results:', results)
      return results

    } catch (error) {
      console.error(`PubChem searchCompounds error for "${query}":`, error)
      return []
    }
  }

  /**
   * Validate InChIKey format
   * 
   * @param inchikey - InChIKey to validate
   * @returns true if valid format
   */
  static isValidInChIKey(inchikey: string): boolean {
    // InChIKey format: XXXXXXXXXXXXXX-YYYYYYYYYY-Z
    // 14 chars - 10 chars - 1 char
    const pattern = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/
    return pattern.test(inchikey)
  }

  /**
   * Fetch extended compound properties for CMC enrichment
   * Includes: MW, formula, CAS, InChIKey, SMILES, XLogP, TPSA, etc.
   * 
   * @param name - Compound name (INN)
   * @returns Extended compound properties or null
   */
  async fetchCompoundProperties(name: string): Promise<{
    cid?: number
    inchikey?: string
    cas?: string
    iupacName?: string
    molecularFormula?: string
    molecularWeight?: number
    canonicalSmiles?: string
    isomericSmiles?: string
    xlogp?: number
    tpsa?: number
    hbondDonor?: number
    hbondAcceptor?: number
    rotatableBonds?: number
    complexity?: number
    structureUrl?: string
  } | null> {
    try {
      await this.rateLimit()

      // Step 1: Search by name to get CID
      const searchUrl = `${this.baseUrl}/compound/name/${encodeURIComponent(name)}/cids/JSON`
      const searchResponse = await fetch(searchUrl)

      if (!searchResponse.ok) {
        if (searchResponse.status === 404) {
          console.log(`⚠️ PubChem: Compound "${name}" not found`)
          return null
        }
        throw new Error(`PubChem search failed: ${searchResponse.status}`)
      }

      const searchData = await searchResponse.json()
      const cid = searchData.IdentifierList?.CID?.[0]

      if (!cid) {
        return null
      }

      // Step 2: Fetch multiple properties in one call
      await this.rateLimit()
      const properties = [
        'InChIKey',
        'IUPACName', 
        'MolecularFormula',
        'MolecularWeight',
        'CanonicalSMILES',
        'IsomericSMILES',
        'XLogP',
        'TPSA',
        'HBondDonorCount',
        'HBondAcceptorCount',
        'RotatableBondCount',
        'Complexity'
      ].join(',')
      
      const propsUrl = `${this.baseUrl}/compound/cid/${cid}/property/${properties}/JSON`
      const propsResponse = await fetch(propsUrl)

      if (!propsResponse.ok) {
        throw new Error(`PubChem properties fetch failed: ${propsResponse.status}`)
      }

      const propsData = await propsResponse.json()
      const props = propsData.PropertyTable?.Properties?.[0]

      if (!props) {
        return null
      }

      // Step 3: Try to get CAS number from synonyms
      await this.rateLimit()
      let cas: string | undefined
      try {
        const synonymsUrl = `${this.baseUrl}/compound/cid/${cid}/synonyms/JSON`
        const synonymsResponse = await fetch(synonymsUrl)
        if (synonymsResponse.ok) {
          const synonymsData = await synonymsResponse.json()
          const synonyms = synonymsData.InformationList?.Information?.[0]?.Synonym || []
          // CAS format: digits-digits-digit (e.g., 486460-32-6)
          cas = synonyms.find((s: string) => /^\d{2,7}-\d{2}-\d$/.test(s))
        }
      } catch {
        // CAS lookup failed, continue without it
      }

      const result = {
        cid,
        inchikey: props.InChIKey,
        cas,
        iupacName: props.IUPACName,
        molecularFormula: props.MolecularFormula,
        molecularWeight: props.MolecularWeight,
        canonicalSmiles: props.CanonicalSMILES,
        isomericSmiles: props.IsomericSMILES,
        xlogp: props.XLogP,
        tpsa: props.TPSA,
        hbondDonor: props.HBondDonorCount,
        hbondAcceptor: props.HBondAcceptorCount,
        rotatableBonds: props.RotatableBondCount,
        complexity: props.Complexity,
        structureUrl: `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${cid}&t=l`
      }

      console.log(`✅ PubChem: Fetched properties for "${name}" (CID: ${cid}, MW: ${props.MolecularWeight}, XLogP: ${props.XLogP})`)
      return result

    } catch (error) {
      console.error(`PubChem fetchCompoundProperties error for "${name}":`, error)
      return null
    }
  }
}

// Export singleton instance
export const pubchemAdapter = new PubChemAdapter()
