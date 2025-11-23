# Phase H - Next Session Plan

**Current Progress**: 80% Complete  
**Remaining**: 20%  
**Estimated Time**: 3-4 hours

---

## 🎯 Session Goals

Complete Phase H.2-H.6 to 100%:
1. RAG Layer (chunker, embeddings, vector search)
2. Complete API endpoints
3. Basic UI integration
4. Testing
5. Documentation

---

## 📋 Detailed Plan

### **Part 1: RAG Layer** (1.5-2 hours)

#### 1.1 Text Chunker
**File**: `lib/engine/knowledge/rag/chunker.ts`
- Implement smart text chunking
- Token-based splitting (max 512 tokens)
- Overlap handling (50 tokens)
- Preserve sentence boundaries
- Metadata tracking

#### 1.2 Embeddings Generator
**File**: `lib/engine/knowledge/rag/embeddings.ts`
- OpenAI embeddings integration
- Batch processing
- Error handling
- Rate limiting

#### 1.3 Vector Indexer
**File**: `lib/engine/knowledge/rag/indexer.ts`
- Save to Supabase `knowledge_rag_index`
- Batch inserts
- Deduplication
- Metadata storage

#### 1.4 Semantic Search
**File**: `lib/engine/knowledge/rag/search.ts`
- Vector similarity search
- Cosine similarity
- Result ranking
- Filtering by source type

---

### **Part 2: Complete API** (1 hour)

#### 2.1 Indications Endpoint
**File**: `app/api/knowledge/indications/route.ts`
```typescript
POST /api/knowledge/indications
Input: { inn: string, indicationHint?: string }
Output: { indications: KgIndication[] }
```

#### 2.2 Endpoints Endpoint
**File**: `app/api/knowledge/endpoints/route.ts`
```typescript
POST /api/knowledge/endpoints
Input: { inn?: string, indication?: string }
Output: { endpoints: KgEndpoint[] }
```

#### 2.3 Formulation Endpoint
**File**: `app/api/knowledge/formulation/route.ts`
```typescript
POST /api/knowledge/formulation
Input: { inn: string }
Output: { formulation: KgFormulation }
```

#### 2.4 Refresh Endpoint (Admin)
**File**: `app/api/knowledge/refresh/route.ts`
```typescript
POST /api/knowledge/refresh
Input: { inn: string }
Action: Rebuild + cache snapshot
```

---

### **Part 3: UI Integration** (1 hour)

#### 3.1 Project Creation Enhancement
**File**: `app/dashboard/projects/new/page.tsx`
- Add "Fetch from Knowledge Graph" button
- Auto-populate indications
- Show confidence scores
- Display sources

#### 3.2 Knowledge Graph Viewer (Optional)
**File**: `components/knowledge/KnowledgeGraphViewer.tsx`
- Display formulations
- Show indications with confidence
- List endpoints
- Source tracking

---

### **Part 4: Testing** (30 min)

#### 4.1 Unit Tests
**Files**: `__tests__/knowledge/*.test.ts`
- Normalizer tests
- Builder tests
- API tests

#### 4.2 Integration Tests
- Test with real INN (e.g., "Metformin")
- Verify data quality
- Check confidence scores

---

### **Part 5: Documentation** (30 min)

#### 5.1 README
**File**: `lib/engine/knowledge/README.md`
- Architecture overview
- API documentation
- Usage examples
- Limitations

#### 5.2 API Docs
**File**: `docs/api/knowledge.md`
- Endpoint descriptions
- Request/response examples
- Error codes

---

## 🚀 Quick Start Checklist

### **Before Starting**:
- [ ] Review current code
- [ ] Check database migration status
- [ ] Verify API endpoint works
- [ ] Read Phase H full plan

### **During Session**:
- [ ] Implement RAG chunker
- [ ] Add OpenAI embeddings
- [ ] Create vector indexer
- [ ] Build semantic search
- [ ] Add 3 API endpoints
- [ ] Integrate into UI
- [ ] Write tests
- [ ] Document

### **After Session**:
- [ ] Test all endpoints
- [ ] Verify UI integration
- [ ] Run tests
- [ ] Deploy to production
- [ ] Update documentation

---

## 📊 Success Criteria

### **RAG Layer**:
- ✅ Chunker splits text intelligently
- ✅ Embeddings generated successfully
- ✅ Vectors stored in Supabase
- ✅ Semantic search returns relevant results

### **API**:
- ✅ All 4 endpoints working
- ✅ Error handling complete
- ✅ Response times < 5s
- ✅ Proper caching

### **UI**:
- ✅ Knowledge Graph button visible
- ✅ Auto-suggestions working
- ✅ Confidence scores displayed
- ✅ Sources shown

### **Testing**:
- ✅ Unit tests passing
- ✅ Integration tests passing
- ✅ Manual testing successful

### **Documentation**:
- ✅ README complete
- ✅ API docs written
- ✅ Examples provided

---

## 🔧 Implementation Order

1. **RAG Chunker** (30 min)
2. **OpenAI Embeddings** (30 min)
3. **Vector Indexer** (30 min)
4. **Semantic Search** (30 min)
5. **API Endpoints** (1 hour)
6. **UI Integration** (1 hour)
7. **Testing** (30 min)
8. **Documentation** (30 min)

**Total**: 3-4 hours

---

## 💡 Tips

### **RAG Layer**:
- Use tiktoken for token counting
- Batch embeddings (max 100 per request)
- Use pgvector's ivfflat index
- Cache embeddings to avoid re-generation

### **API**:
- Add request validation
- Implement caching (Redis or in-memory)
- Rate limit external API calls
- Log all requests

### **UI**:
- Show loading states
- Handle errors gracefully
- Display confidence visually (progress bars)
- Allow manual override

### **Testing**:
- Test with multiple INNs
- Test error cases
- Test edge cases (no data, partial data)
- Performance testing

---

## 📝 Code Templates

### **RAG Chunker Template**:
```typescript
export function chunkText(
  text: string,
  options: { maxTokens: number; overlap: number }
): TextChunk[] {
  // Implementation
}
```

### **API Endpoint Template**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const { inn } = await request.json()
    // Validation
    // Processing
    // Response
  } catch (error) {
    // Error handling
  }
}
```

### **UI Integration Template**:
```typescript
const handleFetchKnowledge = async () => {
  setLoading(true)
  try {
    const response = await fetch('/api/knowledge/indications', {
      method: 'POST',
      body: JSON.stringify({ inn: formData.compound_name })
    })
    const data = await response.json()
    // Update UI
  } catch (error) {
    // Error handling
  } finally {
    setLoading(false)
  }
}
```

---

## 🎯 Expected Outcomes

After this session:
- ✅ Phase H.2-H.6: **100% Complete**
- ✅ RAG Layer: Fully functional
- ✅ API: 4 endpoints working
- ✅ UI: Basic integration done
- ✅ Tests: Passing
- ✅ Docs: Complete

---

## 🚀 Ready to Start!

**Current State**: 80% Complete  
**Target State**: 100% Complete  
**Time Needed**: 3-4 hours  

**Let's finish Phase H! 🎉**
