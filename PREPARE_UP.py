import os
from pathlib import Path
from datetime import datetime
import zipfile
import re
import subprocess
import ast


def rimuovi_commenti_python(file_path):
    """Rimuove i commenti da file Python preservando f-strings e sintassi moderna"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            linee = f.readlines()

        risultato = []
        in_stringa_multilinea = False
        delimitatore_stringa = None

        for linea in linee:
            linea_stripped = linea.lstrip()

            if '"""' in linea or "'''" in linea:
                if '"""' in linea:
                    count = linea.count('"""')
                    if count == 2:
                        # Docstring su una sola linea
                        risultato.append(linea)
                        continue
                    elif count == 1:
                        in_stringa_multilinea = not in_stringa_multilinea
                        delimitatore_stringa = '"""'
                        risultato.append(linea)
                        continue
                elif "'''" in linea:
                    count = linea.count("'''")
                    if count == 2:
                        risultato.append(linea)
                        continue
                    elif count == 1:
                        in_stringa_multilinea = not in_stringa_multilinea
                        delimitatore_stringa = "'''"
                        risultato.append(linea)
                        continue

            if in_stringa_multilinea:
                risultato.append(linea)
                continue

            # Rimuovi commenti inline preservando stringhe
            nuova_linea = []
            i = 0
            in_stringa = False
            char_stringa = None
            in_fstring = False

            while i < len(linea):
                char = linea[i]

                # Detect f-string
                if not in_stringa and i > 0 and linea[i-1] == 'f' and char in ['"', "'"]:
                    in_fstring = True
                    in_stringa = True
                    char_stringa = char
                    nuova_linea.append(char)
                    i += 1
                    continue

                # Gestione escape
                if in_stringa and char == '\\' and i + 1 < len(linea):
                    nuova_linea.append(char)
                    nuova_linea.append(linea[i + 1])
                    i += 2
                    continue

                # Toggle stringhe
                if char in ['"', "'"] and (i == 0 or linea[i - 1] != '\\'):
                    if not in_stringa:
                        in_stringa = True
                        char_stringa = char
                    elif char == char_stringa:
                        in_stringa = False
                        in_fstring = False
                        char_stringa = None
                    nuova_linea.append(char)
                    i += 1
                    continue

                # Rimuovi commento se non in stringa
                if not in_stringa and char == '#':
                    break

                nuova_linea.append(char)
                i += 1

            linea_pulita = ''.join(nuova_linea).rstrip()

            # Mantieni linee vuote solo se necessarie
            if linea_pulita or (risultato and risultato[-1].strip()):
                risultato.append(linea_pulita + '\n')

        # Scrivi il risultato
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(risultato)

        # Verifica che il file sia ancora valido Python
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                ast.parse(f.read())
        except SyntaxError as e:
            print(f"⚠ ATTENZIONE: Sintassi corrotta in {file_path}: {e}")
            return False

        return True

    except Exception as e:
        print(f"✗ Errore rimozione commenti Python {file_path}: {e}")
        return False


