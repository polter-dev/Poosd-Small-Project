### 1. **README Summary (Required)**

Include a dedicated "AI Assistance" section with:

**Required fields:**

- **Tool(s)**: Name and version (e.g., "Claude 3.5 Sonnet, accessed via claude.ai")
- **Date(s)**: When assistance was used
- **Scope**: High-level description of what AI helped with
- **Nature of use**: How you used it (debugging, explanation, code generation, refactoring, etc.)

**Example format:**

```markdown
## AI Assistance Disclosure

This project was developed with assistance from generative AI tools:

- **Tool**: Claude 3.5 Sonnet (Anthropic, claude.ai)
- **Dates**: January 3-5, 2026
- **Scope**: Algorithm design for binary search tree implementation, 
  debugging segmentation faults, explanation of memory allocation patterns
- **Use**: Generated initial BST structure (substantially modified), 
  helped diagnose pointer errors, provided explanations that informed 
  my implementation approach

All AI-generated code was reviewed, tested, and modified to meet 
assignment requirements. Final implementation reflects my understanding 
of the concepts.
```

### 2. **Inline Comments (Situational)**

Use inline comments **only** when:

- AI directly generated a substantial code block you kept largely intact
- The approach or algorithm was specifically suggested by AI
- Your instructor specifically requires granular attribution

**Suggested inline format:**

```python
# AI-assisted: Initial implementation suggested by Claude (modified for edge cases)
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    # ... rest of code
```

## What to Avoid

- Don't cite every time you asked AI a question—focus on code that made it into your submission
- Don't over-cite to the point where comments obscure your code
- Don't under-disclose by omitting substantial AI contributions

