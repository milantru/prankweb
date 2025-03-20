FROM python:3.10.7

RUN apt-get update \
  && apt-get -y --no-install-recommends install celery

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .