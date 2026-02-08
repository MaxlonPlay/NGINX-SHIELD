import os
import re
import json
from functions.debug_log import debug_log


def load_pattern_file(filepath, log_path):
    debug_log(f"Caricamento dei pattern da: {filepath}", log_path)
    pattern_map = {}

    if not os.path.isfile(filepath):
        debug_log(f"File pattern non trovato: {filepath}", log_path)
        return pattern_map

    total_patterns = 0
    valid_patterns = 0

    with open(filepath, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            total_patterns += 1

            try:
                entry = json.loads(line)
                pattern = entry.get("pattern", "")
                description = entry.get("description", "")

                if pattern:
                    try:
                        re.compile(pattern)
                        valid_patterns += 1
                        pattern_map[pattern] = description
                    except re.error as e:
                        debug_log(
                            f"Regex non valida al rigo {line_num} in {filepath}: {pattern} - Errore: {e}",
                            log_path,
                        )
            except json.JSONDecodeError:

                if "=" in line:
                    pattern, description = line.split("=", 1)
                    pattern = pattern.strip()
                    description = description.strip()

                    try:
                        re.compile(pattern)
                        valid_patterns += 1
                        pattern_map[pattern] = description
                    except re.error as e:
                        debug_log(
                            f"Regex non valida al rigo {line_num} in {filepath}: {pattern} - Errore: {e}",
                            log_path,
                        )

    debug_log(
        f"{valid_patterns}/{total_patterns} pattern validi caricati da {filepath}",
        log_path,
    )
    return pattern_map
