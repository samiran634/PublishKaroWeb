# Database Schema for Email Analysis Feature

## Table: email_analyses

Stores the AI analysis results for emails with paper matches and next steps.

```sql
CREATE TABLE email_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES email_statuses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Analysis data
  analysis_json JSONB NOT NULL,
  
  -- Paper associations
  matched_paper_ids UUID[] DEFAULT ARRAY[]::UUID[],
  primary_paper_id UUID REFERENCES papers(id) ON DELETE SET NULL,
  
  -- Summary fields (for quick queries)
  urgency_level TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  action_items_count INTEGER DEFAULT 0,
  email_category TEXT NOT NULL,
  relevance_score INTEGER DEFAULT 0,
  
  -- Status
  dismissed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(email_id, user_id),
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_urgency (user_id, urgency_level),
  INDEX idx_dismissed (user_id, dismissed),
  INDEX idx_paper_id (user_id, primary_paper_id)
);

-- Enable RLS
ALTER TABLE email_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own analyses"
  ON email_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON email_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON email_analyses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON email_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_email_analyses_updated_at
  BEFORE UPDATE ON email_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Related Tables

These tables should already exist or need to be created:

### email_statuses
```sql
-- Should already exist, but verify this structure
CREATE TABLE IF NOT EXISTS email_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  publication_domain_id UUID NOT NULL,
  email_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  received_date TIMESTAMP WITH TIME ZONE,
  inferred_status TEXT,
  email_snippet TEXT,
  full_body TEXT,
  is_new BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### papers
