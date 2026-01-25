import pymysql
from sqlalchemy import create_engine, inspect, text
from urllib.parse import quote_plus
from app.config import config


class DatabaseManager:
    def __init__(self):
        self.config = config

    # --------------------------------------------------
    # PYMYSQL CONNECTION
    # --------------------------------------------------
    def get_connection(self, db_name=None, dict_cursor=False):
        """
        Get PyMySQL connection
        dict_cursor=True → returns rows as dict
        """
        cursorclass = (
            pymysql.cursors.DictCursor
            if dict_cursor
            else pymysql.cursors.Cursor
        )

        return pymysql.connect(
            host=self.config.DB_HOST,
            user=self.config.DB_USER,
            password=self.config.DB_PASSWORD,
            database=db_name,
            port=self.config.DB_PORT,
            cursorclass=cursorclass,
            autocommit=False
        )

    # --------------------------------------------------
    # SQLALCHEMY ENGINE
    # --------------------------------------------------
    def get_sqlalchemy_engine(self, db_name):
        encoded_password = quote_plus(self.config.DB_PASSWORD)
        return create_engine(
            f"mysql+pymysql://{self.config.DB_USER}:{encoded_password}"
            f"@{self.config.DB_HOST}:{self.config.DB_PORT}/{db_name}",
            pool_pre_ping=True
        )

    # --------------------------------------------------
    # ENSURE DATABASE EXISTS
    # --------------------------------------------------
    def ensure_database(self, db_name):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        conn.commit()
        cursor.close()
        conn.close()

    # --------------------------------------------------
    # 🔥 ENSURE TABLE + SCHEMA (THIS FIXES YOUR ERROR)
    # --------------------------------------------------
    def ensure_table_schema(self, table_name, df, db_name):
        """
        - Creates table if it does not exist
        - Adds missing columns automatically
        - CRON SAFE
        - SERVER SAFE
        """

        engine = self.get_sqlalchemy_engine(db_name)
        inspector = inspect(engine)

        with engine.begin() as conn:
            # 1️⃣ Create table if it does not exist
            if not inspector.has_table(table_name):
                df.head(0).to_sql(
                    name=table_name,
                    con=conn,
                    index=False
                )
                return

            # 2️⃣ Get existing columns
            existing_columns = {
                col["name"]
                for col in inspector.get_columns(table_name)
            }

            # 3️⃣ Add missing columns
            for column in df.columns:
                if column in existing_columns:
                    continue

                conn.execute(text(
                    f"""
                    ALTER TABLE `{table_name}`
                    ADD COLUMN `{column}` TEXT NULL
                    """
                ))


# ✅ SINGLETON INSTANCE
db_manager = DatabaseManager()



# import pymysql
# from sqlalchemy import create_engine, text
# from urllib.parse import quote_plus
# from app.config import config


# class DatabaseManager:
#     def __init__(self):
#         self.config = config

#         # 🔑 Define uniqueness per table (business rules)
#         self.UNIQUE_KEY_MAP = {
#             "bc": ["SERIES", "SYMBOL", "EX_DT"],
#             "bh": ["SYMBOL", "DATE"],
#             "pd": ["SYMBOL", "DATE"],
#             "pr": ["SYMBOL", "DATE"],
#             "mcap": ["SYMBOL", "DATE"],
#         }

#     # -------------------------
#     # CONNECTION HELPERS
#     # -------------------------
#     def get_connection(self, db_name=None):
#         return pymysql.connect(
#             host=self.config.DB_HOST,
#             user=self.config.DB_USER,
#             password=self.config.DB_PASSWORD,
#             database=db_name,
#             port=self.config.DB_PORT,
#             cursorclass=pymysql.cursors.DictCursor,
#             autocommit=True,
#         )

#     def get_sqlalchemy_engine(self, db_name):
#         encoded_password = quote_plus(self.config.DB_PASSWORD)
#         return create_engine(
#             f"mysql+pymysql://{self.config.DB_USER}:{encoded_password}"
#             f"@{self.config.DB_HOST}:{self.config.DB_PORT}/{db_name}",
#             pool_pre_ping=True,
#         )

