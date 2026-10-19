# PRD.md — Product Requirements Document

## 1. Product Vision

**One platform to create, publish, reach out, and reply.** A marketing automation workspace where small businesses manage their website, social media, customer conversations, and sales outreach without switching between disconnected tools.

---

## 2. Problem Statement

Small business owners and marketing teams currently use **6–10 separate tools** for their daily marketing:
- A social media scheduler (Buffer, Hootsuite)
- 4 native platform apps (Instagram, TikTok, YouTube, Facebook)
- An email outreach tool (Instantly, Lemlist)
- A CRM (HubSpot, Pipedrive)
- A design tool (Canva)
- A video editor (CapCut)
- A website builder (Wix, Squarespace)
- A WhatsApp tool (WATI, Respond.io)
- A chatbot/automation tool (ManyChat)

**Pain points:**
1. Context switching wastes 2–3 hours/day
2. Customer messages are scattered across platforms
3. No unified view of marketing performance
4. Follow-ups fall through the cracks
5. Hiring a marketing team is too expensive for SMBs

---

## 3. Target Users

### Primary Personas

| Persona | Description | Key Pain |
|---|---|---|
| **Solo Sarah** | Solopreneur running an e-commerce brand | Does everything alone, needs autopilot |
| **Agency Alex** | Small agency managing 5–10 clients | Needs multi-workspace, team handoff |
| **Team Tina** | Marketing lead at 20-person company | Wants one dashboard for all channels |

### Market Segment
- **Primary:** Small businesses with 1–20 employees
- **Secondary:** Marketing agencies with 5–50 clients
- **Geography:** Global (English-first), with regional pricing

---

## 4. Feature Requirements

### Module 1: Social Publishing

**User Stories:**
- As a user, I want to schedule posts to Instagram, TikTok, YouTube, and Facebook from one calendar
- As a user, I want to draft captions with AI assistance
- As a user, I want to drag posts to reschedule them
- As a user, I want to see which posts are scheduled, published, or failed
- As a user, I want to connect multiple accounts per platform

**Acceptance Criteria:**
- [ ] Post creation form with caption, media upload, platform selection
- [ ] Calendar view with day/week/month toggle
- [ ] Drag-and-drop rescheduling
- [ ] Automatic publishing at scheduled time (±1 minute accuracy)
- [ ] Status indicators: Draft, Scheduled, Publishing, Published, Failed
- [ ] Support for image posts, carousels (IG/FB), and video posts

### Module 2: Unified Inbox

**User Stories:**
- As a user, I want all DMs, comments, and emails in one inbox
- As a user, I want to reply from the inbox without opening each platform
- As a user, I want to label and organize conversations
- As a user, I want AI to draft replies based on my business knowledge

**Acceptance Criteria:**
- [ ] Real-time message ingestion via webhooks
- [ ] Thread view with sender info, platform badge, and message history
- [ ] Reply compose box with AI suggestion button
- [ ] Labels system (custom tags per thread)
- [ ] Read/unread status
- [ ] Search across all threads
- [ ] Autopilot mode: AI sends replies automatically (with approval toggle)

### Module 3: Graphics Studio

**User Stories:**
- As a user, I want to design social posts without leaving the app
- As a user, I want templates for common post sizes
- As a user, I want to send designs directly to the calendar

**Acceptance Criteria:**
- [ ] Layered canvas editor (text, images, shapes, backgrounds)
- [ ] Template library (IG feed, IG story, FB post, YouTube thumbnail)
- [ ] Brand kit integration (colors, fonts, logo)
- [ ] Export to PNG/JPG
- [ ] "Schedule this" button → creates post with the design attached

### Module 4: Video Studio

**User Stories:**
- As a user, I want to generate short videos with AI
- As a user, I want to add captions, music, and voice-over
- As a user, I want to schedule videos to TikTok and YouTube

**Acceptance Criteria:**
- [ ] AI video generation from text prompt
- [ ] Timeline editor with clips, captions, audio tracks
- [ ] Auto-caption generation (speech-to-text)
- [ ] Music library (royalty-free)
- [ ] Export to MP4 or direct schedule

### Module 5: Website Builder

**User Stories:**
- As a user, I want to build a simple business website
- As a user, I want AI to generate page content
- As a user, I want to connect my own domain

**Acceptance Criteria:**
- [ ] Block-based visual editor
- [ ] AI page generation from business description
- [ ] Responsive preview (mobile, tablet, desktop)
- [ ] Custom domain with SSL
- [ ] Contact form integration

### Module 6: AI Finder (Lead Discovery)

**User Stories:**
- As a user, I want to find potential customers in a specific location and industry
- As a user, I want to build a contact list from search results
- As a user, I want to send the list to email outreach

