import time
import threading
from datetime import datetime
from collections import deque
from .debug_log import debug_log


MEMORY_CLEANUP_INTERVAL = 600
IP_INACTIVITY_THRESHOLD = 3600
MAX_IP_ENTRIES = 10000
CLEANUP_BATCH_SIZE = 100


class IPDataManager:
    def __init__(self, time_frame, max_requests, npm_debug_log):
        self .ip_data = {}
        self .ip_data_lock = threading .RLock()
        self .time_frame = time_frame
        self .max_requests = max_requests
        self .npm_debug_log = npm_debug_log

        self .cleanup_stats = {
            'total_cleanups': 0,
            'total_removed': 0,
            'last_cleanup': None,
            'current_size': 0,
            'avg_cleanup_time': 0,
            'max_size_reached': 0
        }

        self .performance_stats = {
            'total_updates': 0,
            'avg_update_time_ms': 0,
            'lock_wait_time_ms': 0
        }

        self .cleanup_queue = deque(maxlen=1000)

    def update_ip_data(self, ip, code, allowed_codes):

        start_time = time .time()
        now_ts = time .time()

        with self .ip_data_lock:

            if ip not in self .ip_data and len(
                    self .ip_data) >= MAX_IP_ENTRIES:
                debug_log(
                    f"Limite massimo IP raggiunto ({MAX_IP_ENTRIES}), cleanup forzato",
                    self .npm_debug_log)
                self ._emergency_cleanup()

            if ip not in self .ip_data:
                self .ip_data[ip] = {
                    "errors": 0,
                    "first_error_time": now_ts,
                    "last_activity": now_ts,
                    "banned": False,
                    "total_requests": 0,
                    "created_at": now_ts
                }

            ip_info = self .ip_data[ip]
            ip_info["last_activity"] = now_ts
            ip_info["total_requests"] += 1

            elapsed = now_ts - ip_info["first_error_time"]
            if elapsed > self .time_frame:
                total_errors = ip_info["errors"]
                ip_info["errors"] = 0
                ip_info["first_error_time"] = now_ts
                ip_info["banned"] = False

                if total_errors > 0:
                    debug_log(
                        f"IP: {ip}, Reset contatore errori, totali nel period precedente: {total_errors}",
                        self .npm_debug_log)

            if code not in allowed_codes:
                ip_info["errors"] += 1

            result = (ip_info["errors"], ip_info["banned"])

        elapsed_ms = (time .time()-start_time)*1000
        self .performance_stats['total_updates'] += 1

        alpha = 0.1
        current_avg = self .performance_stats['avg_update_time_ms']
        self .performance_stats['avg_update_time_ms'] = (
            alpha * elapsed_ms + (1 - alpha)*current_avg
        )

        return result

    def _emergency_cleanup(self):

        cleanup_start = time .time()
        debug_log("Avvio cleanup di emergenza", self .npm_debug_log)

        sorted_ips = sorted(
            self .ip_data .items(),
            key=lambda x: x[1]["last_activity"]
        )

        remove_count = max(1, len(sorted_ips)//5)
        removed = 0

        for ip, _ in sorted_ips[:remove_count]:
            del self .ip_data[ip]
            removed += 1

        elapsed = time .time()-cleanup_start
        debug_log(
            f"Cleanup emergenza completato: {removed} IP rimossi in {
                elapsed:.3f}s",
            self .npm_debug_log)

        self .cleanup_stats['total_removed'] += removed
        self .cleanup_stats['max_size_reached'] = max(
            self .cleanup_stats['max_size_reached'],
            len(self .ip_data)
        )

    def periodic_cleanup(self):

        cleanup_start = time .time()
        debug_log("Avvio cleanup periodico IP inattivi", self .npm_debug_log)

        current_time = time .time()
        removed_count = 0
        processed_count = 0
        ips_to_remove = []

        with self .ip_data_lock:
            for ip, data in list(self .ip_data .items()):
                processed_count += 1

                time_since_activity = current_time - data["last_activity"]
                time_since_creation = current_time - \
                    data .get("created_at", current_time)

                if time_since_activity > IP_INACTIVITY_THRESHOLD:
                    ips_to_remove .append((ip, "inattività"))

                elif (not data["banned"] and
                      data["errors"] == 0 and
                      time_since_activity > (self .time_frame * 2)):
                    ips_to_remove .append((ip, "pulito vecchio"))

        batch_size = CLEANUP_BATCH_SIZE
        for i in range(0, len(ips_to_remove), batch_size):
            batch = ips_to_remove[i:i + batch_size]

            with self .ip_data_lock:
                for ip, reason in batch:
                    if ip in self .ip_data:
                        del self .ip_data[ip]
                        removed_count += 1

            if i + batch_size < len(ips_to_remove):
                time .sleep(0.001)

        cleanup_elapsed = time .time()-cleanup_start

        self .cleanup_stats['total_cleanups'] += 1
        self .cleanup_stats['total_removed'] += removed_count
        self .cleanup_stats['last_cleanup'] = datetime .now()
        self .cleanup_stats['current_size'] = len(self .ip_data)

        current_avg = self .cleanup_stats['avg_cleanup_time']
        alpha = 0.2
        self .cleanup_stats['avg_cleanup_time'] = (
            alpha * cleanup_elapsed + (1 - alpha)*current_avg
        )

        debug_log(
            f"Cleanup completato: {removed_count} IP rimossi su {processed_count} processati "
            f"in {cleanup_elapsed:.3f}s, {len(self .ip_data)} IP rimanenti",
            self .npm_debug_log
        )

        if self .cleanup_stats['total_cleanups'] % 10 == 0:
            self .log_memory_stats()

    def log_memory_stats(self):
        stats = self .cleanup_stats
        perf = self .performance_stats

        debug_log("="*60, self .npm_debug_log)
        debug_log("=== STATISTICHE MEMORIA IP_DATA ===", self .npm_debug_log)
        debug_log(
            f"Cleanup totali: {
                stats['total_cleanups']}",
            self .npm_debug_log)
        debug_log(
            f"IP rimossi totali: {
                stats['total_removed']}",
            self .npm_debug_log)
        debug_log(
            f"Dimensione attuale: {
                stats['current_size']}",
            self .npm_debug_log)
        debug_log(
            f"Massima dimensione raggiunta: {
                stats['max_size_reached']}",
            self .npm_debug_log)
        debug_log(
            f"Ultimo cleanup: {
                stats['last_cleanup']}",
            self .npm_debug_log)
        debug_log(
            f"Utilizzo memoria: {stats['current_size']}/{MAX_IP_ENTRIES} "
            f"({(stats['current_size']/MAX_IP_ENTRIES)*100:.1f}%)",
            self .npm_debug_log
        )
        debug_log(
            f"Tempo medio cleanup: {
                stats['avg_cleanup_time']:.3f}s",
            self .npm_debug_log)

        debug_log("=== STATISTICHE PERFORMANCE ===", self .npm_debug_log)
        debug_log(
            f"Update totali: {
                perf['total_updates']}",
            self .npm_debug_log)
        debug_log(
            f"Tempo medio update: {
                perf['avg_update_time_ms']:.3f}ms",
            self .npm_debug_log)
        debug_log("="*60, self .npm_debug_log)

    def get_ip_info(self, ip):
        with self .ip_data_lock:
            return self .ip_data .get(ip, None)

    def mark_as_banned(self, ip):
        with self .ip_data_lock:
            if ip in self .ip_data:
                self .ip_data[ip]["banned"] = True

    def remove_ip(self, ip):
        with self .ip_data_lock:
            if ip in self .ip_data:
                del self .ip_data[ip]
                return True
            return False

    def get_stats(self):
        with self .ip_data_lock:
            active_ips = len(self .ip_data)
            banned_ips = sum(
                1 for data in self .ip_data .values()if data["banned"])
            total_requests = sum(data["total_requests"]
                                 for data in self .ip_data .values())
            total_errors = sum(data["errors"]
                               for data in self .ip_data .values())

        return {
            'active_ips': active_ips,
            'banned_ips': banned_ips,
            'total_requests': total_requests,
            'total_errors': total_errors,
            'cleanup_stats': self .cleanup_stats .copy(),
            'performance_stats': self .performance_stats .copy()
        }

    def get_top_offenders(self, limit=10):
        with self .ip_data_lock:
            sorted_ips = sorted(
                self .ip_data .items(),
                key=lambda x: x[1]["errors"],
                reverse=True
            )

            return [
                {
                    'ip': ip,
                    'errors': data['errors'],
                    'total_requests': data['total_requests'],
                    'first_error_time': datetime .fromtimestamp(data['first_error_time']),
                    'banned': data['banned']
                }
                for ip, data in sorted_ips[:limit]
            ]


