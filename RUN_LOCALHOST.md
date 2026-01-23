# Running the Application on Localhost

## Prerequisites
- Node.js (v18 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

## Step 1: Setup Backend

1. Navigate to Backend directory:
```powershell
cd "pranav-new-20-12 resto-project\kavyaresto-20-12\Backend"
```

2. Install dependencies:
```powershell
npm install
```

3. Create `.env` file (copy from `.env.example` if it exists):
```powershell
# Create .env file with these variables:
MONGO_URI=mongodb://127.0.0.1:27017/kavyaresto
JWT_SECRET=your-secret-key-here
PORT=5000
CORS_ORIGIN=http://localhost:5173
ALLOW_ALL_ORIGINS=true
DEV_RETURN_OTP=true
```

4. Start MongoDB (if running locally):
```powershell
# If MongoDB is installed as a service, it should start automatically
# Or use: mongod
```

5. Start Backend server:
```powershell
npm run dev
# Or for production: npm start
```

Backend will run on: **http://localhost:5000**

## Step 2: Setup Frontend

1. Open a NEW terminal window and navigate to Frontend directory:
```powershell
cd "pranav-new-20-12 resto-project\kavyaresto-20-12\Frontend"
```

2. Install dependencies:
```powershell
npm install
```

3. Start Frontend development server:
```powershell
npm run dev
```

Frontend will run on: **http://localhost:5173** (or another port if 5173 is busy)

## Step 3: Access the Application

- **Customer Frontend**: http://localhost:5173
- **Admin Panel**: http://localhost:5173/#/admin-panel
- **Kitchen Dashboard**: http://localhost:5173/#/admin/kitchen (after admin login)
- **Backend API**: http://localhost:5000

## Default Admin Credentials

Based on the code, you can use:
- Username: `admin` / Password: `admin234`
- Username: `superadmin` / Password: `super234`

Or create a new admin user using the backend scripts.

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check your `MONGO_URI` in `.env` file
- For local MongoDB: `mongodb://127.0.0.1:27017/kavyaresto`

### Port Already in Use
- Backend: Change `PORT` in `.env` file
- Frontend: Vite will automatically use the next available port

### CORS Errors
- Make sure `CORS_ORIGIN` in backend `.env` matches your frontend URL
- Or set `ALLOW_ALL_ORIGINS=true` for development

### OTP Emails Not Working
- Configure `EMAIL_USER` and `EMAIL_PASS` in `.env` for Gmail SMTP
- Or use SendGrid with `SENDGRID_API_KEY`
- If not configured, OTPs will be logged to console (check backend terminal)

## Quick Start Commands

**Terminal 1 (Backend):**
```powershell
cd "pranav-new-20-12 resto-project\kavyaresto-20-12\Backend"
npm install
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
cd "pranav-new-20-12 resto-project\kavyaresto-20-12\Frontend"
npm install
npm run dev
```
