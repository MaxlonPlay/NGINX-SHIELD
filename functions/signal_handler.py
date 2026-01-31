import subprocess
from .debug_log import debug_log


def handle_signal(
        signum,
        frame,
        stop_event,
        tail_processes,
        tail_threads,
        npm_debug_log):
    debug_log(
        f"Segnale ricevuto: {signum}, terminazione in corso...",
        npm_debug_log)
    stop_event .set()

    for proc in tail_processes:
        try:
            proc .terminate()
            proc .wait(timeout=3)
        except subprocess .TimeoutExpired:
            debug_log(
                f"Processo {
                    proc .pid} non terminato entro 3s, kill forzato",
                npm_debug_log)
            proc .kill()

    for thread in tail_threads:
        if thread .is_alive():
            debug_log(f"Join thread {thread .name} iniziato", npm_debug_log)
            thread .join(timeout=5)
            if thread .is_alive():
                debug_log(
                    f"Thread {
                        thread .name} ancora vivo dopo join timeout",
                    npm_debug_log)

    debug_log(
        npm_debug_log)
