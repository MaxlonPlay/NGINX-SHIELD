import subprocess
import threading
import signal
import sys
import os
import time
import json
from datetime import datetime

PID_FILE = "server_manager.pid"
LOG_FILE = "data/log/server.log"


class ServerManager:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.npm_analyzer_process = None
        self.geolocate_process = None
        self.running = True
        self.detach_mode = False
        self.service_commands_dir = "service_commands"
        os.makedirs("data/log", exist_ok=True)
        os.makedirs(self.service_commands_dir, exist_ok=True)

    def log_message(self, message, source="SYSTEM"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{source}] {message}\n"
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(log_entry)
        if not self.detach_mode:
            print(log_entry.strip())

    def check_restart_commands(self):
        services = ["backend", "frontend", "analyzer", "geolocate"]
        restarts = {
            "backend": self.restart_backend,
            "frontend": self.restart_frontend,
            "analyzer": self.restart_analyzer,
            "geolocate": self.restart_geolocate,
        }

        for service in services:
            command_file = os.path.join(self.service_commands_dir, f"{service}.restart")
            if os.path.exists(command_file):
                try:
                    with open(command_file, "r", encoding="utf-8") as f:
                        command_data = json.load(f)

                    if command_data.get("command") == "restart":
                        self.log_message(
                            f"Restart richiesto per {service}", service.upper()
                        )
                        if service in restarts:
                            restarts[service]()

                        os.remove(command_file)
                except Exception as e:
                    self.log_message(
                        f"Errore durante l'elaborazione del restart: {e}",
                        service.upper(),
                    )

    def stream_output(self, process, source):
        try:
            for line in iter(process.stdout.readline, ""):
                if line and self.running:
                    decoded_line = line.strip()
                    if decoded_line:
                        self.log_message(decoded_line, source)
        except Exception as e:
            self.log_message(f"Errore durante la lettura dell'output: {e}", source)

    def start_backend(self):
        self.log_message("Avvio backend...", "BACKEND")
        self.backend_process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "backend.main:app",
                "--reload",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            text=True,
        )
        threading.Thread(
            target=self.stream_output,
            args=(self.backend_process, "BACKEND"),
            daemon=True,
        ).start()
        self.log_message("Backend avviato con successo", "BACKEND")

    def start_frontend(self):
        self.log_message("Avvio frontend...", "FRONTEND")
        self.frontend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            text=True,
        )
        threading.Thread(
            target=self.stream_output,
            args=(self.frontend_process, "FRONTEND"),
            daemon=True,
        ).start()
        self.log_message("Frontend avviato con successo", "FRONTEND")

    def start_npm_analyzer(self):
        self.log_message("Avvio NGINX Shield (npm_analyzer.py)...", "ANALYZER")
        self.npm_analyzer_process = subprocess.Popen(
            [sys.executable, "npm_analyzer.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            text=True,
        )
        threading.Thread(
            target=self.stream_output,
            args=(self.npm_analyzer_process, "ANALYZER"),
            daemon=True,
        ).start()
        self.log_message("NGINX Shield avviato con successo", "ANALYZER")

    def start_geolocate(self):
        self.log_message("Avvio geolocate service...", "GEOLOCATE")
        self.geolocate_process = subprocess.Popen(
            [sys.executable, "geolocate/GeoIP-MAXLON.py", "--server"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            text=True,
        )

        def stream_geolocate():
            try:
                with open("data/log/geolocate.log", "a", encoding="utf-8") as f:
                    for line in iter(self.geolocate_process.stdout.readline, ""):
                        if line and self.running:
                            decoded_line = line.strip()
                            if decoded_line:
                                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                log_entry = (
                                    f"[{timestamp}] [GEOLOCATE] {decoded_line}\n"
                                )
                                f.write(log_entry)
                                if not self.detach_mode:
                                    print(log_entry.strip())
            except Exception as e:
                self.log_message(
                    f"Errore durante la lettura dell'output geolocate: {e}", "GEOLOCATE"
                )

        threading.Thread(target=stream_geolocate, daemon=True).start()
        self.log_message("Geolocate service avviato con successo", "GEOLOCATE")

    def restart_backend(self):
        self.log_message("Riavvio backend in corso...", "BACKEND")
        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=5)
            except BaseException:
                self.backend_process.kill()
        time.sleep(1)
        self.start_backend()
        self.log_message("Backend riavviato con successo", "BACKEND")

    def restart_frontend(self):
        self.log_message("Riavvio frontend in corso...", "FRONTEND")
        if self.frontend_process:
            try:
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=5)
            except BaseException:
                self.frontend_process.kill()
        time.sleep(1)
        self.start_frontend()
        self.log_message("Frontend riavviato con successo", "FRONTEND")

    def restart_analyzer(self):
        self.log_message("Riavvio NGINX Shield (analyzer) in corso...", "ANALYZER")
        if self.npm_analyzer_process:
            try:
                self.npm_analyzer_process.terminate()
                self.npm_analyzer_process.wait(timeout=5)
            except BaseException:
                self.npm_analyzer_process.kill()
        time.sleep(1)
        self.start_npm_analyzer()
        self.log_message("NGINX Shield (analyzer) riavviato con successo", "ANALYZER")

    def restart_geolocate(self):
        self.log_message("Riavvio geolocate service in corso...", "GEOLOCATE")
        if self.geolocate_process:
            try:
                self.geolocate_process.terminate()
                self.geolocate_process.wait(timeout=5)
            except BaseException:
                self.geolocate_process.kill()
        time.sleep(1)
        self.start_geolocate()
        self.log_message("Geolocate service riavviato con successo", "GEOLOCATE")

    def stop_services(self):
        self.running = False
        self.log_message("Arresto dei servizi in corso...", "SYSTEM")
        processes_to_stop = [
            (self.backend_process, "BACKEND"),
            (self.frontend_process, "FRONTEND"),
            (self.npm_analyzer_process, "ANALYZER"),
            (self.geolocate_process, "GEOLOCATE"),
        ]
        for proc, name in processes_to_stop:
            if proc:
                try:
                    self.log_message(f"Arresto {name.lower()}...", name)
                    proc.terminate()
                    proc.wait(timeout=5)
                    self.log_message(f"{name} arrestato", name)
                except subprocess.TimeoutExpired:
                    self.log_message(f"Forzatura arresto {name.lower()}...", name)
                    proc.kill()
                    proc.wait()
                except Exception as e:
                    self.log_message(
                        f"Errore durante l'arresto di {name.lower()}: {e}", name
                    )
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
        self.log_message("=== SERVER MANAGER TERMINATO ===", "SYSTEM")

    def signal_handler(self, signum, frame):
        self.log_message(f"Ricevuto segnale {signum}, arresto in corso...", "SYSTEM")
        self.stop_services()
        sys.exit(0)

    def run(self, detach=False):
        self.detach_mode = detach

        if detach:
            pid = os.fork()
            if pid > 0:
                print(f"[INFO] Server avviato in background con PID {pid}")
                with open(PID_FILE, "w") as f:
                    f.write(str(pid))
                sys.exit(0)

        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        self.log_message("=== AVVIO SERVER MANAGER ===", "SYSTEM")

        if not os.path.exists("npm_analyzer.py"):
            self.log_message("ERRORE: File 'npm_analyzer.py' non trovato", "SYSTEM")
            return False
        if not os.path.exists("backend"):
            self.log_message("ERRORE: Directory 'backend' non trovata", "SYSTEM")
            return False
        if not os.path.exists("package.json"):
            self.log_message("ERRORE: File 'package.json' non trovato", "SYSTEM")
            return False
        if not os.path.exists("geolocate"):
            self.log_message("ERRORE: Directory 'geolocate' non trovata", "SYSTEM")
            return False

        self.start_backend()
        time.sleep(2)
        self.start_frontend()
        time.sleep(2)
        self.start_npm_analyzer()
        time.sleep(2)
        self.start_geolocate()

        self.log_message("=== TUTTI I SERVIZI SONO ATTIVI ===", "SYSTEM")
        self.log_message("Premi Ctrl+C per arrestare i servizi", "SYSTEM")

        try:
            while self.running:
                time.sleep(1)

                self.check_restart_commands()

                if self.backend_process and self.backend_process.poll() is not None:
                    self.log_message("Backend terminato inaspettatamente", "BACKEND")
                    break
                if self.frontend_process and self.frontend_process.poll() is not None:
                    self.log_message("Frontend terminato inaspettatamente", "FRONTEND")
                    break
                if (
                    self.npm_analyzer_process
                    and self.npm_analyzer_process.poll() is not None
                ):
                    self.log_message(
                        "NGINX Shield (npm_analyzer) terminato inaspettatamente",
                        "ANALYZER",
                    )
                    break
                if self.geolocate_process and self.geolocate_process.poll() is not None:
                    self.log_message(
                        "Geolocate service terminato inaspettatamente", "GEOLOCATE"
                    )
                    break
        except KeyboardInterrupt:
            self.log_message("Interruzione da tastiera ricevuta", "SYSTEM")

        self.stop_services()
        return True


def stop_running_instance():
    if not os.path.exists(PID_FILE):
        print("[ERRORE] Nessun processo in background trovato.")
        return
    with open(PID_FILE, "r") as f:
        pid = int(f.read().strip())
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"[INFO] Processo {pid} terminato.")
    except ProcessLookupError:
        print("[ERRORE] Il processo non è in esecuzione.")
    except Exception as e:
        print(f"[ERRORE] Impossibile terminare il processo: {e}")
    finally:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)


def main():
    if len(sys.argv) > 1:
        if sys.argv[1] == "--stop":
            stop_running_instance()
        elif sys.argv[1] == "--no-console":
            ServerManager().run(detach=True)
        else:
            print("Uso: ./start.py [--no-console | --stop]")
    else:
        ServerManager().run(detach=False)


if __name__ == "__main__":
    main()