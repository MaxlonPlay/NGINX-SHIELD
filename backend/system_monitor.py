

import psutil
import subprocess
import logging
import os
import csv
import time
import threading
import shutil
import socket
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from contextlib import contextmanager


LOG_FILE_PATH = "data/log/system_status_log.csv"
LOG_INTERVAL_SECONDS = 10
RETENTION_DAYS = 30


SERVICE_CACHE_TTL = 5
TEMP_CACHE_TTL = 2
LOADAVG_CACHE_TTL = 10
RAM_CACHE_TTL = 2


NGINX_HEALTH_ENDPOINT = "http://localhost/health"
NGINX_HEALTH_FALLBACK_TCP = True
NGINX_PORT = 80


os .makedirs(os .path .dirname(LOG_FILE_PATH), exist_ok=True)


if not os .path .exists(LOG_FILE_PATH):
    try:
        with open(LOG_FILE_PATH, 'w', encoding='utf-8', newline='')as f:
            writer = csv .writer(f)
            writer .writerow(
                ["timestamp", "temperature", "cpuUsage", "ramUsage"])
    except Exception as e:
        print(f"✗ ERRORE creazione file CSV: {e}")


logging .basicConfig(
    level=logging .WARNING,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging .FileHandler('data/log/system_monitor.log'),
        logging .StreamHandler()
    ]
)


def format_uptime(seconds: float) -> str:
    d = datetime(1, 1, 1)+timedelta(seconds=seconds)
    return f"{d .day - 1}g {d .hour}h {d .minute}m"


@contextmanager
def safe_file_operation(filepath: str, mode: str = 'r'):
    file_handle = None
    try:
        os .makedirs(os .path .dirname(filepath), exist_ok=True)
        file_handle = open(filepath, mode, newline='')
        yield file_handle
    except Exception as e:
        logging .error(f"Errore file {filepath}: {e}")
        raise
    finally:
        if file_handle:
            file_handle .close()


