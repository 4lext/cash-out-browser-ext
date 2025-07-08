# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

We take the security of cash-out seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

Email us at: security@[yourdomain].com

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will confirm the vulnerability and determine its impact within 5 business days
- We will release a fix as soon as possible, depending on complexity
- We will credit you in the release notes (unless you prefer to remain anonymous)

## Security Features

cash-out includes several security features to protect against common vulnerabilities:

### 1. Input Sanitization

- All HTML is parsed using the secure DOMParser API
- No use of `innerHTML` or `eval()`
- Event handlers are stripped from all elements
- Dangerous URL protocols are blocked (javascript:, data:, vbscript:, etc.)

### 2. Resource Limits

- Maximum input size limits (default 10MB, configurable)
- Conversion timeout protection
- Maximum DOM nesting depth checks
- Memory usage constraints

### 3. Content Security

- XSS protection through proper escaping
- No external resource loading
- No script execution
- Sandboxed execution in Web Workers (browser)

### 4. Safe Defaults

- Conservative security settings by default
- Opt-in for less secure features
- Clear documentation of security implications

## Security Best Practices

When using cash-out in your application:

### 1. Always Validate Input

```javascript
// Validate input size before conversion
if (html.length > MAX_ALLOWED_SIZE) {
  throw new Error('Input too large');
}

// Use the built-in size limits
const result = await convertToMarkdown(html, {
  maxInputSize: 5 * 1024 * 1024, // 5MB
});
```

### 2. Handle Errors Properly

```javascript
try {
  const result = await convertToMarkdown(untrustedHtml);
} catch (error) {
  if (error instanceof SecurityError) {
    // Log security incidents
    console.error('Security violation detected:', error);
    // Don't expose detailed error messages to users
    showUserError('Content could not be processed');
  }
}
```

### 3. Use Content Security Policy

When using cash-out in web applications, implement proper CSP headers:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  worker-src 'self';
  object-src 'none';
"
/>
```

### 4. Rate Limiting

Implement rate limiting to prevent DoS attacks:

```javascript
const rateLimiter = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimits = rateLimiter.get(userId) || [];

  // Remove old entries (older than 1 minute)
  const recentRequests = userLimits.filter((time) => now - time < 60000);

  if (recentRequests.length >= 10) {
    throw new Error('Rate limit exceeded');
  }

  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
}
```

### 5. Sanitize Output Context

While cash-out produces safe Markdown, always consider the context where it will be used:

```javascript
// If displaying in HTML, use a Markdown parser with HTML sanitization
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const markdown = result.markdown;
const html = marked(markdown);
const safeHtml = DOMPurify.sanitize(html);
```

## Known Security Considerations

### 1. ReDoS (Regular Expression Denial of Service)

cash-out uses carefully crafted regular expressions to avoid ReDoS attacks. All regex patterns are tested against malicious inputs.

### 2. Memory Exhaustion

Large or deeply nested DOM structures could potentially cause memory issues. We mitigate this with:

- Maximum nesting depth limits
- Input size limits
- Timeout protection

### 3. CPU Exhaustion

Complex HTML structures might consume significant CPU. Mitigations:

- Web Worker isolation (browser)
- Timeout limits
- Optimization levels to simplify complex structures

## Security Audit

cash-out undergoes regular security reviews:

- Automated dependency scanning via npm audit
- Regular penetration testing
- Code review for all security-related changes
- Fuzzing tests for input validation

## Responsible Disclosure

We believe in responsible disclosure and will:

1. Work with security researchers to understand and fix issues
2. Publicly disclose vulnerabilities after fixes are available
3. Credit researchers who report valid issues (with permission)
4. Never pursue legal action against good-faith security research

Thank you for helping keep cash-out and its users safe!
