# Sintassi multi-arch
# Usa buildx per costruire per più piattaforme: docker buildx build --platform linux/amd64,linux/arm64 -t mia-immagine:latest .
FROM --platform=$BUILDPLATFORM python:3.12-slim

# Aggiornamento pacchetti e installazione fail2ban
RUN apt-get update && \
    apt-get install -y --no-install-recommends fail2ban && \
    rm -rf /var/lib/apt/lists/*

# Imposta la cartella di lavoro
WORKDIR /app

# Copia il requirements.txt di Python e installa le dipendenze
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copia il resto del progetto
COPY . .

# Espone le porte necessarie
EXPOSE 8000
EXPOSE 8881

# Comando di avvio
CMD ["python", "start_build.py"]