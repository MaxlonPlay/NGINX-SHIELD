FROM --platform=$BUILDPLATFORM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends fail2ban && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
EXPOSE 8881

CMD ["python", "start_build.py"]