
from .data_manager import WhitelistFileManager
from .core_logic import WhitelistCoreLogic
from .models import WhitelistEntry
from typing import Dict, List, Any, Optional


class WhitelistManager:
    def __init__(self, file_path: str = "data/db/whitelist.db"):
        self .file_manager = WhitelistFileManager(file_path)
        self .core_logic = WhitelistCoreLogic(self .file_manager)

    def get_entries(self) -> List[Dict[str, Any]]:
        return self .core_logic .get_entries()

    def get_metadata(self) -> Dict[str, Any]:
        return self .core_logic .get_metadata()

    def add_entry(self, entry: WhitelistEntry) -> Dict[str, Any]:
        return self .core_logic .add_entry(entry)

    def remove_entry(self, entry_type: str, value: str) -> Dict[str, Any]:
        return self .core_logic .remove_entry(entry_type, value)

    def update_entry(self, entry_type: str, value: str,
                     new_description: str) -> Dict[str, Any]:
        return self .core_logic .update_entry(
            entry_type, value, new_description)

    def get_stats(self) -> Dict[str, Any]:
        return self .core_logic .get_stats()

    def search_entries(self, query: str) -> List[Dict[str, Any]]:
        return self .core_logic .search_entries(query)


whitelist_manager = WhitelistManager()