def sistema_formattazione_python(file_path, converti_tabs=True, usa_autopep8=True):
    """Sistema formattazione Python"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            codice = f.read()

        if converti_tabs:
            codice = codice.replace('\t', '    ')

        if usa_autopep8:
            try:
                import autopep8
                codice = autopep8.fix_code(codice, options={
                    'aggressive': 1,  # Ridotto da 2 a 1 per più sicurezza
                    'max_line_length': 500,
                    'indent_size': 4
                })
            except ImportError:
                pass

        linee = codice.split('\n')
        linee = [linea.rstrip() for linea in linee]
        codice = '\n'.join(linee)

        if codice and not codice.endswith('\n'):
            codice += '\n'

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(codice)

        # Verifica sintassi
        try:
            ast.parse(codice)
        except SyntaxError as e:
            print(f"⚠ ATTENZIONE: Sintassi corrotta in {file_path}: {e}")
            return False

        return True

    except Exception as e:
        print(f"✗ Errore formattazione Python {file_path}: {e}")
        return False


def rimuovi_commenti_js(codice):
    """Rimuove commenti da JavaScript/TypeScript preservando stringhe, regex e URL"""

    def rimuovi_multilinea(testo):
        risultato = []
        i = 0
        in_stringa = False
        char_stringa = None

        while i < len(testo):
            if testo[i] in ['"', "'", '`'] and (i == 0 or testo[i - 1] != '\\'):
                if not in_stringa:
                    in_stringa = True
                    char_stringa = testo[i]
                elif testo[i] == char_stringa:
                    in_stringa = False
                    char_stringa = None
                risultato.append(testo[i])
                i += 1
            elif not in_stringa and i < len(testo) - 1 and testo[i:i + 2] == '/*':
                fine = testo.find('*/', i + 2)
                if fine != -1:
                    i = fine + 2
                else:
                    i += 2
            else:
                risultato.append(testo[i])
                i += 1

        return ''.join(risultato)

    codice = rimuovi_multilinea(codice)
    linee = codice.split('\n')
    risultato = []

    for linea in linee:
        nuova_linea = []
        i = 0
        in_stringa = False
        char_stringa = None

        while i < len(linea):
            char = linea[i]

            if char in ['"', "'", '`'] and (i == 0 or linea[i - 1] != '\\'):
                if not in_stringa:
                    in_stringa = True
                    char_stringa = char
                elif char == char_stringa:
                    in_stringa = False
                    char_stringa = None
                nuova_linea.append(char)
                i += 1
                continue

            if not in_stringa and i < len(linea) - 1 and linea[i:i + 2] == '//':
                is_url = False
                if i > 0 and linea[i - 1] == ':':
                    start = max(0, i - 10)
                    precedente = ''.join(nuova_linea[start:])
                    if re.search(r'(https?|ftp|file|ws|wss):$', precedente):
                        is_url = True

                if is_url:
                    nuova_linea.append(char)
                    i += 1
                else:
                    break
            else:
                nuova_linea.append(char)
                i += 1

        risultato.append(''.join(nuova_linea).rstrip())

    return '\n'.join(risultato)


def rimuovi_commenti_javascript(file_path):
    """Rimuove i commenti da file JS/TS/JSX/TSX"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            codice = f.read()

        codice_pulito = rimuovi_commenti_js(codice)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(codice_pulito)

        return True

    except Exception as e:
        print(f"✗ Errore rimozione commenti JS/TS {file_path}: {e}")
        return False


