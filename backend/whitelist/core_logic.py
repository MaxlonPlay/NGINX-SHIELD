
from typing import Dict, List, Any
from datetime import datetime
from fastapi import HTTPException
from .models import WhitelistEntry
from .data_manager import WhitelistFileManager


class WhitelistCoreLogic:
    def __init__(self, file_manager: WhitelistFileManager):
        self .file_manager = file_manager

    def get_entries(self) -> List[Dict[str, Any]]:
        data = self .file_manager .load_whitelist()
        return data .get("entries", [])

    def get_metadata(self) -> Dict[str, Any]:
        data = self .file_manager .load_whitelist()
        return data .get("metadata", {})

    def add_entry(self, entry: WhitelistEntry) -> Dict[str, Any]:
        data = self .file_manager .load_whitelist()

        for existing_entry in data["entries"]:
            if (existing_entry["type"] == entry .type and
                    existing_entry["value"] == entry .value):
                raise HTTPException(
                    status_code=400,
                    detail=f"Entry già esistente: {entry .type} {entry .value}"
                )

        new_entry = {
            "type": entry .type,
            "value": entry .value,
            "description": entry .description,
            "created": datetime .utcnow().isoformat()
        }

        data["entries"].append(new_entry)

        self .file_manager .save_whitelist(data)

        return {
            "success": True,
            "message": "Entry aggiunta con successo",
            "entry": new_entry
        }

    def remove_entry(self, entry_type: str, value: str) -> Dict[str, Any]:
        data = self .file_manager .load_whitelist()

        original_count = len(data["entries"])
        data["entries"] = [
            entry for entry in data["entries"]
            if not (entry["type"] == entry_type and entry["value"] == value)
        ]

        if len(data["entries"]) == original_count:
            raise HTTPException(
                status_code=404,
                detail=f"Entry non trovata: {entry_type} {value}"
            )

        self .file_manager .save_whitelist(data)

        return {
            "success": True,
            "message": "Entry rimossa con successo"
        }

    def update_entry(self, entry_type: str, value: str,
                     new_description: str) -> Dict[str, Any]:
        data = self .file_manager .load_whitelist()

        entry_found = False
        for entry in data["entries"]:
            if entry["type"] == entry_type and entry["value"] == value:
                entry["description"] = new_description
                entry_found = True
                break

        if not entry_found:
            raise HTTPException(
                status_code=404,
                detail=f"Entry non trovata: {entry_type} {value}"
            )

        self .file_manager .save_whitelist(data)

        return {
            "success": True,
            "message": "Entry aggiornata con successo"
        }

    def get_stats(self) -> Dict[str, Any]:
        entries = self .get_entries()
        metadata = self .get_metadata()

        stats = {
            "total_entries": len(entries),
            "by_type": {},
            "created": metadata .get("created"),
            "last_modified": metadata .get("last_modified"),
            "version": metadata .get("version")
        }

        for entry in entries:
            entry_type = entry["type"]
            if entry_type not in stats["by_type"]:
                stats["by_type"][entry_type] = 0
            stats["by_type"][entry_type] += 1

        return stats

    def search_entries(self, query: str) -> List[Dict[str, Any]]:
        entries = self .get_entries()

        if not query:
            return entries

        query_lower = query .lower()
        filtered_entries = []

        for entry in entries:
            if (query_lower in entry["value"].lower() or
                query_lower in entry["description"].lower() or
                    query_lower in entry["type"].lower()):
                filtered_entries .append(entry)

        return filtered_entries
