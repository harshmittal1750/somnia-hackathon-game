# Vercel Deployment Guide for Somnia Space Defender

## 🚨 Critical Issues Fixed

### 1. **Deploy Backend First**

Your backend needs to be deployed before the frontend can work.

#### Backend Deployment Steps:

1. Create a new Vercel project for the `backend/` folder
2. Set environment variables in Vercel dashboard:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/somnia-space-defender

# Web3 Configuration
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
CONTRACT_ADDRESS=0x4912aFEA272C0283FDe9804480422a8046EC1908
SSD_TOKEN_ADDRESS=0xeDFd8C7E14f5D491Cf9063076a4FcE60737170dE
PRIVATE_KEY=your_private_key_here

# Security
JWT_SECRET=your_jwt_secret_here
API_RATE_LIMIT=100

# Game Configuration
MAX_SCORE_PER_LEVEL=200000
MIN_SCORE_PER_ALIEN=5
MAX_SCORE_PER_ALIEN=150
SUBMISSION_COOLDOWN=5000

# CORS Configuration - Add your frontend URL
CORS_ORIGIN=https://your-frontend-app.vercel.app
FRONTEND_URL=https://your-frontend-app.vercel.app

# Production Settings
NODE_ENV=production
PORT=3000
```

### 2. **Update Frontend Configuration**

After deploying backend, update the API URL in `js/config.js`:

```javascript
// Replace "your-backend-app.vercel.app" with your actual backend Vercel URL
BASE_URL: window.location.hostname === "localhost"
  ? "http://localhost:3000/api"
  : "https://your-actual-backend-url.vercel.app/api";
```

### 3. **Deploy Frontend**

Deploy the main project (frontend) to Vercel with these environment variables:

```bash
# Optional: if you need any frontend-specific env vars
NODE_ENV=production
```

## 🛠️ **Deployment Order**

**IMPORTANT**: Deploy in this exact order:

1. **Backend first** (from `/backend` folder)
   - Get the backend URL (e.g., `https://somnia-backend-abc123.vercel.app`)
2. **Update frontend config**
   - Replace the placeholder URL in `js/config.js` with your actual backend URL
3. **Deploy frontend** (main project root)
   - Get frontend URL (e.g., `https://somnia-game-xyz789.vercel.app`)
4. **Update backend CORS**
   - Add frontend URL to `FRONTEND_URL` environment variable in backend Vercel project

## 🔧 **Common Issues & Solutions**

### Issue: "Failed to fetch" errors

- **Cause**: CORS misconfiguration or wrong API URL
- **Solution**: Ensure backend allows your frontend domain in CORS settings

### Issue: Database connection errors

- **Cause**: Missing or incorrect `MONGODB_URI`
- **Solution**: Use MongoDB Atlas and set correct connection string

### Issue: Web3 functionality not working

- **Cause**: Missing contract addresses or RPC URL
- **Solution**: Verify all Web3 environment variables are set

### Issue: 404 errors on refresh

- **Cause**: Missing SPA routing configuration
- **Solution**: The updated `vercel.json` should fix this

## 📋 **Verification Checklist**

After deployment, verify:

- [ ] Backend health check: `https://your-backend.vercel.app/health`
- [ ] Frontend loads without console errors
- [ ] API calls work (check browser Network tab)
- [ ] Web3 wallet connection works
- [ ] Game functionality works end-to-end

## 🔍 **Debugging Tips**

1. **Check Vercel function logs** in your dashboard
2. **Monitor browser console** for API errors
3. **Test API endpoints** directly in browser/Postman
4. **Verify environment variables** are set correctly in Vercel

## 🚀 **Next Steps**

1. Deploy backend to Vercel
2. Copy the backend URL
3. Update `js/config.js` with the real backend URL
4. Deploy frontend to Vercel
5. Update backend CORS with frontend URL
6. Test thoroughly!

Your app should now work on Vercel! 🎉