#     # -------------------------
#     # DATABASE
#     # -------------------------
#     def ensure_database(self, db_name):
#         conn = self.get_connection()
#         with conn.cursor() as cursor:
#             cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
#         conn.close()

#     # -------------------------
#     # TABLE + SCHEMA (CORE FIX)
#     # -------------------------


#     def ensure_table_schema(self, table_name, df, db_name):
#         """
#         Safe schema sync:
#         - Creates table if not exists
#         - Adds missing columns ONLY
#         - Ignores duplicate column race conditions
#         """
#         engine = self.get_sqlalchemy_engine(db_name)

#         with engine.begin() as conn:
#             # 1️⃣ Create table if not exists
#             conn.execute(
#                 text(
#                     f"""
#                 CREATE TABLE IF NOT EXISTS `{table_name}` (
#                     id BIGINT AUTO_INCREMENT PRIMARY KEY
#                 )
#             """
#                 )
#             )

#             # 2️⃣ Fetch existing columns
#             cols = conn.execute(
#                 text(
#                     f"""
#                 SELECT COLUMN_NAME
#                 FROM INFORMATION_SCHEMA.COLUMNS
#                 WHERE TABLE_SCHEMA = '{db_name}'
#                 AND TABLE_NAME = '{table_name}'
#             """
#                 )
#             ).fetchall()

#             existing_cols = {row[0].lower() for row in cols}

#             # 3️⃣ Add only missing columns
#             for col in df.columns:
#                 col_l = col.lower()
#                 if col_l in existing_cols:
#                     continue

#                 try:
#                     conn.execute(
#                         text(f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT")
#                     )
#                 except Exception as e:
#                     # Ignore duplicate column race condition
#                     if "Duplicate column" not in str(e):
#                         print(f"⚠ Column add failed `{table_name}.{col}` → {e}")


# # ✅ Global instance (unchanged usage)
# db_manager = DatabaseManager()


# # import pymysql
# # from sqlalchemy import create_engine, text
# # from urllib.parse import quote_plus
# # from app.config import config

# # class DatabaseManager:
# #     def __init__(self):
# #         self.config = config

# #     def get_connection(self, db_name=None):
# #         """Get raw PyMySQL connection"""
# #         return pymysql.connect(
# #             host=self.config.DB_HOST,
# #             user=self.config.DB_USER,
# #             password=self.config.DB_PASSWORD,
# #             database=db_name,
# #             port=self.config.DB_PORT,
# #             cursorclass=pymysql.cursors.DictCursor
# #         )

# #     def get_sqlalchemy_engine(self, db_name):
# #         """Get SQLAlchemy engine for specific database"""
# #         encoded_password = quote_plus(self.config.DB_PASSWORD)
# #         return create_engine(
# #             f"mysql+pymysql://{self.config.DB_USER}:{encoded_password}@{self.config.DB_HOST}:{self.config.DB_PORT}/{db_name}"
# #         )

# #     def ensure_database(self, db_name):
# #         """Ensure database exists"""
# #         conn = self.get_connection()
# #         cursor = conn.cursor()
# #         cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
# #         conn.commit()
# #         cursor.close()
# #         conn.close()

# #     def ensure_table_schema(self, table_name, df, db_name):
# #         """Ensure table has all columns from DataFrame"""
# #         engine = self.get_sqlalchemy_engine(db_name)
# #         with engine.connect() as conn:
# #             result = conn.execute(text(f"SHOW TABLES LIKE '{table_name}'")).fetchall()
# #             existing_cols = []
# #             if result:
# #                 cols_result = conn.execute(text(f"SHOW COLUMNS FROM `{table_name}`")).fetchall()
# #                 existing_cols = [row[0] for row in cols_result]

# #             for col in df.columns:
# #                 if col not in existing_cols:
# #                     try:
# #                         conn.execute(text(f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT"))
# #                         conn.commit()
# #                     except Exception as e:
# #                         print(f"⚠ Column add failed `{col}` → {e}")

# # # Global instance
# # db_manager = DatabaseManager()
