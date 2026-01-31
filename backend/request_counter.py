
def count_file_lines(file_path: str) -> int:

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore")as f:
            return sum(1 for _ in f)
    except FileNotFoundError:
        return 0
    except Exception as e:
        print(f"Errore durante il conteggio righe in {file_path}: {e}")
        return -1
