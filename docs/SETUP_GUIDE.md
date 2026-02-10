# House Maint AI - Setup Guide

This guide will help you set up the necessary tools to run the full stack (Frontend + Backend + Database) on Windows.

## Option 1: Docker Desktop (Recommended)

The easiest way to run the backend dependencies (PostgreSQL and Redis) is using Docker.

1.  **Download and Install Docker Desktop**:
    *   Go to: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
    *   Download the Windows installer and run it.
    *   Follow the installation prompts. You may need to logout and login again.
2.  **Verify Installation**:
    *   Open PowerShell and run: `docker --version`
    *   Make sure Docker Desktop is running (look for the whale icon in your taskbar).
3.  **Start Services**:
    *   In the project root, run:
        ```powershell
        docker compose up -d postgres redis
        ```

## Option 2: Manual Installation (Chocolatey)

If you prefer not to use Docker, you can install the services directly using Chocolatey (a package manager for Windows).

1.  **Install Chocolatey** (if not installed):
    *   Run PowerShell as Administrator.
    *   Run the command found at: [https://chocolatey.org/install](https://chocolatey.org/install)
2.  **Install PostgreSQL and Redis**:
    ```powershell
    choco install postgresql redis-64
    ```
3.  **Start Services**:
    *   **Postgres**: Should start automatically as a service. Default user: `postgres`, Password: (set during install, usually prompted).
    *   **Redis**: Run `redis-server` in a separate terminal.
4.  **Configure `.env`**:
    *   Open `server/config/secrets.ts` implies the app expects password to be in `server/secrets/db_password.txt` or `DB_PASSWORD` env var.
    *   Update `.env.development`:
        ```
        DB_PASSWORD=your_postgres_password
        ```

## Initializing the Database

Once your database is running (Method 1 or 2):

1.  Run the initialization script:
    ```powershell
    cd server
    npm run init-db
    ```

## Running the Application

1.  **Backend**:
    ```powershell
    cd server
    npm run dev
    ```
2.  **Frontend**:
    ```powershell
    # In project root
    npm run dev
    ```
