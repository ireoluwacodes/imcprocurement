# Integra Mission Critical Procurement

Purchase requests, equipment substitutions and material transfers in one procurement system.
See [roadmap.md](roadmap.md) for what's built and what's next.

## Development

Needs [Bun](https://bun.sh) and a `.env` with the Supabase project settings:

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server functions only
```

```sh
bun install
bun run dev      # http://localhost:8080
bun run build    # Cloudflare Workers output in .output/
```

Database migrations live in `supabase/migrations`.

## Built with

TanStack Start, React, TypeScript, Tailwind CSS, Supabase.
