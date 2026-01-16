import re

def sanitize_column_name(col: str) -> str:
    """Sanitize column names for database compatibility"""
    col = col.strip()
    col = re.sub(r"[^\w]+", "_", col)
    col = re.sub(r"__+", "_", col)
    col = col.strip("_")
    return col

def sanitize_table_name(name: str) -> str:
    """Sanitize table names for database compatibility"""
    name = name.strip().lower()
    name = re.sub(r'\W+', '_', name)
    if name and name[0].isdigit():
        name = "tbl_" + name
    return name or "tbl_unknown"