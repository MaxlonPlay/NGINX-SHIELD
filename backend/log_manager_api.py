import os
from pathlib import Path
from typing import Optional, List
from datetime import datetime


class LogManagerAPI:

    def __init__(self, log_dir: str = None):

        if log_dir is None:
            log_dir = os .path .join(os .path .dirname(__file__), '..', 'data', 'log')

        self .log_dir = Path(log_dir)
        self .log_dir .mkdir(parents=True, exist_ok=True)

    def get_logs(
        self,
        log_type: str = "npm_debug",
        limit: Optional[int] = None,
        offset: int = 0,
        search: Optional[str] = None
    ) -> dict:

        log_file = self .log_dir / f"{log_type}.log"

        if not log_file .exists():
            return {
                "logs": [],
                "total": 0,
                "limit": limit,
                "offset": offset,
                "search": search,
                "error": f"Log file not found: {log_file}"
            }

        try:

            with open(log_file, 'r', encoding='utf-8')as f:
                lines = f .readlines()

            if search:
                search_lower = search .lower()
                lines = [
                    line for line in lines if search_lower in line .lower()]

            lines .reverse()

            total = len(lines)

            if offset > 0:
                lines = lines[offset:]

            if limit is not None:
                lines = lines[:limit]

            logs = [line .rstrip('\n')for line in lines]

            return {
                "logs": logs,
                "total": total,
                "limit": limit,
                "offset": offset,
                "search": search,
                "log_file": str(log_file)
            }

        except Exception as e:
            return {
                "logs": [],
                "total": 0,
                "limit": limit,
                "offset": offset,
                "search": search,
                "error": str(e)
            }

    def get_available_logs(self) -> List[str]:

        try:
            log_files = list(self .log_dir .glob("*.log"))
            return sorted([f .stem for f in log_files])
        except Exception as e:
            print(f"[ERROR] get_available_logs: {e}")
            import traceback
            traceback .print_exc()
            return []

    def get_logs_stats(self, log_type: str = "npm_debug") -> dict:

        log_file = self .log_dir / f"{log_type}.log"

        if not log_file .exists():
            return {
                "exists": False,
                "log_type": log_type
            }

        try:
            stat = log_file .stat()
            with open(log_file, 'r', encoding='utf-8')as f:
                line_count = sum(1 for _ in f)

            return {
                "exists": True,
                "log_type": log_type,
                "file_size_bytes": stat .st_size,
                "file_size_kb": round(
                    stat .st_size / 1024,
                    2),
                "line_count": line_count,
                "last_modified": datetime .fromtimestamp(
                    stat .st_mtime).isoformat()}
        except Exception as e:
            return {
                "exists": True,
                "log_type": log_type,
                "error": str(e)
            }

    def search_logs(
        self,
        log_type: str = "npm_debug",
        query: str = "",
        limit: int = 100
    ) -> dict:

        return self .get_logs(log_type=log_type, limit=limit, search=query)
