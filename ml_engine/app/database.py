from __future__ import annotations

import sqlite3
from pathlib import Path

from .config import DATABASE_PATH


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(Path(DATABASE_PATH))
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                name TEXT,
                risk_score INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                confidence INTEGER NOT NULL DEFAULT 30,
                heart_age INTEGER NOT NULL,
                heart_health_score INTEGER NOT NULL DEFAULT 50
            )
            """
        )
        connection.commit()


def save_prediction(name: str | None, result: dict) -> int:
    with _connect() as connection:
        cursor = connection.execute(
            """
            INSERT INTO predictions (name, risk_score, risk_level, confidence, heart_age, heart_health_score)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                result["risk_score"],
                result["risk_level"],
                result.get("confidence", 30),
                result["heart_age"],
                result.get("heart_health_score", 50),
            ),
        )
        connection.commit()
        return int(cursor.lastrowid)


def fetch_history(limit: int = 8) -> list[dict]:
    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT id, created_at, name, risk_score, risk_level, confidence, heart_age, heart_health_score
            FROM predictions
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [
        {
            "id": row["id"],
            "created_at": row["created_at"],
            "name": row["name"],
            "risk_score": row["risk_score"],
            "risk_level": row["risk_level"],
            "confidence": row["confidence"],
            "heart_age": row["heart_age"],
            "heart_health_score": row["heart_health_score"],
        }
        for row in rows
    ]
