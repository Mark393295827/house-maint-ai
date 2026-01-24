---
description: Start the development server
---

# Start Dev Server

// turbo-all

1. Ensure dependencies are installed:
```bash
npm install
```

2. Start the Vite development server:
```bash
npm run dev
```

3. The server will be available at `http://localhost:5173`

## Expected Output

```
  VITE v7.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

## Troubleshooting

If the server fails to start:
- Check if port 5173 is already in use
- Try running `npm install` again
- Check for errors in `vite.config.js`
