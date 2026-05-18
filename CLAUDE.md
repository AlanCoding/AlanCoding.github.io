# CLAUDE.md

This repository is a Jekyll-powered GitHub Pages site with a mix of blog posts and standalone static projects.

## What this site is

- The homepage is [index.html](/home/arominge/repos/AlanCoding.github.io/index.html) and mixes hand-written intro copy with a Jekyll loop over `_posts/`.
- Blog posts live in [`_posts/`](/home/arominge/repos/AlanCoding.github.io/_posts/) and are the right place for write-ups, announcements, abandoned-project notes, and idea essays.
- Standalone interactive experiments live under [`projects/`](/home/arominge/repos/AlanCoding.github.io/projects/). These are usually self-contained pages or folders with their own assets/scripts.
- The projects landing page is [`projects/index.html`](/home/arominge/repos/AlanCoding.github.io/projects/index.html). It currently behaves like a game/experiments hub rather than a generic sitemap.

## Important Jekyll behavior

- The top nav comes from [`_includes/header.html`](/home/arominge/repos/AlanCoding.github.io/_includes/header.html) and renders links for every item in `site.pages` that has a `title`.
- Because of that, new top-level pages should only get front matter and a `title` when they are intentionally meant to appear in the header nav.
- Internal notes, prompts, and implementation briefs should not be left in a user-facing location as normal site pages. Prefer repo docs like `CLAUDE.md` or non-site/internal locations over content that can accidentally read like published site material.

## Content conventions learned here

- If something is a project update or a "this never really went anywhere" write-up, frame it as a post first, even if there is still a playable/demo page under `projects/`.
- Project pages can stay lightweight and functional; context and narrative belong in posts.
- The homepage is expected to grow curated sections over time, not just a posts list.

## Direction from the owner

- "First Breath" should be framed as a blog post about a WIP project that never really got anywhere.
- A future homepage section should cover top space ideas.
- That space-ideas section should live directly on the homepage and start as a bullet-point list with breakout pages behind each item.

## Safe ways to extend the site

- For a new post: add a dated Markdown file in `_posts/` with `layout: post`.
- For a new standalone experience: add a self-contained folder under `projects/` and then decide whether it also deserves a post.
- For a new homepage section: edit [index.html](/home/arominge/repos/AlanCoding.github.io/index.html) directly and keep the existing voice and hand-curated feel.

## Validation

- Run `bundle exec jekyll build` to confirm the site still builds.
- Run `npm test` for the Node tests that cover parts of the projects area.
