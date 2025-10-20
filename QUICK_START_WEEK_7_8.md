# Quick Start: Week 7-8 Communication Hub

**Current Progress**: 132/520 hours complete (25.4%)  
**Last Completed**: Week 5-6 Drag-Drop Menu Builder ✅  
**Next Task**: Week 7-8 Communication Hub (48 hours)

---

## 🎯 Week 7-8 Objectives

Build a comprehensive communication system for catering management:

### Components to Create (3 main components)

1. **InboxPanel.tsx** (~300 lines)
   - In-app messaging dashboard
   - Conversation threads
   - Message composition
   - Real-time updates (optional: Socket.io or polling)
   - Filter by customer, status, date
   - Unread badge counts
   - Quick reply templates

2. **EmailTemplates.tsx** (~350 lines)
   - Template library for common emails:
     - Order confirmation
     - Quote sent
     - Payment reminder
     - Event reminder (day before)
     - Thank you / feedback request
     - Custom templates
   - Template editor with placeholders:
     - `{{customer_name}}`
     - `{{event_date}}`
     - `{{package_name}}`
     - `{{total_amount}}`
   - Preview mode
   - Send test email
   - Save/edit templates

3. **SMSIntegration.tsx** (~250 lines)
   - Twilio integration for SMS
   - SMS campaign builder
   - Quick SMS templates:
     - Order confirmation
     - Event reminder
     - Payment link
     - Custom message
   - Contact selection (single or bulk)
   - Character count (160 char limit)
   - Send history
   - Delivery status tracking

### Integration Points

**Modified Files**:
- `apps/client-dashboard/src/pages/CateringManagement.tsx`
  - Add "Communications" tab to main tabs
  - Create sub-tabs: Inbox, Email Templates, SMS

**New Hooks**:
- `useCateringMessages` - Fetch and manage in-app messages
- `useEmailTemplates` - Manage email template CRUD
- `useTwilioSMS` - Send SMS via Twilio integration

**Backend Requirements**:
- Supabase table: `catering_messages` (in-app messaging)
- Supabase table: `email_templates` (template storage)
- Edge Function: `send-sms` (Twilio proxy)
- Edge Function: `send-email` (email sending via Resend or similar)

---

## 🏗️ Architecture

### Database Schema (Proposed)

```sql
-- In-app messages
CREATE TABLE catering_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID REFERENCES catering_orders(id),
  sender_id UUID REFERENCES auth.users(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  placeholders TEXT[], -- ['customer_name', 'event_date', etc.]
  category TEXT, -- 'confirmation', 'reminder', 'quote', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS history
CREATE TABLE sms_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID REFERENCES catering_orders(id),
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  twilio_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Component Structure

```
apps/client-dashboard/src/components/catering/
  communications/
    InboxPanel.tsx          # In-app messaging dashboard
    EmailTemplates.tsx      # Email template manager
    SMSIntegration.tsx      # SMS sending interface
    MessageThread.tsx       # Individual conversation view
    TemplateEditor.tsx      # Email template editor with placeholders
    SMSComposer.tsx         # SMS composition form
    index.ts               # Barrel export
```

---

## 🎨 Features to Implement

### In-App Messaging (InboxPanel)
- [ ] Message list with threads
- [ ] Unread count badge
- [ ] Filter by: All, Unread, Customer, Date
- [ ] Search messages
- [ ] Compose new message
- [ ] Reply to thread
- [ ] Mark as read/unread
- [ ] Archive messages
- [ ] Real-time updates (polling every 30s)

### Email Templates
- [ ] Template library (5 default templates)
- [ ] Create new template
- [ ] Edit template (subject, body, placeholders)
- [ ] Rich text editor (or Markdown)
- [ ] Placeholder replacement preview
- [ ] Send test email
- [ ] Template categories
- [ ] Duplicate template
- [ ] Delete template

### SMS Integration
- [ ] Twilio account connection
- [ ] Phone number configuration
- [ ] SMS composer with character count
- [ ] Quick templates
- [ ] Recipient selection (single or bulk)
- [ ] Send SMS
- [ ] Delivery status tracking
- [ ] SMS history table
- [ ] Cost estimation (per SMS)

---

## 🔧 Implementation Steps

### Step 1: Database Setup
1. Create Supabase migrations for 3 new tables
2. Add RLS policies for tenant isolation
3. Test with SQL editor

### Step 2: Edge Functions
1. Create `send-email` Edge Function
   - Use Resend API or similar
   - Template variable replacement
   - Error handling
2. Create `send-sms` Edge Function
   - Twilio API integration
   - Phone number validation
   - Delivery status webhook

### Step 3: React Hooks
1. Create `useCateringMessages.ts`
   - Fetch messages for tenant
   - Create new message
   - Mark as read
   - Archive message
2. Create `useEmailTemplates.ts`
   - Fetch templates
   - CRUD operations
   - Send email with template
3. Create `useTwilioSMS.ts`
   - Send SMS
   - Fetch SMS history
   - Check delivery status

### Step 4: UI Components
1. Create InboxPanel
2. Create EmailTemplates
3. Create SMSIntegration
4. Create supporting components (MessageThread, TemplateEditor, SMSComposer)

### Step 5: Integration
1. Add "Communications" tab to CateringManagement
2. Add sub-tabs for Inbox, Email, SMS
3. Connect components to hooks
4. Test end-to-end flow

---

## 📦 Dependencies

### Required Packages
```bash
# Twilio SDK
npm install twilio

# Rich text editor (optional)
npm install @tiptap/react @tiptap/starter-kit

# Or Markdown editor
npm install react-markdown remark-gfm
```

### Environment Variables
```env
# Twilio (add to Supabase Edge Function secrets)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email service (Resend or similar)
RESEND_API_KEY=your_resend_key
```

---

## 🚀 Deployment Workflow

1. **Develop locally**: `npm run dev:client`
2. **Test components**: Manual testing in browser
3. **Deploy Edge Functions**: `supabase functions deploy <function-name>`
4. **Commit and push**: Triggers Vercel auto-deploy
5. **Verify in production**: Test on app.blunari.ai

---

## 📊 Expected Outcomes

After Week 7-8 completion:
- ✅ In-app messaging system with threads
- ✅ Email template library with 5 default templates
- ✅ SMS integration with Twilio
- ✅ Message history and tracking
- ✅ ~900 lines of new code
- ✅ 180/520 hours complete (34.6%)

**Next**: Week 9-10 Advanced Analytics (40 hours)

---

## 🎯 To Continue

Simply say **"continue"** and I'll start implementing:
1. Database migrations for messaging tables
2. Edge Functions for email and SMS
3. React hooks for data management
4. UI components (InboxPanel, EmailTemplates, SMSIntegration)
5. Integration with CateringManagement
6. Testing and deployment

Ready to build the Communication Hub! 🚀
