# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Full-stack with server-side rendering. Recommendation: Next.js for rapid iteration, built-in API routes, and excellent mobile performance. Alternative: Astro for static-first approach with JavaScript where needed.

## Users

Personal finance users who want to track everyday spending and manage budgets without complexity. Primary use case: on mobile devices (phone), during everyday transactions, to quickly log expenses and understand where money goes. Secondary use case: desktop review and analysis of spending patterns.

## Product Purpose

Provide a lightweight, fast money management tool that gets out of the way. Users log expenses, see categories, and understand their spending in real time. Success means zero friction between thought and action: a purchase happens, the app records it in seconds, and users see their budget impact immediately.

## Positioning

**Simpler than Mint/YNAB, faster than spreadsheets.** Removes feature bloat; focuses on the core job: log spending, see totals by category, stay within budget. No fancy charts, no AI, no premium tiers. Just clarity.

## Operating Context

- Workflow: User makes purchase → logs it on phone in <10 seconds → continues their day
- Environment: Mobile first (Android/iOS via web), secondarily used on desktop for review
- Rituals: Daily check-in to log spending; weekly/monthly review of category totals and budget status
- Terminology: transactions, categories, budgets, balance, spending (not "expense," not "payment")

## Capabilities and Constraints

**Core features (MVP):**
- Create budgets per category (groceries, transport, entertainment, etc.)
- Log transactions with amount, category, and optional note
- View current spending vs. budget per category
- See total balance and spending this month
- Simple transaction history

**Intentionally excluded (v1):**
- Recurring/scheduled transactions
- Bill payments or bank integration
- Investment tracking
- Multi-user accounts
- Offline mode

**Technical constraints:**
- Mobile-first responsive design; desktop is secondary
- Performance: page load <2s on 4G; interaction response <200ms
- Storage: browser local storage initially (no backend required unless user wants cloud sync later)

## Brand Commitments

- **Free and open-source**: No paywalls, no ads, no data collection
- **Privacy-first**: User data stays local; transparent about any server storage
- **Hobby project**: Clear, honest communication; no corporate polish required
- **Minimal aesthetic**: Function over decoration; clarity over complexity

## Evidence on Hand

- No existing app, branding, or customer testimonials (greenfield)
- No competing product commitments or legacy constraints

## Product Principles

1. **Speed first**: Every interaction should feel instant; lazy loading and optimization are non-negotiable
2. **Clarity over features**: One clear path to log and review spending; complex features are "nice to have"
3. **Mobile is primary**: Design, test, and optimize for phones first; desktop is a bonus
4. **Privacy by default**: No tracking, no ads, no upselling; user data is theirs alone
5. **Honest design**: Show the product as it is; no fake testimonials or exaggerated claims

## Accessibility & Inclusion

WCAG AA compliance required. Specific needs:
- Keyboard navigation throughout (Tab, Enter, Escape patterns)
- Semantic HTML and ARIA labels for screen readers
- Sufficient color contrast (4.5:1 for text)
- Touch targets ≥44px for mobile
- Clear error messages and form validation
