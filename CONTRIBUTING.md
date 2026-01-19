# Contributing to LancePay 💸

Thank you for your interest in contributing to LancePay! We welcome contributions from the community to help build a better payment platform for Nigerian freelancers.

---

## 🚀 How to Contribute

### 1. Fork the Repository

Click the "Fork" button at the top right of the repository page to create your own copy of the project.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/LancePay.git
cd LancePay
```

### 3. Create a New Branch

Create a descriptive branch name that reflects the feature or fix you're working on:

```bash
# For new features
git checkout -b feat-add-currency-converter

# For bug fixes
git checkout -b fix-invoice-validation-error

# For documentation
git checkout -b docs-update-stellar-guide

# For refactoring
git checkout -b refactor-payment-flow
```

**Branch Naming Convention:**
- `feat-` for new features
- `fix-` for bug fixes
- `docs-` for documentation changes
- `refactor-` for code refactoring
- `chore-` for maintenance tasks

### 4. Make Your Changes

- Write clean, readable code following our [Code Style Guide](./docs/CODE_STYLE.md)
- Keep components under 50 lines when possible
- Keep API routes under 40 lines when possible
- Avoid unnecessary abstractions — less code = less bugs
- Test your changes locally

### 5. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add NGN currency converter to dashboard"
```

**Commit Message Format:**
```
<type>: <description>

[optional body]
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks
- `test:` Adding or updating tests

**Examples:**
```bash
git commit -m "feat: add Yellow Card withdrawal integration"
git commit -m "fix: resolve invoice PDF generation error"
git commit -m "docs: update README with Stellar migration info"
```

### 6. Push to Your Fork

```bash
git push origin YOUR_BRANCH_NAME
```

For example:
```bash
git push origin feat-add-currency-converter
```

### 7. Create a Pull Request

1. Go to the original LancePay repository
2. Click "Pull Requests" → "New Pull Request"
3. Click "compare across forks"
4. Select your fork and branch
5. Fill out the PR template with:
   - **Title:** Clear, descriptive title (e.g., "Add Yellow Card withdrawal integration")
   - **Description:** What changes you made and why
   - **Related Issue:** Link to any related issues (e.g., "Closes #123")
   - **Testing:** How you tested your changes
6. Click "Create Pull Request"

---

## 🔍 Pull Request Guidelines

### Before Submitting

- [ ] Code follows the [Code Style Guide](./docs/CODE_STYLE.md)
- [ ] Changes have been tested locally
- [ ] No console errors or warnings
- [ ] Documentation updated if needed
- [ ] Commit messages are clear and descriptive

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Other (please describe)

## Related Issue
Closes #(issue number)

## How Has This Been Tested?
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes
```

---

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (or Neon account)
- Git

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Useful Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npx prisma studio    # Open database UI
npx prisma migrate dev    # Create new migration
```

---

## 📝 Code Style Guidelines

We follow a **"less code = less bugs"** philosophy. Key principles:

1. **Minimize Abstractions**
   - Don't create utilities for one-time operations
   - Three similar lines > premature abstraction
   - Only abstract when you have 3+ repeated uses

2. **Keep Files Small**
   - Components: Max 50 lines
   - API routes: Max 40 lines
   - If longer, consider splitting

3. **No Over-Engineering**
   - Don't add features beyond what's requested
   - Don't add error handling for scenarios that can't happen
   - Trust internal code and framework guarantees

4. **Clear Naming**
   - Use descriptive variable/function names
   - Avoid abbreviations unless obvious
   - Components should be PascalCase
   - Functions/variables should be camelCase

See [CODE_STYLE.md](./docs/CODE_STYLE.md) for full guidelines.

---

## 🐛 Reporting Bugs

Found a bug? Please create an issue with:

1. **Clear title** describing the bug
2. **Steps to reproduce** the issue
3. **Expected behavior** vs actual behavior
4. **Screenshots** if applicable
5. **Environment details** (browser, OS, etc.)

---

## 💡 Suggesting Features

Have an idea? Create an issue with:

1. **Clear title** describing the feature
2. **Problem statement** — What problem does this solve?
3. **Proposed solution** — How would it work?
4. **Alternatives considered** — Other approaches you thought about
5. **Additional context** — Screenshots, mockups, examples

---

## ❓ Questions?

- Check existing [Issues](https://github.com/davedumto/LancePay/issues)
- Check the [Documentation](./docs/)
- Create a new issue with the "question" label

---

## 🎯 Good First Issues

Looking for where to start? Check out issues labeled:
- `good first issue` — Perfect for newcomers
- `help wanted` — We need community help
- `documentation` — Improve our docs

---

## 📜 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Keep discussions professional

---

## 🙏 Thank You!

Every contribution, no matter how small, helps make LancePay better for Nigerian freelancers. We appreciate your time and effort!

Built with ❤️ for Nigerian freelancers.
