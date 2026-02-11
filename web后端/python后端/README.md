# Login System with Vue 3 and FastAPI

This project is a full-stack login and registration system using Vue 3 for the frontend and FastAPI for the backend. It uses SQLModel for database interactions (configured for SQLite by default, but easy to switch to MySQL).

## Project Structure

- `backend/`: FastAPI application code.
- `frontend/`: Vue 3 application code.

## Prerequisites

- Node.js (v16+)
- Python (v3.9+)
- MySQL (Optional, default is SQLite)

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. **Database Configuration**:
   - By default, the app uses SQLite (`test.db`).
   - To use **MySQL**:
     - Open `backend/main.py`.
     - Comment out `DATABASE_URL = "sqlite:///./test.db"`.
     - Uncomment `DATABASE_URL = "mysql+pymysql://user:password@localhost/dbname"`.
     - Replace `user`, `password`, and `dbname` with your MySQL credentials.
     - Ensure you have created the database (e.g., `CREATE DATABASE dbname;`) in MySQL first.

5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## Features

- User Registration (Username, Password)
- User Login (JWT Authentication)
- Protected Routes (Example structure in code)
- Persistent Login (Token stored in LocalStorage)

## Notes

- **Security**: The `SECRET_KEY` in `backend/auth.py` is a placeholder. Change it to a strong random string for production.
- **CORS**: Configured to allow `http://localhost:5173` and `http://localhost:8080`. Modify `origins` in `backend/main.py` if your frontend runs on a different port.
