# How to Deploy Your Poker GTO Trainer App

## 🚀 Quick Start: Deploy to Vercel (Recommended)

Vercel is the easiest way to deploy Next.js apps - it's made by the Next.js team!

### Step 1: Push Code to GitHub

```bash
# If you haven't initialized git yet
cd poker-gto-trainer
git init
git add .
git commit -m "Ready for deployment"

# Create a new repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. **Sign up**: Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. **Import Project**: Click "Add New Project" → Import your GitHub repo
3. **Add Environment Variables** (IMPORTANT!):
   
   In Vercel dashboard → Your Project → Settings → Environment Variables, add:
   
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key_here
   CLERK_SECRET_KEY=your_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_key_here
   NEXT_TELEMETRY_DISABLED=1
   ```
   
4. **Deploy**: Click "Deploy" - your app will be live in 2-3 minutes!

### Step 3: Configure Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Your App → Settings → Domains
3. Add your Vercel URL: `your-app.vercel.app`
4. Update Redirect URLs to include your Vercel domain

### Step 4: Configure Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Settings → API → Allowed Origins
3. Add: `https://your-app.vercel.app`

---

## ✅ Pre-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] All environment variables added to Vercel
- [ ] Clerk domain configured
- [ ] Supabase allowed origins updated
- [ ] Database migration completed in Supabase
- [ ] Tested locally (`npm run build` works)

---

## 🎯 Your App Will Be Live At:

`https://your-app-name.vercel.app`

Vercel automatically:
- ✅ Provides HTTPS
- ✅ Handles deployments
- ✅ Auto-deploys on git push
- ✅ Creates preview URLs for PRs

---

## 🔧 Alternative: Deploy to Netlify

1. Sign up at [netlify.com](https://netlify.com)
2. "Add new site" → Import from GitHub
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables (same as above)

---

## 🐛 Troubleshooting

**Build fails?**
- Check all environment variables are set
- Make sure `package.json` has all dependencies

**App works but auth fails?**
- Check Clerk domain settings
- Verify Clerk redirect URLs

**Database errors?**
- Check Supabase allowed origins
- Verify environment variables are correct

---

## 🎉 That's It!

Your app will be live and accessible worldwide. Every time you push to GitHub, Vercel will automatically redeploy!

