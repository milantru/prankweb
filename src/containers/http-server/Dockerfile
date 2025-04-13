FROM python:3.13-slim

ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY --chown=user:user requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user:user . .

USER ${UID}:${GID}