def sistema_formattazione_js(file_path, converti_tabs=True, usa_prettier=True):
    """Sistema formattazione JavaScript/TypeScript"""
    if usa_prettier:
        try:
            result = subprocess.run(
                ['npx', 'prettier', '--write', str(file_path)],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                return True
        except BaseException:
            pass

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            codice = f.read()

        if converti_tabs:
            codice = codice.replace('\t', '  ')

        linee = codice.split('\n')
        linee = [linea.rstrip() for linea in linee]
        codice = '\n'.join(linee)
        codice = re.sub(r'\n{3,}', '\n\n', codice)

        if codice and not codice.endswith('\n'):
            codice += '\n'

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(codice)

        return True

    except Exception as e:
        print(f"✗ Errore formattazione JS/TS {file_path}: {e}")
        return False


def crea_backup_zip(directory='.', escludi_dirs=None):
    """Crea un backup ZIP di tutti i file Python e React/JS/TS con timestamp"""
    if escludi_dirs is None:
        escludi_dirs = {
            'node_modules', 'dist', 'build', '.next', 'out',
            '.git', '__pycache__', 'venv', '.venv', 'coverage',
            '.cache', '.parcel-cache', '.turbo', 'env'
        }

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    nome_backup = f"backup_code_{timestamp}.zip"

    directory_path = Path(directory).resolve()
    estensioni = {'.py', '.js', '.jsx', '.ts', '.tsx'}

    print(f"\nCreazione backup: {nome_backup}")
    print("=" * 60)

    file_count = 0
    stats = {'.py': 0, '.js': 0, '.jsx': 0, '.ts': 0, '.tsx': 0}

    with zipfile.ZipFile(nome_backup, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_path in directory_path.rglob('*'):
            if any(parte in escludi_dirs for parte in file_path.parts):
                continue

            if file_path.suffix in estensioni and file_path.is_file():
                percorso_relativo = file_path.relative_to(directory_path)
                zipf.write(file_path, percorso_relativo)
                print(f"  + {percorso_relativo}")
                file_count += 1
                stats[file_path.suffix] = stats.get(file_path.suffix, 0) + 1

    dimensione = os.path.getsize(nome_backup) / 1024
    print("=" * 60)
    print(f"✓ Backup creato: {nome_backup}")
    print(f"  File totali: {file_count}")
    for ext, count in stats.items():
        if count > 0:
            print(f"    {ext}: {count}")
    print(f"  Dimensione: {dimensione:.2f} KB\n")

    return nome_backup


def processa_files(directory='.', rimuovi_commenti=True,
                   sistema_formato=True, converti_tabs=True,
                   usa_autopep8=True, usa_prettier=True, usa_eslint=True,
                   escludi_dirs=None):
    """Processa tutti i file Python e React/JS/TS nella directory"""
    if escludi_dirs is None:
        escludi_dirs = {
            'node_modules', 'dist', 'build', '.next', 'out',
            '.git', '__pycache__', 'venv', '.venv', 'coverage',
            '.cache', '.parcel-cache', '.turbo', 'env'
        }

    directory_path = Path(directory)
    estensioni_python = {'.py'}
    estensioni_js = {'.js', '.jsx', '.ts', '.tsx'}

    file_processati = {'python': 0, 'javascript': 0}
    file_errori = {'python': 0, 'javascript': 0}

    print("\nProcessamento file...")
    print("=" * 60)

    if usa_eslint:
        try:
            print("\n🔧 Esecuzione ESLint --fix...")
            subprocess.run(
                ['npx', 'eslint', '.', '--ext', '.js,.jsx,.ts,.tsx', '--fix'],
                cwd=directory,
                capture_output=True,
                text=True,
                timeout=60
            )
            print("✓ ESLint completato\n")
        except BaseException:
            print("⚠ ESLint non disponibile, salta...\n")

    for file_path in directory_path.rglob('*'):
        if any(parte in escludi_dirs for parte in file_path.parts):
            continue

        if not file_path.is_file():
            continue

        successo = True
        tipo = None

        if file_path.suffix in estensioni_python:
            tipo = 'python'

            if rimuovi_commenti:
                if not rimuovi_commenti_python(file_path):
                    successo = False

            if sistema_formato and successo:
                if not sistema_formattazione_python(file_path, converti_tabs, usa_autopep8):
                    successo = False

        elif file_path.suffix in estensioni_js:
            tipo = 'javascript'

            if rimuovi_commenti:
                if not rimuovi_commenti_javascript(file_path):
                    successo = False

            if sistema_formato and successo:
                if not sistema_formattazione_js(file_path, converti_tabs, usa_prettier):
                    successo = False

        if tipo:
            if successo:
                print(f"✓ [{tipo.upper()}] {file_path}")
                file_processati[tipo] += 1
            else:
                file_errori[tipo] += 1

    print("=" * 60)
    print(f"Python - Processati: {file_processati['python']}, Errori: {file_errori['python']}")
    print(f"JS/TS  - Processati: {file_processati['javascript']}, Errori: {file_errori['javascript']}")
    print("=" * 60)


def controlla_dipendenze():
    """Controlla dipendenze disponibili"""
    deps = {
        'autopep8': False,
        'prettier': False,
        'eslint': False
    }

    try:
        import autopep8
        deps['autopep8'] = True
    except ImportError:
        pass

    try:
        subprocess.run(['npx', 'prettier', '--version'],
                       capture_output=True, timeout=5)
        deps['prettier'] = True
    except BaseException:
        pass

    try:
        subprocess.run(['npx', 'eslint', '--version'],
                       capture_output=True, timeout=5)
        deps['eslint'] = True
    except BaseException:
        pass

    return deps


def main():
    """Funzione principale"""
    print("\n" + "=" * 60)
    print("PULIZIA E FORMATTAZIONE CODICE - PYTHON + REACT/JS/TS")
    print("=" * 60)

    print("\nFile supportati:")
    print("  Python: .py")
    print("  JavaScript/TypeScript: .js, .jsx, .ts, .tsx")

    print("\nDirectory escluse:")
    print("  node_modules, venv, __pycache__, dist, build, .git, ecc.")

    deps = controlla_dipendenze()

    print("\n" + "-" * 60)
    print("Strumenti disponibili:")
    print(f"  autopep8 (Python): {'✓' if deps['autopep8'] else '✗'}")
    print(f"  Prettier (JS/TS):  {'✓' if deps['prettier'] else '✗'}")
    print(f"  ESLint (JS/TS):    {'✓' if deps['eslint'] else '✗'}")

    if not deps['autopep8']:
        print("\n💡 Per installare autopep8: pip install autopep8 --break-system-packages")
    if not deps['prettier']:
        print("💡 Per installare Prettier: npm install -g prettier")
    if not deps['eslint']:
        print("💡 Per installare ESLint: npm install -g eslint")

    print("\n" + "-" * 60)
    rimuovi_comm = input("Rimuovere commenti? (s/n) [s]: ").lower() or 's'
    sistema_fmt = input("Sistemare formattazione? (s/n) [s]: ").lower() or 's'
    converti_tab = input("Convertire tabs in spazi? (s/n) [s]: ").lower() or 's'

    usa_autopep8 = deps['autopep8']
    usa_prettier = deps['prettier']
    usa_eslint = deps['eslint']

    if sistema_fmt == 's':
        if deps['autopep8']:
            usa_autopep8 = (input("Usare autopep8 per Python? (s/n) [s]: ").lower() or 's') == 's'
        if deps['prettier']:
            usa_prettier = (input("Usare Prettier per JS/TS? (s/n) [s]: ").lower() or 's') == 's'
        if deps['eslint']:
            usa_eslint = (input("Usare ESLint --fix per JS/TS? (s/n) [s]: ").lower() or 's') == 's'

    rimuovi_commenti = rimuovi_comm == 's'
    sistema_formato = sistema_fmt == 's'
    converti_tabs = converti_tab == 's'

    print("\n" + "=" * 60)
    print("RIEPILOGO:")
    print(f"  - Rimuovi commenti: {'SÌ' if rimuovi_commenti else 'NO'}")
    print(f"  - Sistema formato: {'SÌ' if sistema_formato else 'NO'}")
    if sistema_formato:
        print(f"    • autopep8 (Python): {'SÌ' if usa_autopep8 else 'NO'}")
        print(f"    • Prettier (JS/TS): {'SÌ' if usa_prettier else 'NO'}")
        print(f"    • ESLint (JS/TS): {'SÌ' if usa_eslint else 'NO'}")
    print(f"  - Converti tabs: {'SÌ' if converti_tabs else 'NO'}")
    print("\n✓ URL come https:// saranno preservati")
    print("✓ F-strings Python saranno preservate")
    print("✓ Verrà creato un backup ZIP completo")
    print("✓ Controllo sintassi Python dopo ogni modifica")
    print("=" * 60)

    risposta = input("\nContinuare? (s/n): ")

    if risposta.lower() != 's':
        print("Operazione annullata.")
        return

    nome_backup = crea_backup_zip('.')

    processa_files('.', rimuovi_commenti, sistema_formato, converti_tabs,
                   usa_autopep8, usa_prettier, usa_eslint)

    print(f"\n✓ Completato!")
    print(f"✓ Backup salvato in: {nome_backup}")
    print("  Per ripristinare: estrai il file ZIP nella directory corrente")


if __name__ == "__main__":
    main()
