---
description: Build the production bundle
---

# Build for Production

// turbo-all

1. Run the production build:
```bash
npm run build
```

2. Preview the production build locally:
```bash
npm run preview
```

## Expected Output

```
vite v7.x.x building for production...
✓ XXX modules transformed.
dist/index.html                   X.XX kB │ gzip: X.XX kB
dist/assets/index-XXXXXXXX.css    X.XX kB │ gzip: X.XX kB
dist/assets/index-XXXXXXXX.js     XXX.XX kB │ gzip: XX.XX kB
✓ built in XXXms
```

## Output

The production build will be output to the `dist/` directory:

```
dist/
├── index.html
├── assets/
│   ├── index-XXXXXXXX.css
│   └── index-XXXXXXXX.js
└── ...
```

## Deployment

The `dist/` folder can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Firebase Hosting
