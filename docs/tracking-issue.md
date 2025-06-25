# Tracking Issues: Understanding as a Living Document

## Core Concept

We use GitHub tracking issues to manage ongoing work as evolving understanding documents. Each tracking issue represents not just a task, but the journey of discovering what that task actually means.

The key insight: **Understanding isn't linear - it evolves through exploration.** What starts as "build a dashboard" might become "create an upgrade prompt" as you discover the real need. Our tracking issues capture this evolution.

**This system completely replaces the `.ongoing/` directory approach.** Instead of markdown files tracking work status, we use GitHub issues to capture both current understanding and the journey of discovery.

## Why This Approach?

Traditional task tracking assumes you know what needs to be done. But in real development:

- Requirements clarify through implementation attempts
- "Simple" bugs reveal architectural assumptions
- Feature requests transform as you discover the actual user need
- What seemed like one task splits into three separate concerns

Our tracking issues make this natural evolution visible and valuable, preserving both where we are now and how we got here.

## Anatomy of a Tracking Issue

### The Original Post (OP)

The OP is a living document, continuously updated to reflect current understanding:

#### Current State
- What we believe needs to be done next
- Specific next tasks or steps
- Key constraints and requirements discovered so far
- Architectural decisions or approach

#### Open Questions
- What we're still figuring out
- Known unknowns that affect the work
- Dependencies on external information

#### Lessons Learned
- Major discoveries from the journey so far
- Assumptions that were challenged
- Insights that changed our approach

#### Related Work
- Links to other tracking issues when we discovered separate concerns
- Dependencies that emerged during exploration

### Example OP Structure

```markdown
## Current Understanding

We need to implement client-side encryption for offline PWA support. The core challenge is maintaining user autonomy while enabling secure data sync when online.

## Approach

Using Web Crypto API with:
- PBKDF2 for key derivation from user passphrase
- AES-GCM for data encryption
- IndexedDB for encrypted storage

## Open Questions

- How do we handle passphrase recovery without compromising security?
- Should we support multiple devices? If so, how to sync keys?
- What happens if user changes passphrase while offline?

## Lessons Learned

- Browser crypto APIs are more limited than expected (see comment #3)
- IndexedDB has surprising performance characteristics with large encrypted blobs
- We need to design for "offline-first" not "online with offline support"

## Related Issues

- #47 - Authentication system refactor (blocks multi-device support)
```

### The Comment History

Each comment documents a work session or discovery, capturing:

#### What Happened
- What was attempted or explored
- New information discovered
- Problems encountered

#### How Understanding Changed
- Assumptions that were validated or invalidated
- New constraints that emerged
- Refined understanding of the problem

#### What's Next
- New questions that arose
- Changed direction based on discoveries
- Specific next steps

### Example Comment

```markdown
Explored Web Crypto API limitations today. Key discoveries:

**What I learned:**
- Can't export non-extractable keys (obvious in hindsight)
- This breaks our planned approach for device syncing
- SubtleCrypto is async-only, affects our sync storage layer design

**How this changes things:**
- Need to rethink multi-device story completely
- Either: extractable keys (security trade-off) OR device-specific keys (UX trade-off)
- Storage layer needs async refactor before we can proceed

**New questions:**
- Is device sync a launch requirement or can we defer?
- If we do extractable keys, how do we secure them in transit?

**Next:** Going to explore device-specific keys approach first since it's more secure
```

## The Philosophy: Understanding Through Exploration

### Understanding Evolves in Spirals, Not Lines

When you start working on something, you rarely understand it fully. Through exploration, each discovery transforms previous assumptions:

1. **Initial understanding**: "We need a usage dashboard"
2. **First discovery**: "Users want to see if they're approaching limits"
3. **Deeper insight**: "They're trying to decide whether to upgrade"
4. **Final clarity**: "This isn't a dashboard - it's an upgrade decision tool"

Each revelation changes what the previous discoveries meant. The tracking issue preserves this journey.

### Constraints Reveal Understanding

As you work, you discover constraints that shape the solution:
- "Must work offline" → Changes entire architecture
- "Used by 10,000 users" → Different than "used by 10 users"
- "No external dependencies" → Eliminates many options

