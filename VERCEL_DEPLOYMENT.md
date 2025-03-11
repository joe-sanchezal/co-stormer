# Vercel Deployment Guide

## Configuration Notes

This project uses a `vercel.json` file to configure the deployment settings. This approach has several benefits:

1. **Version Control**: All configuration is in code and can be tracked in your repository
2. **Reproducibility**: Ensures consistent deployments across environments
3. **Transparency**: Makes it clear how the application is being deployed

## Warning About Build Settings

When deploying to Vercel, you may see this warning:

```
WARN! Due to `builds` existing in your configuration file, the Build and Development Settings defined in your Project Settings will not apply.
```

**This is normal and not an error.** It simply means that Vercel is using the build configuration from your `vercel.json` file instead of any settings you might have configured in the Vercel dashboard.

## Current Configuration

The current configuration:

1. Uses the Node.js builder for the server.js file
2. Sets up routes for Socket.IO
3. Configures CORS headers for Socket.IO connections
4. Sets the NODE_ENV to "production"

## Alternatives

If you prefer to use the Vercel dashboard for configuration instead of the `vercel.json` file:

1. Remove the `builds` section from `vercel.json`
2. Configure your project in the Vercel dashboard under Project Settings > General > Build & Development Settings

However, keeping configuration in code is generally recommended for better version control and deployment consistency. 