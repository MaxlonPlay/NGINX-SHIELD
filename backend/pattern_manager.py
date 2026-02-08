import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime


class PatternManager:
    def __init__(self, base_path: str = None):

        if base_path is None:

            base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        self.base_path = Path(base_path)
        self.patterns_dir = self.base_path / "patterns"
        self.dangerous_dir = self.base_path / "dangerous"

        self.patterns_dir.mkdir(parents=True, exist_ok=True)
        self.dangerous_dir.mkdir(parents=True, exist_ok=True)

        self.user_agent_file = self.patterns_dir / "user_agent.pattern"
        self.url_file = self.patterns_dir / "url.pattern"
        self.dangerous_ua_file = self.dangerous_dir / "user_agents.dangerous"
        self.dangerous_url_file = self.dangerous_dir / "intentions.dangerous"

        self._ensure_files_exist()

    def _ensure_files_exist(self):
        for file_path in [
            self.user_agent_file,
            self.url_file,
            self.dangerous_ua_file,
            self.dangerous_url_file,
        ]:
            if not file_path.exists():
                file_path.touch()

    def get_patterns(
        self, pattern_type: str = "all"
    ) -> Dict[str, List[Dict[str, Any]]]:

        patterns = {}

        if pattern_type in ["user_agent", "all"]:
            patterns["user_agent"] = self._read_patterns(
                self.user_agent_file, "user_agent"
            )

        if pattern_type in ["url", "all"]:
            patterns["url"] = self._read_patterns(self.url_file, "url")

        if pattern_type in ["dangerous_ua", "all"]:
            patterns["dangerous_ua"] = self._read_patterns(
                self.dangerous_ua_file, "dangerous_ua"
            )

        if pattern_type in ["dangerous_url", "all"]:
            patterns["dangerous_url"] = self._read_patterns(
                self.dangerous_url_file, "dangerous_url"
            )

        return patterns

    def _read_patterns(
        self, file_path: Path, pattern_type: str
    ) -> List[Dict[str, Any]]:

        if not file_path.exists():
            return []

        try:
            patterns = []
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            for i, line in enumerate(lines):
                line = line.rstrip("\n")
                if not line or line.startswith("#"):
                    continue

                try:
                    entry = json.loads(line)
                    if "id" not in entry:
                        entry["id"] = f"{pattern_type}_{i}"
                    if "pattern" not in entry:
                        entry["pattern"] = entry.get("regex", line)
                    if "type" not in entry:
                        entry["type"] = pattern_type
                    if "createdAt" not in entry:
                        entry["createdAt"] = datetime.now().isoformat()
                    if "description" not in entry:
                        entry["description"] = ""
                    patterns.append(entry)
                except json.JSONDecodeError:

                    if "=" in line:
                        pattern_part, description_part = line.split("=", 1)
                        pattern_part = pattern_part.strip()
                        description_part = description_part.strip()
                    else:
                        pattern_part = line
                        description_part = ""

                    patterns.append(
                        {
                            "id": f"{pattern_type}_{i}",
                            "pattern": pattern_part,
                            "description": description_part,
                            "type": pattern_type,
                            "createdAt": datetime.now().isoformat(),
                        }
                    )

            return patterns
        except Exception as e:
            print(f"[ERROR] Errore lettura pattern {file_path}: {e}")
            return []

    def add_pattern(
        self, pattern_type: str, pattern: str, description: str = ""
    ) -> Dict[str, Any]:

        if pattern_type == "user_agent":
            file_path = self.user_agent_file
        elif pattern_type == "url":
            file_path = self.url_file
        elif pattern_type == "dangerous_ua":
            file_path = self.dangerous_ua_file
        elif pattern_type == "dangerous_url":
            file_path = self.dangerous_url_file
        else:
            return {
                "success": False,
                "error": f"Tipo pattern non valido: {pattern_type}",
            }

        try:

            entry = {
                "id": f"{pattern_type}_{int(datetime .now().timestamp()*1000)}",
                "pattern": pattern,
                "description": description,
                "type": pattern_type,
                "createdAt": datetime.now().isoformat(),
            }

            with open(file_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")

            return {
                "success": True,
                "message": f"Pattern aggiunto con successo",
                "pattern": entry,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def remove_pattern(self, pattern_type: str, pattern_id: str) -> Dict[str, Any]:

        if pattern_type == "user_agent":
            file_path = self.user_agent_file
        elif pattern_type == "url":
            file_path = self.url_file
        elif pattern_type == "dangerous_ua":
            file_path = self.dangerous_ua_file
        elif pattern_type == "dangerous_url":
            file_path = self.dangerous_url_file
        else:
            return {
                "success": False,
                "error": f"Tipo pattern non valido: {pattern_type}",
            }

        try:
            patterns = self._read_patterns(file_path, pattern_type)
            remaining_patterns = [p for p in patterns if p["id"] != pattern_id]

            with open(file_path, "w", encoding="utf-8") as f:
                for pattern in remaining_patterns:
                    f.write(json.dumps(pattern) + "\n")

            return {"success": True, "message": "Pattern rimosso con successo"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def update_pattern(
        self, pattern_type: str, pattern_id: str, pattern: str, description: str
    ) -> Dict[str, Any]:

        if pattern_type == "user_agent":
            file_path = self.user_agent_file
        elif pattern_type == "url":
            file_path = self.url_file
        elif pattern_type == "dangerous_ua":
            file_path = self.dangerous_ua_file
        elif pattern_type == "dangerous_url":
            file_path = self.dangerous_url_file
        else:
            return {
                "success": False,
                "error": f"Tipo pattern non valido: {pattern_type}",
            }

        try:
            patterns = self._read_patterns(file_path, pattern_type)

            updated = False
            for p in patterns:
                if p["id"] == pattern_id:
                    p["pattern"] = pattern
                    p["description"] = description
                    updated = True
                    break

            if not updated:
                return {
                    "success": False,
                    "error": f"Pattern con ID {pattern_id} non trovato",
                }

            with open(file_path, "w", encoding="utf-8") as f:
                for p in patterns:
                    f.write(json.dumps(p) + "\n")

            return {
                "success": True,
                "message": "Pattern aggiornato con successo",
                "pattern": patterns[
                    [i for i, p in enumerate(patterns) if p["id"] == pattern_id][0]
                ],
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_stats(self) -> Dict[str, Any]:

        patterns = self.get_patterns("all")

        return {
            "user_agent": len(patterns.get("user_agent", [])),
            "url": len(patterns.get("url", [])),
            "dangerous_ua": len(patterns.get("dangerous_ua", [])),
            "dangerous_url": len(patterns.get("dangerous_url", [])),
            "total": sum(len(v) for v in patterns.values()),
        }


pattern_manager = PatternManager()
