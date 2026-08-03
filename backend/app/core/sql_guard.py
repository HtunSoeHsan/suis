import re
import sqlparse
from fastapi import HTTPException, status

# Allowlist: only pure SELECT statements
_ALLOWED_STATEMENT_TYPE = "SELECT"

# Blocklist: dangerous keywords that must never appear
_BLOCKED_KEYWORDS = {
    "DROP", "DELETE", "UPDATE", "INSERT", "TRUNCATE",
    "ALTER", "CREATE", "REPLACE", "GRANT", "REVOKE",
    "EXEC", "EXECUTE", "CALL", "MERGE", "UPSERT",
}


def validate_sql(sql: str) -> str:
    """
    Parse and validate that the generated SQL is a safe read-only SELECT.
    Raises HTTPException 403 if any dangerous construct is found.
    Returns the cleaned SQL string.
    """
    if not sql or not sql.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty SQL query generated.",
        )

    # Remove SQL code fences if the LLM wrapped them
    sql = re.sub(r"```sql\s*", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"```\s*", "", sql)
    sql = sql.strip().rstrip(";")

    parsed = sqlparse.parse(sql)
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not parse SQL query.",
        )

    # Only allow a single statement
    if len(parsed) > 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Multiple SQL statements are not allowed.",
        )

    stmt = parsed[0]
    stmt_type = stmt.get_type()

    if stmt_type != _ALLOWED_STATEMENT_TYPE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only SELECT queries are permitted. Detected: {stmt_type}",
        )

    # Secondary check: scan all tokens for blocked keywords
    upper_sql = sql.upper()
    for keyword in _BLOCKED_KEYWORDS:
        # Use word-boundary check to avoid partial matches
        pattern = rf"\b{keyword}\b"
        if re.search(pattern, upper_sql):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden SQL keyword detected: {keyword}",
            )

    return sql
