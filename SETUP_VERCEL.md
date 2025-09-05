# Vercel Environment Setup

## Required Environment Variables for numgate

You need to add the following environment variable to your Vercel project for numgate:

1. Go to https://vercel.com/dashboard
2. Select the `numgate` project
3. Go to Settings → Environment Variables
4. Add this variable:

```
PAGE_BUILDER_URL = https://pagenumgate.vercel.app
```

5. Make sure it's enabled for Production, Preview, and Development
6. Click "Save"
7. Redeploy the project (Settings → Functions → Redeploy)

## What This Does

The `PAGE_BUILDER_URL` tells the numgate proxy where to forward page-builder requests. Without this, the proxy defaults to `http://localhost:3002` which doesn't exist in production.

## Testing After Setup

Once the environment variable is set and the app is redeployed, test it by:

1. Visit https://104.248.51.150.nip.io/login
2. Login with your credentials
3. Navigate to the page builder
4. It should now work correctly

## Troubleshooting

If it still doesn't work after setting the environment variable:

1. Check Vercel deployment logs for errors
2. Verify the environment variable is set correctly in Vercel dashboard
3. Make sure both numgate and pagenumgate are deployed successfully
4. Check the browser console for any error messages