```sql
-- Should already exist, but verify this structure
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  abstract TEXT,
  content TEXT,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  authors TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Helper Functions

### Function: update_updated_at_column
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

### Function: get_user_analysis_stats
```sql
CREATE OR REPLACE FUNCTION get_user_analysis_stats(p_user_id UUID)
RETURNS TABLE (
  total_analyses BIGINT,
  active_analyses BIGINT,
  critical_urgency BIGINT,
  high_urgency BIGINT,
  total_action_items BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_analyses,
    COUNT(*) FILTER (WHERE NOT dismissed)::BIGINT as active_analyses,
    COUNT(*) FILTER (WHERE urgency_level = 'critical' AND NOT dismissed)::BIGINT as critical_urgency,
    COUNT(*) FILTER (WHERE urgency_level = 'high' AND NOT dismissed)::BIGINT as high_urgency,
    COALESCE(SUM(action_items_count), 0)::BIGINT as total_action_items
  FROM email_analyses
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

### Function: find_paper_matches_for_analysis
```sql
CREATE OR REPLACE FUNCTION find_paper_matches_for_analysis(p_analysis_id UUID)
RETURNS TABLE (
  paper_id UUID,
  paper_title TEXT,
  match_score INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH analysis_data AS (
    SELECT analysis_json
    FROM email_analyses
    WHERE id = p_analysis_id
  )
  SELECT
    p.id,
    p.title,
    COALESCE((
      SELECT (elem->>'matchScore')::INTEGER
      FROM analysis_data a,
      jsonb_array_elements(a.analysis_json->'paperMatches') AS elem
      WHERE (elem->>'paperId')::UUID = p.id
      LIMIT 1
    ), 0) as match_score,
    p.updated_at
  FROM papers p
  WHERE p.id = ANY(
    SELECT matched_paper_ids FROM email_analyses WHERE id = p_analysis_id
  )
  ORDER BY match_score DESC;
END;
$$ LANGUAGE plpgsql;
```

## Indexes for Performance

```sql
-- Composite indexes for common queries
CREATE INDEX idx_email_analyses_user_urgency 
  ON email_analyses(user_id, urgency_level DESC)
  WHERE NOT dismissed;

CREATE INDEX idx_email_analyses_paper_id 
  ON email_analyses USING GIN(matched_paper_ids)
  WHERE NOT dismissed;

CREATE INDEX idx_email_analyses_category 
  ON email_analyses(user_id, email_category)
  WHERE NOT dismissed;

-- Text search index (optional, for future search functionality)
CREATE INDEX idx_email_analyses_analysis_gin 
  ON email_analyses USING GIN(analysis_json);
```

## JSON Schema for analysis_json

The analysis_json column stores this structure:

```json
{
  "emailId": "uuid",
  "analysis": {
    "category": "revision_request|reviewer_feedback|decision_notification|deadline_notification|query_response|general_inquiry|not_research_related",
    "isResearchRelated": true|false,
    "relevanceScore": 0-100,
    "keyPoints": ["point1", "point2"],
    "suggestedPaperKeywords": ["keyword1", "keyword2"],
    "urgency": "critical|high|medium|low",
    "summary": "string"
  },
  "paperMatches": [
    {
      "paperId": "uuid",
      "paperTitle": "string",
      "matchScore": 0-100,
      "matchReasons": ["reason1", "reason2"]
    }
  ],
  "nextSteps": [
    {
      "action": "string",
      "priority": "critical|high|medium|low",
      "dueInDays": number|null,
      "estimatedTimeMinutes": number|null,
      "description": "string"
    }
  ],
  "rawAnalysis": "string"
}
```

## Migration Script

To add this feature to an existing database:

```sql
-- 1. Create the table
CREATE TABLE email_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES email_statuses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_json JSONB NOT NULL,
  matched_paper_ids UUID[] DEFAULT ARRAY[]::UUID[],
  primary_paper_id UUID REFERENCES papers(id) ON DELETE SET NULL,
  urgency_level TEXT NOT NULL,
  action_items_count INTEGER DEFAULT 0,
  email_category TEXT NOT NULL,
  relevance_score INTEGER DEFAULT 0,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX idx_email_analyses_user_created 
  ON email_analyses(user_id, created_at DESC);
CREATE INDEX idx_email_analyses_urgency 
  ON email_analyses(user_id, urgency_level);
CREATE INDEX idx_email_analyses_dismissed 
  ON email_analyses(user_id, dismissed);

-- 3. Enable RLS
ALTER TABLE email_analyses ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
CREATE POLICY "Users can read own analyses"
  ON email_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON email_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON email_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON email_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create trigger
CREATE TRIGGER update_email_analyses_updated_at
  BEFORE UPDATE ON email_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Verify setup
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'email_analyses';
```

## Testing the Schema

```sql
-- Test inserting a sample analysis
INSERT INTO email_analyses (
  email_id,
  user_id,
  analysis_json,
  matched_paper_ids,
  primary_paper_id,
  urgency_level,
  action_items_count,
  email_category,
  relevance_score
) VALUES (
  (SELECT id FROM email_statuses LIMIT 1),
  auth.uid(),
  jsonb_build_object(
    'emailId', gen_random_uuid(),
    'analysis', jsonb_build_object(
      'category', 'revision_request',
      'isResearchRelated', true,
      'relevanceScore', 85,
      'keyPoints', jsonb_build_array('Review comments', 'Plan revision'),
      'urgency', 'high',
      'summary', 'Test email'
    ),
    'paperMatches', jsonb_build_array(),
    'nextSteps', jsonb_build_array()
  ),
  ARRAY[]::UUID[],
  NULL,
  'high',
  2,
  'revision_request',
  85
);
```

## Performance Considerations

1. **JSONB Indexing**: The `analysis_json` column uses JSONB for better query performance
2. **Array Indexing**: `matched_paper_ids` is indexed for quick paper lookups
3. **Partial Indexes**: Indexes only include non-dismissed analyses
4. **Materialized View** (Optional): For reporting dashboards

Example materialized view:

```sql
CREATE MATERIALIZED VIEW email_analysis_summary AS
SELECT
  user_id,
  COUNT(*) as total_analyses,
  COUNT(*) FILTER (WHERE urgency_level = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE urgency_level = 'high') as high_count,
  SUM(action_items_count) as total_actions,
  MAX(created_at) as last_analysis
FROM email_analyses
WHERE NOT dismissed
GROUP BY user_id;

CREATE INDEX idx_analysis_summary_user ON email_analysis_summary(user_id);
```
