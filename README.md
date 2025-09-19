[Visit AlanCoding.github.io](https://alancoding.github.io)

# AlanCoding.github.io

This repository contains the source for [Alan Rominger](https://github.com/AlanCoding)'s GitHub Pages site. The site is generated with [Jekyll](https://jekyllrb.com/) and includes blog posts, reusable layouts/includes, and an `old/` directory that preserves pre-Jekyll static demos.

## Getting started

1. Install [Ruby](https://www.ruby-lang.org/) (3.1 or newer is recommended to match GitHub Pages).
2. Install [Bundler](https://bundler.io/) if it is not already available: `gem install bundler`.
3. Install the site dependencies:
   ```bash
   bundle install
   ```

## Local development

Serve the site locally with Jekyll's development server:

```bash
bundle exec jekyll serve --livereload
```

The site will be available at [http://localhost:4000](http://localhost:4000). Changes to source files will trigger automatic rebuilds while the server is running.

To create a production build without serving it, run:

```bash
bundle exec jekyll build
```

The generated site will be placed in the `_site/` directory.

## Repository layout

- `_posts/` — Markdown posts that populate the blog index.
- `_layouts/` and `_includes/` — Liquid templates used to render pages.
- `_sass/` and `css/` — Stylesheets and Sass partials.
- `about.md` — Example static page included in the navigation.
- `old/` — Archived static HTML, JavaScript, and assets from the original site prior to adopting Jekyll.

## Deployment

GitHub Pages automatically builds and publishes the site whenever updates are pushed to the default branch. No additional deployment steps are required.

## Updating dependencies

Dependencies are managed with Bundler. To update to the latest versions permitted by the `Gemfile`, run:

```bash
bundle update
```

After updating, rebuild the site and verify that pages still render correctly before committing the changes.
