# WorkTray Website

Marketing website for the WorkTray Chrome extension — built as a pure static site (HTML + CSS + JS), optimized for Cloudflare Pages.

## 📁 Structure

```
worktray-website/
├── public/                 ← Deploy this folder to Cloudflare Pages
│   ├── index.html          ← Main marketing page
│   ├── style.css           ← All styles
│   ├── main.js             ← Interactivity
│   ├── _headers            ← Cloudflare security & cache headers
│   ├── _redirects          ← URL redirects
│   └── assets/             ← Mascot images + logo
│       ├── hero-mascot.png
│       ├── worktray-logo.png
│       ├── front-idle.png
│       ├── front-happy.png
│       ├── front-alert.png
│       ├── thinking.png
│       ├── working.png
│       ├── task-complete.png
│       ├── side-rest.png
│       └── ... (all mascot assets)
└── package.json
```

---

## 🚀 Deploy to Cloudflare Pages

### Option A — Via Cloudflare Dashboard (recommended for first deploy)

1. Push this repo to GitHub or GitLab.
2. Go to [Cloudflare Pages](https://pages.cloudflare.com) → **Create a project** → **Connect to Git**.
3. Select your repository.
4. In **Build Settings**, configure:

| Setting | Value |
|---|---|
| **Framework preset** | `None` |
| **Build command** | *(leave blank)* |
| **Build output directory** | `public` |
| **Root directory** | `/` |
| **Node.js version** | `18` |

5. Click **Save and Deploy**. Cloudflare will detect the static files and deploy instantly.

---

### Option B — Via Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy the public folder directly
wrangler pages deploy public --project-name=worktray
```

Or with a named branch:
```bash
wrangler pages deploy public --project-name=worktray --branch=main
```

---

### Option C — Direct Upload (no Git required)

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Create project (first time only)
wrangler pages project create worktray

# Deploy
wrangler pages deploy public --project-name=worktray
```

---

## 🔧 Local Development

```bash
# Install dev server
npm install

# Start local preview at http://localhost:3000
npm run dev
```

Or simply open `public/index.html` in any browser — no build step required.

---

## 🌐 Custom Domain

After deploying, add your custom domain in Cloudflare Pages:

1. Go to your Pages project → **Custom domains** → **Set up a custom domain**
2. Enter your domain (e.g. `worktray.app`)
3. Cloudflare handles SSL automatically

---

## 📦 What's Inside

### Sections
- **Hero** — Headline, mascot, key stats, CTA
- **Features** — 4 AI features (Priority, Standup, Decomposition, Search) with live demos
- **Use Cases** — Tabbed section: Developer, PM, Freelancer, Student, Ops
- **Meet Tray** — Interactive mascot showcase with state switcher
- **AI Architecture** — DeepSeek + secure proxy explainer
- **Integrations** — Live (any webpage) + Coming Soon (Notion, Slack, Linear, GitHub, Jira, Gmail)
- **Pricing** — Free / Pro ($7/mo) / Team ($19/seat) with FAQ
- **Footer** — Links, brand, mascot

### Tech Stack
- Pure HTML5 + CSS3 + Vanilla JS (zero dependencies)
- Google Fonts: Syne + DM Sans + JetBrains Mono
- CSS custom properties for theming
- IntersectionObserver for scroll reveals
- Cloudflare Pages `_headers` for security and caching

### Performance
- No JavaScript framework (loads instantly)
- Images are local PNGs from the extension asset pack
- Fonts loaded via Google Fonts with `display=swap`
- Cloudflare CDN handles global edge distribution automatically

---

## ✏️ Customisation

- **Colors** — Edit CSS variables in `style.css` `:root` block
- **Content** — All text is in `index.html`
- **Pricing** — Update plan prices/features in the `#pricing` section of `index.html`
- **Integration dates** — Update `.int-status` spans in `#integrations`
- **Chrome Store URL** — Replace `href="#"` on CTA buttons with your actual Chrome Web Store link

---

## 📄 License

MIT — See LICENSE in the extension source.
