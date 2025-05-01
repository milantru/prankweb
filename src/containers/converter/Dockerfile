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
        ./converter/requirements.in \
        ./

RUN chmod +x install-requirements.sh \
    && ./install-requirements.sh \
    && rm install-requirements.sh

COPY --chown=user:user ./converter/. .
RUN chmod u+x celery_worker.py \
    && chown user:user /app

ENV PYTHONUNBUFFERED=1

USER ${UID}:${GID}