def start_memory_cleanup_thread(
        ip_manager,
        stop_event,
        tail_threads,
        npm_debug_log):

    def cleanup_worker():
        debug_log("Thread cleanup memoria avviato", npm_debug_log)
        cleanup_count = 0

        while not stop_event .is_set():
            try:

                ip_manager .periodic_cleanup()
                cleanup_count += 1

                if cleanup_count % 10 == 0:
                    stats = ip_manager .get_stats()
                    debug_log(
                        f"Cleanup #{cleanup_count}: "
                        f"{stats['active_ips']} IP attivi, "
                        f"{stats['banned_ips']} bannati, "
                        f"{stats['total_errors']} errori totali",
                        npm_debug_log
                    )

            except Exception as e:
                debug_log(
                    f"Errore durante cleanup memoria: {e}",
                    npm_debug_log
                )

            if stop_event .wait(MEMORY_CLEANUP_INTERVAL):
                break

        debug_log(
            "Esecuzione cleanup finale prima dello shutdown...",
            npm_debug_log)
        try:
            ip_manager .periodic_cleanup()
            final_stats = ip_manager .get_stats()
            debug_log(
                f"Cleanup finale completato: {
                    final_stats['active_ips']} IP rimanenti",
                npm_debug_log)
        except Exception as e:
            debug_log(f"Errore durante cleanup finale: {e}", npm_debug_log)

        debug_log("Thread cleanup memoria terminato", npm_debug_log)

    cleanup_thread = threading .Thread(
        target=cleanup_worker,
        name="memory_cleanup",
        daemon=True
    )
    cleanup_thread .start()
    tail_threads .append(cleanup_thread)

    debug_log(
        f"Thread cleanup memoria configurato (intervallo: {MEMORY_CLEANUP_INTERVAL}s)",
        npm_debug_log)

    return cleanup_thread