class SystemMonitor:
    def __init__(self):
        self .stop_logging_event = threading .Event()
        self .logging_thread = threading .Thread(
            target=self ._logging_worker, daemon=True)

        self ._cpu_temp_cache: Optional[tuple] = None
        self ._ram_cache: Optional[tuple] = None
        self ._loadavg_cache: Optional[tuple] = None
        self ._service_cache: Dict[str, tuple] = {}

        self ._boot_time = None
        self ._cpu_cores = None

        self ._temp_sensor_key = None

        self ._nginx_health_available = None

        psutil .cpu_percent(interval=None)

        self .logging_thread .start()
        logging .warning(
            f"SystemMonitor avviato - intervallo: {LOG_INTERVAL_SECONDS}s")

    def stop_logging(self):
        self .stop_logging_event .set()
        self .logging_thread .join()
        logging .warning("Thread di logging fermato")

    def _check_nginx_tcp(self) -> bool:
        try:
            with socket .create_connection(("localhost", NGINX_PORT), timeout=1):
                return True
        except BaseException:
            return False

    def _check_nginx_http(self) -> bool:
        try:
            import urllib .request
            with urllib .request .urlopen(NGINX_HEALTH_ENDPOINT, timeout=2)as response:
                return response .status == 200
        except BaseException:
            return False

    def _check_nginx_status(self) -> bool:
        now = time .time()

        if 'nginx' in self ._service_cache:
            timestamp, status = self ._service_cache['nginx']
            if now - timestamp < SERVICE_CACHE_TTL:
                return status

        if self ._nginx_health_available is None:
            self ._nginx_health_available = self ._check_nginx_http()

        if self ._nginx_health_available:
            status = self ._check_nginx_http()
            if not status and NGINX_HEALTH_FALLBACK_TCP:
                status = self ._check_nginx_tcp()
        else:
            status = self ._check_nginx_tcp()

        self ._service_cache['nginx'] = (now, status)
        return status

    def _check_fail2ban_status(self) -> bool:
        now = time .time()

        if 'fail2ban' in self ._service_cache:
            timestamp, status = self ._service_cache['fail2ban']
            if now - timestamp < SERVICE_CACHE_TTL:
                return status

        try:
            result = subprocess .run(
                ['fail2ban-client', 'ping'],
                capture_output=True,
                text=True,
                timeout=1,
                check=False
            )
            status = 'pong' in result .stdout .lower()
        except BaseException:
            status = False

        self ._service_cache['fail2ban'] = (now, status)
        return status

    def _get_boot_time(self) -> float:
        if self ._boot_time is None:
            self ._boot_time = psutil .boot_time()
        return self ._boot_time

    def _get_cpu_cores(self) -> int:
        if self ._cpu_cores is None:
            self ._cpu_cores = psutil .cpu_count(logical=True)
        return self ._cpu_cores

    def _get_load_average(self) -> Dict[str, float]:
        now = time .time()

        if self ._loadavg_cache:
            timestamp, data = self ._loadavg_cache
            if now - timestamp < LOADAVG_CACHE_TTL:
                return data

        try:
            load1, load5, load15 = os .getloadavg()
            cpu_cores = self ._get_cpu_cores()
            data = {
                "1min": round(
                    load1, 2), "5min": round(
                    load5, 2), "15min": round(
                    load15, 2), "normalized_1min": round(
                    (load1 / cpu_cores)*100, 1)if cpu_cores > 0 else 0}
            self ._loadavg_cache = (now, data)
            return data
        except BaseException:
            return {
                "1min": 0.0,
                "5min": 0.0,
                "15min": 0.0,
                "normalized_1min": 0.0}

    def _get_ram_info(self):
        now = time .time()

        if self ._ram_cache:
            timestamp, data = self ._ram_cache
            if now - timestamp < RAM_CACHE_TTL:
                return data

        data = psutil .virtual_memory()
        self ._ram_cache = (now, data)
        return data

    def _get_cpu_temperature(self) -> float:
        now = time .time()

        if self ._cpu_temp_cache:
            timestamp, temp = self ._cpu_temp_cache
            if now - timestamp < TEMP_CACHE_TTL:
                return temp

        try:
            temps = psutil .sensors_temperatures()

            if self ._temp_sensor_key is None:
                for key in [
                    'coretemp',
                    'k10temp',
                    'cpu_thermal',
                        'soc_thermal']:
                    if key in temps:
                        self ._temp_sensor_key = key
                        break

                if self ._temp_sensor_key is None and temps:
                    self ._temp_sensor_key = next(iter(temps .keys()))

            if self ._temp_sensor_key and self ._temp_sensor_key in temps:
                temp_value = max(
                    entry .current for entry in temps[self ._temp_sensor_key]if entry .current)
                self ._cpu_temp_cache = (now, temp_value)
                return temp_value

        except BaseException:
            pass

        self ._cpu_temp_cache = (now, 0.0)
        return 0.0

    def _validate_csv_record(self, record: Dict[str, str]) -> bool:
        try:
            if not all(
                k in record for k in [
                    'timestamp',
                    'cpuUsage',
                    'ramUsage']):
                return False

            datetime .fromisoformat(record['timestamp'])
            cpu = int(record['cpuUsage'])
            ram = int(record['ramUsage'])

            return 0 <= cpu <= 100 and 0 <= ram <= 100
        except BaseException:
            return False

    def _save_status_to_file(self, data: Dict[str, Any]):
        record = {
            "timestamp": datetime .now().isoformat(timespec='seconds'),
            "temperature": data .get("cpuDetails", {}).get("temperature", 0.0),
            "cpuUsage": data .get("cpuUsage", 0),
            "ramUsage": data .get("ramUsage", 0)
        }

        if not (0 <= record["cpuUsage"] <= 100 and 0 <=
                record["ramUsage"] <= 100):
            return

        try:
            fieldnames = ["timestamp", "temperature", "cpuUsage", "ramUsage"]
            file_exists = os .path .exists(LOG_FILE_PATH)

            with safe_file_operation(LOG_FILE_PATH, 'a')as csvfile:
                writer = csv .DictWriter(csvfile, fieldnames=fieldnames)

                if not file_exists or os .path .getsize(LOG_FILE_PATH) == 0:
                    writer .writeheader()

                writer .writerow(record)
        except Exception as e:
            logging .error(f"Errore scrittura CSV: {e}")

    def _cleanup_old_logs(self):
        if not os .path .exists(LOG_FILE_PATH):
            return

        try:
            cutoff_date = datetime .now()-timedelta(days=RETENTION_DAYS)
            backup_file = f"{LOG_FILE_PATH}.backup"
            temp_file = f"{LOG_FILE_PATH}.tmp"

            shutil .copy2(LOG_FILE_PATH, backup_file)

            records_kept = 0

            with open(LOG_FILE_PATH, 'r', newline='')as infile, open(temp_file, 'w', newline='')as outfile:

                reader = csv .DictReader(infile)
                writer = csv .DictWriter(
                    outfile, fieldnames=reader .fieldnames)
                writer .writeheader()

                for row in reader:
                    try:
                        if datetime .fromisoformat(
                                row['timestamp']) >= cutoff_date:
                            writer .writerow(row)
                            records_kept += 1
                    except BaseException:
                        continue

            shutil .move(temp_file, LOG_FILE_PATH)
            os .remove(backup_file)

            logging .warning(f"Pulizia: {records_kept} record mantenuti")

        except Exception as e:
            logging .error(f"Errore pulizia log: {e}")

            if os .path .exists(backup_file):
                shutil .copy2(backup_file, LOG_FILE_PATH)
                os .remove(backup_file)

            if os .path .exists(temp_file):
                os .remove(temp_file)

    def get_historical_data(self, timeframe: str) -> Dict[str, Any]:
        try:
            mapping = {
                '24h': 86400,
                '1w': 604800,
                '1m': 2592000,
                '1y': 31536000}
            limit_seconds = mapping .get(timeframe .lower(), 10800)
            limit_datetime = datetime .now()-timedelta(seconds=limit_seconds)

            if not os .path .exists(LOG_FILE_PATH):
                return {"timeframe": timeframe, "data": []}

            historical_records = []

            with safe_file_operation(LOG_FILE_PATH, 'r')as csvfile:
                reader = csv .DictReader(csvfile)

                for row in reader:
                    try:
                        if not self ._validate_csv_record(row):
                            continue

                        if datetime .fromisoformat(
                                row['timestamp']) >= limit_datetime:
                            historical_records .append({
                                "timestamp": row['timestamp'],
                                "temperature": float(row .get('temperature', 0.0)),
                                "cpuUsage": int(row .get('cpuUsage', 0)),
                                "ramUsage": int(row .get('ramUsage', 0))
                            })
                    except BaseException:
                        continue

            return {"timeframe": timeframe, "data": historical_records}

        except Exception as e:
            logging .error(f"Errore recupero storico: {e}")
            return {"timeframe": timeframe, "data": [], "error": str(e)}

    def _logging_worker(self):
        cleanup_counter = 0
        interval = max(1, LOG_INTERVAL_SECONDS)

        while not self .stop_logging_event .is_set():
            try:
                status_data = self .get_detailed_status()
                self ._save_status_to_file(status_data)

                cleanup_counter += 1
                if cleanup_counter >= (21600 // interval):
                    self ._cleanup_old_logs()
                    cleanup_counter = 0

            except Exception as e:
                logging .error(f"Errore worker: {e}")

            self .stop_logging_event .wait(interval)

    def get_status(self) -> Dict[str, Any]:
        return self .get_detailed_status()

    def get_detailed_status(self) -> Dict[str, Any]:
        try:

            cpu_usage = psutil .cpu_percent(interval=None)
            cpu_cores = self ._get_cpu_cores()

            cpu_temp = self ._get_cpu_temperature()
            load_avg = self ._get_load_average()
            ram = self ._get_ram_info()

            fail2ban_status = self ._check_fail2ban_status()
            nginx_status = self ._check_nginx_status()

            uptime_seconds = datetime .now().timestamp()-self ._get_boot_time()
            system_uptime = format_uptime(uptime_seconds)

            return {
                "cpuUsage": round(cpu_usage),
                "ramUsage": round(ram .percent),
                "temperature": round(cpu_temp)if cpu_temp > 0 else 1,
                "pythonScript": True,
                "fail2ban": fail2ban_status,
                "nginx": nginx_status,
                "cpuDetails": {
                    "usage": round(cpu_usage),
                    "cores": cpu_cores,
                    "temperature": cpu_temp,
                    "loadAverage": [
                        load_avg .get("1min", 0.0),
                        load_avg .get("5min", 0.0),
                        load_avg .get("15min", 0.0)
                    ],
                },
                "ramDetails": {
                    "total": round(ram .total / (1024 ** 3), 2),
                    "used": round(ram .used / (1024 ** 3), 2),
                    "free": round(ram .free / (1024 ** 3), 2),
                    "usagePercentage": round(ram .percent),
                },
                "generalMetrics": {"uptime": system_uptime}
            }

        except Exception as e:
            logging .error(f"Errore recupero stato: {e}")
            return {
                "cpuUsage": 0,
                "ramUsage": 0,
                "temperature": 0,
                "pythonScript": True,
                "fail2ban": False,
                "nginx": False,
                "error": str(e)
            }


system_monitor = SystemMonitor()
