"""Accesso al database MySQL senza modificare lo schema."""

from contextlib import contextmanager
from decimal import Decimal
from typing import Any, Generator, Optional

import mysql.connector
from mysql.connector import MySQLConnection
from mysql.connector.cursor import MySQLCursorDict

from config import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER


def _serialize_row(row: Optional[dict]) -> Optional[dict]:
    if row is None:
        return None
    out: dict[str, Any] = {}
    for key, value in row.items():
        if isinstance(value, Decimal):
            out[key] = float(value)
        else:
            out[key] = value
    return out


@contextmanager
def get_connection() -> Generator[MySQLConnection, None, None]:
    conn = mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        autocommit=False,
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_one(cursor: MySQLCursorDict, query: str, params: tuple = ()) -> Optional[dict]:
    cursor.execute(query, params)
    row = cursor.fetchone()
    return _serialize_row(row)


def fetch_all(cursor: MySQLCursorDict, query: str, params: tuple = ()) -> list[dict]:
    cursor.execute(query, params)
    return [_serialize_row(r) for r in cursor.fetchall()]
