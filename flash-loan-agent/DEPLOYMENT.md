# Deployment Guide

This guide covers deploying the Flash Loan Agent to various cloud platforms.

## Railway Deployment

Railway is a modern deployment platform that makes it easy to deploy your application.

### Prerequisites

1. MongoDB Atlas cluster set up and running
2. Google Gemini API key
3. Infura project ID
4. Railway account

### Steps

1. **Connect to Railway**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   ```

2. **Initialize Railway project**
   ```bash
   cd flash-loan-agent
   railway init
   ```

3. **Set environment variables**
   ```bash
   # Set required environment variables
   railway variables set MONGO_CONNECTION_STRING="your_mongodb_atlas_connection_string"
   railway variables set GOOGLE_API_KEY="your_google_api_key"
   railway variables set INFURA_PROJECT_ID="your_infura_project_id"
   railway variables set PRIVATE_KEY="your_private_key"
   railway variables set ENVIRONMENT="production"
   railway variables set HOST="0.0.0.0"
   railway variables set PORT="8000"
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Alternative: Deploy via GitHub

1. Push your code to GitHub
2. Connect your GitHub repository to Railway
3. Set environment variables in Railway dashboard
4. Railway will automatically deploy on push

## Other Cloud Platforms

### Docker Hub + Any Container Platform

1. **Build and push to Docker Hub**
   ```bash
   # Build the image
   docker build -t your-username/flash-loan-agent .
   
   # Push to Docker Hub
   docker push your-username/flash-loan-agent
   ```

2. **Deploy to any container platform** (DigitalOcean, AWS ECS, etc.)
   - Use the image: `your-username/flash-loan-agent`
   - Set the required environment variables
   - Expose port 8000

### Heroku

1. **Install Heroku CLI and login**
   ```bash
   heroku login
   ```

2. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables**
   ```bash
   heroku config:set MONGO_CONNECTION_STRING="your_mongodb_atlas_connection_string"
   heroku config:set GOOGLE_API_KEY="your_google_api_key"
   heroku config:set INFURA_PROJECT_ID="your_infura_project_id"
   heroku config:set PRIVATE_KEY="your_private_key"
   heroku config:set ENVIRONMENT="production"
   heroku config:set HOST="0.0.0.0"
   heroku config:set PORT="8000"
   ```

4. **Deploy**
   ```bash
   # Set container stack
   heroku stack:set container
   
   # Deploy
   git push heroku main
   ```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_CONNECTION_STRING` | MongoDB Atlas connection string | Yes |
| `GOOGLE_API_KEY` | Google Gemini API key | Yes |
| `INFURA_PROJECT_ID` | Infura project ID for Ethereum access | Yes |
| `PRIVATE_KEY` | Private key for transaction signing | Yes |
| `ENVIRONMENT` | Application environment (production) | No |
| `HOST` | Host to bind to (0.0.0.0 for containers) | No |
| `PORT` | Port to bind to (8000) | No |

## Health Check

The application provides a health check endpoint at `/api/health` for monitoring and load balancer configuration.

## Security Notes

- Never commit your `.env` file to version control
- Use secure private keys and rotate them regularly
- Monitor your MongoDB Atlas and Infura usage
- Consider implementing rate limiting for production deployments
