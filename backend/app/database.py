from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from sqlalchemy import text

# Database URL
DATABASE_URL = "sqlite:///./estimation_system.db"

# Create engine
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_sqlite_schema(engine):
    if "sqlite" not in str(engine.url):
        return

    def get_columns(conn, table_name):
        rows = conn.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()
        return {row[1] for row in rows}

    with engine.begin() as conn:
        def table_exists(table_name):
            row = conn.exec_driver_sql(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table_name,),
            ).fetchone()
            return row is not None

        # Ensure estimates columns
        if table_exists("estimates"):
            cols = get_columns(conn, "estimates")
            alterations = [
                ("tax_percent", "REAL", "0"),
                ("tax_amount", "REAL", "0"),
                ("total_with_tax", "REAL", "0"),
                ("profit", "REAL", "0"),
                ("currency_code", "TEXT", "'INR'"),
                ("exchange_rate", "REAL", "1.0"),
            ]
            for name, col_type, default in alterations:
                if name not in cols:
                    conn.exec_driver_sql(
                        f"ALTER TABLE estimates ADD COLUMN {name} {col_type} DEFAULT {default}"
                    )

        # Ensure estimate_items columns
        if table_exists("estimate_items"):
            cols = get_columns(conn, "estimate_items")
            alterations = [
                ("category", "TEXT", "NULL"),
                ("cost_rate", "REAL", "0"),
                ("cost_amount", "REAL", "0"),
                ("profit", "REAL", "0"),
                ("margin_percent", "REAL", "0"),
            ]
            for name, col_type, default in alterations:
                if name not in cols:
                    conn.exec_driver_sql(
                        f"ALTER TABLE estimate_items ADD COLUMN {name} {col_type} DEFAULT {default}"
                    )