Each constraint you discover and document proves deeper understanding of the problem space.

### Unknown Unknowns Are Information

What you don't know is as important as what you do:
- "User count could be 10 or 10,000" → Build for observability
- "Requirements might change next quarter" → Keep it modular
- "We don't know the performance impact" → Add metrics

Documenting these unknowns in the OP helps design around uncertainty.

## Working with Tracking Issues

### Creating a New Tracking Issue

When starting new ongoing work:

1. **Title**: Clear, specific description of the work area
   - ✅ "Implement client-side encryption for offline PWA"
   - ❌ "Encryption work"

2. **Labels**: 
   - `tracking-issue` - Identifies this as an ongoing work item
   - `ai-managed` - Indicates AI should actively participate by updating the OP and adding comments to track progress. Also signals to readers that this is a collaborative AI/human document.
   - Standard labels like `feature`, `bug`, `architecture` as appropriate

3. **Initial OP**: Start with what you know, even if uncertain:
   - Current understanding (even if vague)
   - Initial questions
   - Why this work matters now

### Updating the Tracking Issue

**When to post comments:**
- At checkpoint requests - when the user asks to "checkpoint our work"
- Comments document the work session and discoveries made

**Comment content:**
1. What you did/discovered
2. How it changed your understanding  
3. What questions emerged
4. Progress on current tasks

**When to update the OP:**
- When understanding of the core problem changes
- When new major questions emerge
- When lessons are learned that affect the approach
- When subtasks are completed (even if nothing new was learned)
- When next steps change significantly

**OP updates should ensure:**
- A fresh Claude could read the OP and understand current status
- Next tasks are clearly listed
- Completed work is reflected in current state

**Historical context:** Never delete old comments - they show the journey

### When to Create New Tracking Issues

**Scope Guideline**: Each tracking issue should tackle one "user-facing feature." Examples:
- ✅ "Implement PWA offline support" (one user-facing capability)
- ✅ "Add relationship calculator" (one user-facing feature)
- ❌ "Improve the codebase" (too broad, not user-facing)

**When to Split**: Sometimes exploration reveals you're dealing with multiple separate problems:

```markdown
Started with: "Build usage dashboard"
Discovered: Three separate needs:
- Sales needs lead tracking
- Customers need usage visibility  
- Support needs diagnostic tools

Action: Create three tracking issues, reference in original
```

**Sub-issues**: Create a separate tracking issue (sub-issue) when a major component needs independent design work that should be tackled in isolation first. Always discuss with the human before creating sub-issues - they're for when focusing on a specific component separately would be valuable.

Better to acknowledge separate problems than force a unified solution that serves no one well.

## Benefits of This Approach

### For Solo Work
- Preserves context between work sessions
- Captures learning journey, not just outcomes
- Makes it safe to explore without losing insights

### For AI Collaboration
- AI can read OP for current state
- Can dive into comments for historical context
- Updates maintain continuity across conversations

### For Team Collaboration
- New team members can understand both "what" and "why"
- Decisions have traceable rationale
- Collective understanding emerges from individual discoveries

### For Future You
- Remember why certain approaches were abandoned
- Understand how requirements evolved
- Learn from the journey, not just the destination

## Example: Bug Investigation as Understanding Evolution

**Initial OP:**
```markdown
Users report app hanging on large family trees (>1000 nodes)
```

**After Investigation (Updated OP):**
```markdown
## Current Understanding

Performance degradation is due to O(n²) relationship calculation in expansion logic, not rendering. Happens when calculating relationship paths for display.

## Root Cause

The relationship calculator recursively traverses the entire tree for each node during expansion. With lazy-loading disabled for PWA offline support, this creates massive computation on initial render.

## Approach

Implementing caching layer for relationship calculations with invalidation on tree changes.

## Lessons Learned

- Performance issue was algorithmic, not DOM-related
- Profiler showed time in unexpected code path
- PWA offline requirements conflict with lazy-loading optimization
```

**Comment Trail Shows:**
- Initial assumption about DOM performance
- Discovery through profiling
- Various attempted optimizations
- The "aha" moment finding the real bottleneck

