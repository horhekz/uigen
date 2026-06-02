# Audit

Review the current codebase for issues across these areas:

1. **Security** — auth flows, JWT handling, input validation, exposed secrets
2. **Performance** — unnecessary re-renders, missing memoization, large bundle contributors
3. **Error handling** — unhandled promise rejections, missing error boundaries, uncaught API failures
4. **Type safety** — `any` types, missing return types, unsafe casts

For each issue found, report: file path + line number, what the problem is, and a suggested fix. Skip anything already handled correctly.
