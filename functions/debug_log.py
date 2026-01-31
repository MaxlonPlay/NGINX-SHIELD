from datetime import datetime


def debug_log(msg, log_path):
    timestamp = datetime .now().strftime('[%Y-%m-%d %H:%M:%S]')
    try:
        with open(log_path, 'a')as f:
            f .write(f"{timestamp} - {msg}\n")
    except Exception:
        pass
