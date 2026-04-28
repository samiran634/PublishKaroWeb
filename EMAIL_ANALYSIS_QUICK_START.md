# Email Analysis Feature - Quick Start (5 Minutes)

## What You're Getting

An AI-powered system that:
1. Analyzes research emails automatically
2. Matches them to your papers
3. Generates next steps/tasks

## Installation (3 Steps)

### Step 1: Database (2 min)

1. Open Supabase Dashboard → SQL Editor
2. Copy entire content from `DATABASE_SCHEMA_EMAIL_ANALYSIS.md`
3. Click "Run" to execute all SQL

✅ Done! Table and security policies created.

### Step 2: Add Route (1 min)

Open `src/routes.tsx` and add:

```tsx
import EmailAnalysisHub from '@/pages/EmailAnalysisHub';

// In your routes array:
{
  path: '/email-analysis',
  element: <EmailAnalysisHub />,
}
```

### Step 3: Add Navigation (1 min)

In your header/nav component, add link:

```tsx
import { Brain } from 'lucide-react';

// In your navigation menu:
<Link to="/email-analysis" className="flex items-center gap-2">
  <Brain className="h-4 w-4" />
  Email Analysis
</Link>
```

## Usage

1. Go to `/email-analysis` in your app
2. See "Unanalyzed Emails" alert
3. Click "Analyze All" (or analyze individual emails)
4. Wait 3-5 seconds per email
5. See AI results:
   - Email category
   - Matched papers with scores
   - Next steps with priorities
6. Click "Link" to associate with a paper
7. Click "Create Tasks" to generate action items

## What Happens Behind the Scenes

```
Your Email
   ↓
Gemini AI analyzes content
   ↓
System matches to your papers using keywords
   ↓
Generates specific next steps
   ↓
Stores in database with full details
   ↓
Beautiful UI shows everything
```

## Example Analysis

### Input Email
```
Subject: Major Revisions Requested for Your Paper
From: editor@journal.org

Dear Author,
We have reviewed your manuscript on "Deep Learning Methods".
The reviewers have provided detailed comments that require major revisions...
```

### AI Output

**Category:** revision_request
**Urgency:** critical
**Matched Papers:** 
- "Deep Learning Methods" (95% match)
- "Neural Network Architecture" (42% match)

**Next Steps:**
1. 📋 Review reviewer comments (45 min, critical, due in 7 days)
2. 📅 Create revision plan (30 min, critical, due in 7 days)
3. ✏️ Update paper (3 hours, high, due in 14 days)
4. 📝 Write revision response (1.5 hours, high, due in 14 days)

## Features Explained

### Email Categories (7 types)
- 📝 Revision request → Actions: review, plan, update, respond
- 💬 Reviewer feedback → Actions: analyze, extract suggestions
- ✅ Acceptance → Actions: check requirements
- ❌ Rejection → Actions: plan resubmission
- ⏰ Deadline → Actions: note date, schedule prep
- ❓ Query response → Actions: review answer
- 🔕 Non-research → Filtered out

### Paper Matching
Smart keyword matching on:
- Paper title (strongest match)
- Abstract
- Keywords you set
- Full content

Score ranges 0-100, only shows matches >30.

### Next Steps
Specific, actionable tasks for each email type:
- Estimated time to complete
- Priority level (critical → high → medium → low)
- Due date guidance
- Clear description of what to do

### Priority Colors
- 🔴 Critical - Red (action needed immediately)
- 🟠 High - Orange (this week)
- 🟡 Medium - Yellow (soon)
- ⚪ Low - Gray (when you get to it)

## Files Created (You Don't Need to Edit)

```
✅ src/lib/email-analysis.ts (600 lines)
✅ src/lib/email-analysis-db.ts (250 lines)
✅ src/components/EmailAnalysisCard.tsx (250 lines)
✅ src/components/EmailAnalysisPanel.tsx (400 lines)
✅ src/hooks/use-email-analysis.ts (150 lines)
✅ src/pages/EmailAnalysisHub.tsx (400 lines)
✅ DATABASE_SCHEMA_EMAIL_ANALYSIS.md
✅ EMAIL_ANALYSIS_INTEGRATION_GUIDE.md (detailed guide)
✅ EMAIL_ANALYSIS_CHECKLIST.md (step-by-step)
```

## Verify It Works

1. Go to `/email-analysis` in your app
2. You should see a dashboard with:
   - 3 stat cards (Emails Analyzed, Critical Actions, Total Items)
   - "No Analyzed Emails Yet" message
   - Load button or "Analyze All" button
3. If you see this → ✅ Installation successful!

## If Something Goes Wrong

### "Can't load page"
- Check route was added correctly
- Restart dev server

### "Analyze button doesn't work"
- Check VITE_GEMINI_API_KEY in `.env.local`
- Get key from: https://makersuite.google.com/app/apikey

### "No papers matched"
- Email might not be research-related
- Manually select a paper using "Associate Paper"

### Database error
- Run the SQL migration from DATABASE_SCHEMA_EMAIL_ANALYSIS.md again
- Make sure you're in the right Supabase project

## Next: Optional Enhancements

### Link with EmailMonitor
Add analyze button next to each email:

```tsx
// In EmailMonitor.tsx
import { useEmailAnalysis } from '@/hooks/use-email-analysis';

const { analyzeEmailContent } = useEmailAnalysis();

// In your email display:
<Button onClick={() => analyzeEmailContent(email, papers)}>
  <Sparkles className="h-4 w-4 mr-1" />
  Analyze
</Button>
```

### Auto-Create Tasks
When user clicks "Create Tasks", integrate with your task system:

```tsx
const handleCreateTask = async (action: string, paperId?: string) => {
  // Create task in your database
  // Connect to your task management system
};
```

## Support

**Detailed Guide:** Read `EMAIL_ANALYSIS_INTEGRATION_GUIDE.md`
**Setup Checklist:** Follow `EMAIL_ANALYSIS_CHECKLIST.md`
**Database Info:** See `DATABASE_SCHEMA_EMAIL_ANALYSIS.md`
**API Docs:** https://ai.google.dev/

## What's Next

✅ Email analysis running
→ Add to EmailMonitor page
→ Create task automation
→ Add scheduled analysis
→ Build analytics dashboard

---

**Time to Setup**: 5 minutes  
**Time to First Analysis**: 10 seconds  
**Production Ready**: Yes ✅