## Anti-Patterns to Avoid

### The Status Report
❌ Comments that just list what was done without insights:
```markdown
- Updated the encryption module
- Fixed some bugs
- Added tests
```

✅ Instead, explain what you learned:
```markdown
Updated encryption module to use extractable keys. This solves the device sync problem but introduces a security trade-off - keys can now be exported. Need to ensure secure transport.
```

### The Hidden Journey
❌ Updating OP without preserving how you got there:
- Deleting "wrong" approaches instead of documenting why they didn't work
- Jumping to solution without showing exploration

✅ Instead, add a comment explaining the discovery, then update the OP

### The Abandoned Issue
❌ Letting tracking issues go stale:
- No updates for weeks
- OP shows outdated understanding
- Questions never get answered

✅ If work is paused, add a comment explaining why and what would need to happen to resume

## Practical Tips

### Good Comment Triggers
Post a comment when you:
- Hit an unexpected limitation or constraint
- Realize an assumption was wrong
- Discover the problem is different than expected
- Find a solution (or rule one out)
- Need to pause work
- Have an "aha!" moment

### OP Update Triggers
Update the OP when:
- Your understanding of the core problem changes
- New major questions emerge
- You've learned lessons that affect the approach
- Related issues are discovered
- The next steps have significantly changed

### Integration with Pull Requests

Pull requests should reference tracking issues (e.g., "Fixes #123" or "Part of #123"). This creates automatic cross-linking between implementation and the understanding evolution.

### Issue Lifecycle

- **Open issues** indicate work that is in-progress or ready to start
- **Closed issues** indicate completed work
- The comment history and final OP state preserve the learning journey for future reference

### Comment Editing Policy

- **Edit recent comments** if you realize they don't accurately reflect what you meant to say
- **Don't edit older comments** just because you learned something new - new learning goes in fresh comments
- **Edit any comment** to correct factual errors
- This preserves the authentic journey of discovery while allowing immediate correction of miscommunication

### Using with AI Assistants

When working with AI (like Claude):
- AI reads the OP first to understand current state  
- AI can review comments for historical context
- Each conversation can add new comments and OP updates
- The `ai-managed` label indicates AI should actively participate by updating OPs and adding comments
- **Important**: AI should draft tracking issue updates and get explicit approval before posting
- **Boundary**: AI should NOT edit OPs or add comments to issues without the `ai-managed` label unless explicitly requested

## FAQ

**Q: How is this different from regular GitHub issues?**
A: Regular issues typically describe a problem or request. Tracking issues capture the evolution of understanding about ongoing work, with the OP continuously updated and comments preserving the discovery journey.

**Q: Can I use tracking issues for small tasks?**
A: Tracking issues work best for work that involves exploration and evolving understanding. For simple, well-understood tasks, regular issues or direct implementation may be more appropriate.

**Q: What if I solve something in one session?**
A: If work completes quickly without significant discovery, a simple comment explaining the solution and closing the issue is fine. The value is in preserving understanding evolution when it occurs.

**Q: How often should I update the OP?**
A: Update when your understanding of the core problem changes, new major questions emerge, or the approach significantly shifts. Not every comment needs an OP update.

## Quick Reference

### Creating a Tracking Issue
1. Clear, specific title describing the user-facing feature
2. Add `tracking-issue` label (and `ai-managed` if appropriate)
3. Initial OP with current understanding, questions, and context
4. Start with what you know, even if uncertain

### Updating a Tracking Issue  
1. Post comment at checkpoint requests documenting the work session
2. Update OP when understanding evolves OR subtasks complete
3. Ensure OP always shows current status and next tasks
4. Preserve historical context - don't delete old comments
5. Link to related issues when work splits or dependencies emerge

### When Comments Get Posted
- At checkpoint requests from the user
- Each comment captures a work session's discoveries and progress

## Remember

These aren't just task trackers - they're understanding evolution documents. The value isn't just in knowing what to do next, but in preserving how we figured out what to do next.

When you read a tracking issue six months later, you should understand not just what was built, but why it was built that way, what alternatives were considered, and what lessons were learned along the way.

The comment history is the journey. The OP is where you are now. Both are valuable.