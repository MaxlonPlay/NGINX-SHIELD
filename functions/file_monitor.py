import os
import glob
import time
import threading
import subprocess
from .debug_log import debug_log


def tail_file(path, callback, stop_event, tail_processes, npm_debug_log):
    try:
        debug_log(f"Inizio tail su file: {path}", npm_debug_log)
        with subprocess.Popen(
            ["tail", "-F", "--lines=0", path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
        ) as proc:
            tail_processes.append(proc)
            while not stop_event.is_set():
                line = proc.stdout.readline()
                if line:
                    callback(line.strip())
    except Exception as e:
        debug_log(f"Errore tail su file {path}: {e}", npm_debug_log)


def monitor_pattern(
    pattern,
    callback,
    stop_event,
    monitored_files,
    tail_threads,
    tail_processes,
    npm_debug_log,
):
    while not stop_event.is_set():
        current_files = set(glob.glob(pattern))
        new_files = current_files - monitored_files
        for file in new_files:
            debug_log(f"Nuovo file trovato per tail: {file}", npm_debug_log)
            thread = threading.Thread(
                target=tail_file,
                args=(file, callback, stop_event, tail_processes, npm_debug_log),
                daemon=True,
            )
            thread.start()
            tail_threads.append(thread)
            monitored_files.add(file)
        time.sleep(5)


def check_log_rotation(f, last_position, banhammer_scrapper_file):
    current_size = os.path.getsize(banhammer_scrapper_file)
    if current_size < last_position:
        f.seek(0)
        return 0
    return last_position
