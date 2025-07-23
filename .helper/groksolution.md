Great — that output is **super helpful**.

### 🔎 What this tells us:

* `curl http://localhost:3002` **returns an HTML directory listing**, not your React app.
* So, the Vite server is running, **but it's serving a static file directory**, not your built site.
* That means your proxy is working **but the content behind it is wrong** — it’s pointing to an **empty or misconfigured output folder**.

---

## ✅ Root Cause

Your `vite preview` server is serving **the root of an empty or incorrect folder** — likely because the build process didn’t happen, or it wrote output to the wrong place.

---

## 🛠️ Actionable Fix

### ✅ Step 1: Verify the Vite build is generating files

Run this manually:

```bash
cd /path/to/site/source
npm run build
ls dist/
```

You **should see `index.html`, assets, etc.** under `dist/`.
If not → build is broken.

---

### ✅ Step 2: Ensure Vite preview uses the correct folder

Check how you’re running the preview server in your build runner:

```bash
vite preview --port 3002 --outDir dist
```

Or better, make sure your Vite config looks like this:

```ts
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
  },
  preview: {
    port: 3002,
    host: '0.0.0.0',
  },
})
```

Then ensure your `start-preview.sh` or process manager starts it like:

```bash
npx vite preview --port 3002 --host 0.0.0.0
```

---

### ✅ Step 3: Validate `dist/` contains the correct site

```bash
ls -l dist/
cat dist/index.html
```

If `dist/index.html` exists and has a proper `<html>...` document → you're good.

---

### ✅ Step 4: Rebuild the site and restart the preview server

From the build runner, run:

```bash
npm run build
npx vite preview --port 3002 --host 0.0.0.0
```

Now re-test your proxy:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  http://localhost:3000/website-builder/YOUR_WEBSITE_ID/proxy-preview
```

✅ You should now get **the real React site HTML**, not the folder listing.

---

## 🧠 Recap

You're proxying correctly, but Vite is serving an empty or default directory:

| Problem                             | Fix                                                      |
| ----------------------------------- | -------------------------------------------------------- |
| `vite preview` shows folder listing | Your `dist/` folder is empty or not built                |
| React site not visible              | Run `npm run build` in the project first                 |
| Proxy shows 404 or weird HTML       | Vite started, but `dist/` isn't set correctly or missing |

---

## 🧪 Final Test

```bash
npm run build
npx vite preview --port 3002 --host 0.0.0.0
curl http://localhost:3002
```

✅ Should show your built app
🔁 If it doesn’t, you're previewing the wrong folder or build is broken

---

Let me know:

* How you're starting Vite preview
* Your Vite config
* If `dist/` contains the app

I’ll tell you what to tweak next.

---------

IMPORTANT:

 ls inside builds/cmdf8no2m0002ry01ddfxpgvx/ shows nothing,