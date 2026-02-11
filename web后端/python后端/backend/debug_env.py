import sys
print(f"Python version: {sys.version}")

try:
    import passlib
    from passlib.context import CryptContext
    print("passlib is installed.")
    try:
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hash_test = pwd_context.hash("testpassword")
        print(f"Bcrypt hashing test successful: {hash_test[:10]}...")
    except Exception as e:
        print(f"CRITICAL: Bcrypt hashing failed. You might need to run 'pip install bcrypt'. Error: {e}")
except ImportError:
    print("CRITICAL: passlib is NOT installed. Run 'pip install passlib[bcrypt]'.")

try:
    import pymysql
    print("pymysql is installed.")
except ImportError:
    print("WARNING: pymysql is not installed. Required if you are using MySQL.")

try:
    import sqlmodel
    print("sqlmodel is installed.")
except ImportError:
    print("CRITICAL: sqlmodel is not installed.")

print("\nDebug check complete.")
