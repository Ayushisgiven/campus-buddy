# Campus Buddy - Project Details & Database Migration

This document outlines the current project architecture, the security updates made to the Mistral API integration, and the steps for migrating the database from SQLite to Supabase PostgreSQL.

---

## 1. Project Architecture

The application is split into two main parts:
- **Frontend (React)**: Located in the root directory. Users interact with the Campus Buddy chat interface, select languages (English, Hindi, Telugu), and authenticate.
- **Backend (Django)**: Located in the `/campus_backend` directory. It manages user registration, login (using JSON Web Tokens - JWT), OTP generation via Resend for password resets, and user account management.

---

## 2. Recent Updates

### A. Mistral API Key Relocation (Security Update)
- **Problem**: The Mistral API key was hardcoded directly in the frontend (`src/App.js`), exposing it to client-side browsers.
- **Solution**: We created a proxy endpoint in the Django backend: `POST /api/auth/chat/`. 
  - The frontend now sends the chat messages array to this backend endpoint.
  - The backend retrieves the `MISTRAL_API_KEY` securely from its environment variables and calls Mistral's API on behalf of the frontend.
  - The API key is now hidden from the client-side code.

### B. SQLite to Supabase PostgreSQL Migration
- **Problem**: SQLite is file-based and ephemeral on platforms like Render. When the backend container restarts, the SQLite database is wiped out, causing users to lose their accounts.
- **Solution**: We configured Django to use `dj-database-url`. If a `DATABASE_URL` environment variable is provided (e.g., pointing to your Supabase PostgreSQL database), Django will use it; otherwise, it falls back to SQLite for local development.

---

## 3. Database Setup & Supabase Migration Instructions

To persist your user credentials permanently, follow these steps to connect your Django backend to **Supabase**:

### Step 1: Create a Supabase Database
1. Go to [Supabase](https://supabase.com/) and log in or create an account.
2. Click **New Project** and name it (e.g., `campus-buddy`). Set a secure Database Password.
3. Choose the region closest to you and click **Create new project**. Wait a couple of minutes for the database to provision.

### Step 2: Get Your Connection URI
1. In your Supabase Dashboard, go to **Project Settings** (gear icon on the left menu) -> **Database**.
2. Scroll down to the **Connection string** section.
3. Click on the **URI** tab. It will look like this:
   `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
4. Copy this string and replace `[YOUR-PASSWORD]` with the database password you chose during project creation.

### Step 3: Run the Database Migrations
To set up all the required user and auth tables in Supabase, run the migrations from your Django backend:

1. Open your terminal in the `/campus_backend` folder.
2. Activate your virtual environment:
   - **Windows**: `.\venv\Scripts\activate`
3. Set the `DATABASE_URL` environment variable in your terminal session and run migrations:
   - **PowerShell**:
     ```powershell
     $env:DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
     python manage.py migrate
     ```
   - **Command Prompt (CMD)**:
     ```cmd
     set DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     python manage.py migrate
     ```

### Step 4: Run the Server Locally
To run your local server with Supabase, keep the `DATABASE_URL` environment variable set and run:
```bash
python manage.py runserver
```

---

## 4. Deploying Updates (Render / Vercel)

If your backend is deployed on **Render**:
1. Go to your Render Dashboard.
2. Select your Web Service and click on **Environment**.
3. Add the following environment variables:
   - `DATABASE_URL` = `<your_supabase_connection_uri>`
   - `MISTRAL_API_KEY` = `HT3I3k8zRo8wox9vRAe1mfo4ONtct0C3` (or your private Mistral key)
4. Save Changes. Render will automatically redeploy and start using the persistent Supabase database!
