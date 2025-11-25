import pymysql
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
from app.config import config

class DatabaseManager:
    def __init__(self):
        self.config = config
    
    def get_connection(self, db_name=None):
        """Get raw PyMySQL connection"""
        return pymysql.connect(
            host=self.config.DB_HOST,
            user=self.config.DB_USER,
            password=self.config.DB_PASSWORD,
            database=db_name,
            port=self.config.DB_PORT,
            cursorclass=pymysql.cursors.DictCursor
        )
    
    def get_sqlalchemy_engine(self, db_name):
        """Get SQLAlchemy engine for specific database"""
        encoded_password = quote_plus(self.config.DB_PASSWORD)
        return create_engine(
            f"mysql+pymysql://{self.config.DB_USER}:{encoded_password}@{self.config.DB_HOST}:{self.config.DB_PORT}/{db_name}"
        )
    
    def ensure_database(self, db_name):
        """Ensure database exists"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        conn.commit()
        cursor.close()
        conn.close()
    
    def ensure_table_schema(self, table_name, df, db_name):
        """Ensure table has all columns from DataFrame"""
        engine = self.get_sqlalchemy_engine(db_name)
        with engine.connect() as conn:
            result = conn.execute(text(f"SHOW TABLES LIKE '{table_name}'")).fetchall()
            existing_cols = []
            if result:
                cols_result = conn.execute(text(f"SHOW COLUMNS FROM `{table_name}`")).fetchall()
                existing_cols = [row[0] for row in cols_result]
            
            for col in df.columns:
                if col not in existing_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT"))
                        conn.commit()
                    except Exception as e:
                        print(f"⚠ Column add failed `{col}` → {e}")

# Global instance
db_manager = DatabaseManager()