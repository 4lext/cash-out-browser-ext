# Contributing to cash-out

First off, thank you for considering contributing to cash-out! It's people like you that make cash-out such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code samples, HTML input that causes issues)
- **Describe the behavior you observed** and what you expected
- **Include screenshots** if applicable
- **Include your environment details**:
  - OS and version
  - Browser and version (for browser issues)
  - Node.js/Bun version (for server issues)
  - cash-out version

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternative solutions** you've considered

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- Git
- A code editor (we recommend VS Code)

### Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/your-username/cash-out.git
   cd cash-out
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Run tests to ensure everything is working:

   ```bash
   bun test
   ```

4. Start development:
   ```bash
   bun run dev
   ```

### Project Structure

```
cash-out/
├── src/
│   ├── browser/       # Browser-specific implementation
│   ├── server/        # Server-specific implementation
│   ├── core/          # Core conversion logic
│   ├── types/         # TypeScript type definitions
│   └── utilities/     # Shared utilities
├── examples/          # Usage examples
├── scripts/           # Build and utility scripts
└── tests/            # Test files
```

### Development Workflow

1. **Create a branch** for your feature or fix:

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** and commit them:

   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   We use [Conventional Commits](https://www.conventionalcommits.org/):

   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation changes
   - `style:` formatting, missing semicolons, etc.
   - `refactor:` code change that neither fixes a bug nor adds a feature
   - `perf:` performance improvements
   - `test:` adding missing tests
   - `chore:` maintain

3. **Write/update tests** for your changes:

   ```bash
   bun test src/your-file.test.ts
   ```

4. **Run the full test suite**:

   ```bash
   bun test
   bun run typecheck
   bun run lint
   ```

5. **Update documentation** if needed

6. **Push your branch** and create a Pull Request

### Testing

We use Bun's built-in test runner. Tests should:

- Be located next to the code they test (e.g., `converter.ts` → `converter.test.ts`)
- Use descriptive test names
- Test both success and error cases
- Include edge cases

Example test:

```typescript
import { describe, expect, it } from 'bun:test';

import { convertToMarkdown } from './index';

describe('convertToMarkdown', () => {
  it('converts simple HTML to markdown', async () => {
    const result = await convertToMarkdown('<h1>Hello</h1>');
    expect(result.markdown).toBe('# Hello');
  });

  it('handles invalid HTML gracefully', async () => {
    await expect(convertToMarkdown('<h1>Unclosed')).rejects.toThrow('Invalid HTML');
  });
});
```

### Code Style

- We use ESLint and Prettier for code formatting
- Run `bun run lint:fix` to automatically fix style issues
- Follow TypeScript best practices
- Prefer functional programming patterns where appropriate
- Write self-documenting code with clear variable names

### Documentation

- Update README.md for user-facing changes
- Update API.md for API changes
- Add JSDoc comments for exported functions
- Include code examples in documentation

### Performance Considerations

cash-out is performance-critical. When contributing:

- Profile your changes for performance impact
- Avoid unnecessary allocations
- Prefer built-in methods over custom implementations
- Consider memory usage for large inputs
- Add performance tests for critical paths

### Security Considerations

- Never use `eval()` or `innerHTML` for parsing
- Always sanitize URLs and user input
- Follow the security guidelines in SECURITY.md
- Add tests for security-related changes
- Consider potential DoS vectors

## Release Process

Releases are automated via GitHub Actions when a new tag is pushed:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Commit changes: `git commit -m "chore: release v0.2.0"`
4. Tag the release: `git tag v0.2.0`
5. Push: `git push origin main --tags`

## Questions?

Feel free to open an issue with your question or reach out to the maintainers directly.

## Financial Contributions

We also welcome financial contributions. Please consider:

- Sponsoring the maintainers on GitHub Sponsors
- Contributing to our Open Collective
- Hiring the maintainers for consulting

## Recognition

Contributors will be recognized in:

- The project README
- Release notes
- Our website (when launched)

Thank you for contributing to cash-out! 🎉
