FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential curl git \
  && rm -rf /var/lib/apt/lists/*

COPY apps/ml-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/ml-service/src ./src
COPY apps/ml-service/pipelines ./pipelines
COPY apps/ml-service/sql ./sql
COPY apps/ml-service/.env.example ./.env.example

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
