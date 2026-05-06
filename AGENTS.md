# EssayEngine Agent Instructions

## Project
EssayEngine is a Next.js App Router app for a source-to-final writing workflow.

## Main workflow
Material → Extract → Topic → Process → Review → Export

## Product rule
Navigation contains tools.
Main workspace contains content.
Advanced Studio contains full advanced controls.

## Hard rules
- Do not change API routes unless explicitly requested.
- Do not change prompt construction unless explicitly requested.
- Do not change TopicMaterial runtime unless explicitly requested.
- Do not change Generate logic unless explicitly requested.
- Do not remove existing functionality.
- Do not introduce Tailwind or a new UI library.
- Do not commit `.claude/`.
- Keep changes small and scoped.
- Prefer one task per commit.

## Required check
Always run:

npx tsc --noEmit

before reporting completion.

## Reporting
Every task report must include:
- changed files
- behavior changes
- tsc result
- git status