**Acceptance Criteria:**
- [ ] Search by industry + location + size
- [ ] Results show business name, email, phone, website, staff count
- [ ] Save to dataset / export to CSV
- [ ] "Send to campaign" action

### Module 7: Email Outreach

**User Stories:**
- As a user, I want to send personalized email sequences from my Gmail
- As a user, I want follow-ups to stop when someone replies
- As a user, I want to track open rates and click rates

**Acceptance Criteria:**
- [ ] Gmail OAuth connection
- [ ] Sequence builder: initial email + up to 5 follow-ups
- [ ] Template variables: {{firstName}}, {{company}}, etc.
- [ ] Automatic reply detection → stop sequence
- [ ] Open tracking (pixel) and click tracking (link wrapping)
- [ ] Campaign analytics dashboard

### Module 8: WhatsApp

**User Stories:**
- As a user, I want to send WhatsApp broadcasts to my contact list
- As a user, I want to reply to WhatsApp messages from the inbox
- As a user, I want automated WhatsApp follow-ups

**Acceptance Criteria:**
- [ ] WhatsApp Business API connection
- [ ] Broadcast to contact lists (template messages)
- [ ] Two-way conversation in unified inbox
- [ ] Automated follow-up sequences

---

## 5. Competitive Analysis

| Feature | **Us** | Buffer | Hootsuite | HubSpot | ManyChat |
|---|---|---|---|---|---|
| Social scheduling | ✅ | ✅ | ✅ | ✅ | ❌ |
| Unified inbox | ✅ | ❌ | ✅ | ✅ | Partial |
| AI content generation | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI auto-replies | ✅ | ❌ | ❌ | ❌ | ✅ |
| Graphics studio | ✅ | ❌ | ❌ | ❌ | ❌ |
| Video studio | ✅ | ❌ | ❌ | ❌ | ❌ |
| Website builder | ✅ | ❌ | ❌ | ✅ | ❌ |
| Email outreach | ✅ | ❌ | ❌ | ✅ | ❌ |
| WhatsApp | ✅ | ❌ | ❌ | ❌ | ✅ |
| Lead discovery | ✅ | ❌ | ❌ | ❌ | ❌ |
| Comment-to-DM automation | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Starting price** | ~$29/mo | $6/mo | $99/mo | $20/mo | $15/mo |

**Our differentiator:** The only platform that combines **all 8 modules** in one workspace at an SMB-friendly price point. Competitors either focus on one area or charge enterprise prices.

---

## 6. Success Metrics

| Metric | Target (Month 3) | Target (Month 12) |
|---|---|---|
| **Registered users** | 500 | 5,000 |
| **Activation rate** (connected ≥1 channel) | 40% | 55% |
| **Day-7 retention** | 30% | 45% |
| **Paid conversion** (trial → paid) | 8% | 15% |
| **Monthly Recurring Revenue** | $2,000 | $25,000 |
| **Churn rate** (monthly) | <10% | <6% |
| **NPS** | 30+ | 50+ |

---

## 7. Pricing Strategy

| Plan | Monthly | Yearly (per month) | Target |
|---|---|---|---|
| **Starter** | $29 | $16 (44% off) | Solo users |
| **Scale** | $79 | $49 (38% off) | Teams |
| **Self-Hosted** | Custom | Custom | Enterprise |

- **Free trial:** 30 days, Starter limits, no credit card required
- **AI credits:** Included monthly, top-up available
- **Regional pricing:** Localized via exchange rates for 50+ currencies

---

## 8. Go-to-Market Strategy

1. **Launch on Product Hunt** — target #1 Product of the Day
2. **Content marketing** — blog posts, email templates library, social media glossary (SEO play)
3. **Comparison pages** — "Automyc vs Buffer", "Automyc vs ManyChat" (bottom-of-funnel SEO)
4. **YouTube tutorials** — demo workflows, "day in the life" content
5. **AppSumo launch** — lifetime deal for early adopter feedback
6. **Affiliate program** — 30% recurring commission
7. **Agency partnerships** — white-label or referral program

---

## 9. Phased Roadmap Summary

| Phase | Timeline | Key Deliverables |
|---|---|---|
| **Phase 1 (MVP)** | Weeks 1–8 | Social publishing (IG+FB), inbox, AI replies, billing |
| **Phase 2** | Months 3–5 | TikTok + YouTube, email outreach, WhatsApp, automations |
| **Phase 3** | Months 6–9 | Graphics studio, video studio, website builder, AI Finder |
| **Phase 4** | Months 10–14 | Platform API, mobile app, self-hosted, enterprise features |
