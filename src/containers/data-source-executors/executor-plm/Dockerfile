FROM python:3.13-slim

# Create user
ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

RUN apt-get update && apt-get install -y git

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

RUN mkdir -p results cache/torch cache/hf cache/esm

ENV TORCH_HOME=/app/cache/torch
ENV HF_HOME=/app/cache/hf
ENV ESM_HOME=/app/cache/esm

RUN mkdir -p /app/cache/torch/hub/checkpoints && \
    python -c "import torch; import esm; esm.pretrained.load_model_and_alphabet('esm2_t33_650M_UR50D')"
