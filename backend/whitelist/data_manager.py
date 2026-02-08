import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import HTTPException
import contextlib
from pydantic import BaseModel, Field, ValidationError


class WhitelistEntryInternal(BaseModel):
    type: str
    value: str
    description: Optional[str] = None
    created: Optional[str] = None


class WhitelistDataPayloadInternal(BaseModel):
    entries: List[WhitelistEntryInternal]
    metadata: Dict[str, str] = {}


class WhitelistFileManager:
    def __init__(self, db_path: str = "data/db/whitelist.db"):
        self.db_path = db_path
        self._ensure_db_exists()

    @contextlib.contextmanager
    def _get_db_connection(self):
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            yield conn
        except sqlite3.Error as e:
            raise HTTPException(
                status_code=500, detail=f"Errore di connessione al database: {str(e)}"
            )
        finally:
            if conn:
                conn.close()

    def _ensure_db_exists(self):
        with self._get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    value TEXT NOT NULL UNIQUE,
                    description TEXT,
                    created TEXT
                )
            """)

            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_entries_type ON entries (type);"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_entries_value ON entries (value);"
            )

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS metadata (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            """)

            cursor.execute("SELECT COUNT(*) FROM metadata WHERE key = 'version'")
            if cursor.fetchone()[0] == 0:
                now = datetime.utcnow().isoformat()
                cursor.execute(
                    "INSERT INTO metadata (key, value) VALUES (?, ?)", ("created", now)
                )
                cursor.execute(
                    "INSERT INTO metadata (key, value) VALUES (?, ?)",
                    ("last_modified", now),
                )
                cursor.execute(
                    "INSERT INTO metadata (key, value) VALUES (?, ?)",
                    ("version", "1.0"),
                )

            conn.commit()

    def load_whitelist(self) -> Dict[str, Any]:
        with self._get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT type, value, description, created FROM entries")
            entries = [dict(row) for row in cursor.fetchall()]

            cursor.execute("SELECT key, value FROM metadata")
            metadata = {row["key"]: row["value"] for row in cursor.fetchall()}

            return {"entries": entries, "metadata": metadata}

    def save_whitelist(self, data: Dict[str, Any]):
        try:
            validated_data = WhitelistDataPayloadInternal(**data)
        except ValidationError as e:
            raise HTTPException(
                status_code=400, detail=f"Dati di input non validi: {e .errors()}"
            )
        except TypeError as e:
            raise HTTPException(
                status_code=400, detail=f"Formato dati JSON non valido: {str(e)}"
            )

        with self._get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT value FROM entries")
            existing_values = {row["value"] for row in cursor.fetchall()}

            entries_to_add = []
            values_in_new_data = {entry.value for entry in validated_data.entries}

            for entry in validated_data.entries:
                if entry.value not in existing_values:
                    created_timestamp = (
                        entry.created
                        if entry.created
                        else datetime.utcnow().isoformat()
                    )
                    entries_to_add.append(
                        (entry.type, entry.value, entry.description, created_timestamp)
                    )

            entries_to_delete_values = existing_values - values_in_new_data
            if entries_to_delete_values:
                placeholders = ",".join("?" for _ in entries_to_delete_values)
                cursor.execute(
                    f"DELETE FROM entries WHERE value IN ({placeholders})",
                    list(entries_to_delete_values),
                )

            if entries_to_add:
                cursor.executemany(
                    "INSERT OR IGNORE INTO entries (type, value, description, created) VALUES (?, ?, ?, ?)",
                    entries_to_add,
                )

            now = datetime.utcnow().isoformat()
            cursor.execute(
                "REPLACE INTO metadata (key, value) VALUES (?, ?)",
                ("last_modified", now),
            )

            conn.commit()
