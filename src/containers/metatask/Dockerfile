FROM python:3.13-slim

ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

WORKDIR /app

COPY --chown=user:user requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user:user . .

RUN chown -R user:user /app

USER ${UID}:${GID}

RUN mkdir -p inputs