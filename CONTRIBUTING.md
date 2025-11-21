# Contributing to Kuro

Thank you for your interest in contributing to Kuro!

## Development Setup

1. **Install Bun:**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Clone the repository:**
   ```bash
   git clone https://github.com/ilhamjaya08/kuro.git
   cd kuro
   ```

3. **Install dependencies:**
   ```bash
   bun install
   ```

4. **Run in development mode:**
   ```bash
   bun run dev
   ```

## Project Structure

```
kuro/
├── src/
│   ├── cli/          # Interactive CLI interface
│   ├── core/         # Core functionality (scheduler, executor, daemon)
│   ├── db/           # Database layer (SQLite)
│   ├── utils/        # Utilities (curl parser, cron validator)
│   └── index.ts      # Entry point
├── install/          # Installation scripts
└── scripts/          # Build scripts
```

## Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Test your changes:
   ```bash
   bun run src/index.ts
   ```

4. Build to ensure it compiles:
   ```bash
   bun run build
   ```

5. Commit your changes:
   ```bash
   git commit -m "Add: your feature description"
   ```

6. Push and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style

- Use TypeScript
- Follow existing code style
- Add comments for complex logic
- Keep functions small and focused

## Adding New Features

When adding new features:

1. Update the database schema if needed (in `src/db/index.ts`)
2. Add models/types in `src/db/models.ts`
3. Implement business logic in `src/core/`
4. Add CLI interface in `src/cli/`
5. Update README.md with examples
6. Test thoroughly

## Testing

Currently, testing is manual. We welcome contributions for automated testing!

To test:
1. Run the app: `bun run src/index.ts`
2. Create tasks with various configurations
3. Verify task execution
4. Check logs
5. Test daemon start/stop

## Reporting Bugs

When reporting bugs, please include:
- Your OS and version
- Bun version (`bun --version`)
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

## Feature Requests

Feature requests are welcome! Please:
1. Check existing issues first
2. Describe the feature and use case
3. Explain why it would be useful

## Questions?

Open an issue with the "question" label.

Thank you for contributing!
