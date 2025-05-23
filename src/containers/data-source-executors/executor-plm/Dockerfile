FROM python:3.13-slim

# Create user
ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

WORKDIR /app 

# Copy Python source code and install needed modules
COPY --chown=user:user \
        ./shared/install-requirements.sh \
        ./shared/tasks_logger.py \
        ./shared/mapping.json \
        ./data-source-executors/executor-plm/requirements.in \
        ./

RUN chmod +x install-requirements.sh \
    && ./install-requirements.sh \
    && rm install-requirements.sh

COPY --chown=user:user ./data-source-executors/data_format/ data_format/
RUN pip install -e data_format/

COPY --chown=user:user ./data-source-executors/executor-plm/. .
RUN chmod u+x celery_worker.py \
    && chown user:user /app

ENV PYTHONUNBUFFERED=1

USER ${UID}:${GID}

RUN mkdir -p results