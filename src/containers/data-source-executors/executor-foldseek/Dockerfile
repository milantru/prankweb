FROM python:3.13-slim

# Create user
ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

# Install basic packages
RUN apt-get update \
  && apt-get install -y --no-install-recommends wget \
  && rm -rf /var/lib/apt/lists/* 

WORKDIR /app

# Install foldseek
RUN wget https://mmseqs.com/foldseek/foldseek-linux-avx2.tar.gz && \
    tar xvzf foldseek-linux-avx2.tar.gz && \
    rm foldseek-linux-avx2.tar.gz

ENV PATH="/app/foldseek/bin/:$PATH"

RUN mkdir -p foldseek_db

RUN foldseek databases PDB /app/foldseek_db/pdb /app/foldseek_db/tmp && \
    foldseek createindex /app/foldseek_db/pdb /app/foldseek_db/tmp

# Copy Python source code and install needed modules
COPY --chown=user:user \
        ./shared/install-requirements.sh \
        ./shared/tasks_logger.py \
        ./shared/status_manager.py \
        ./data-source-executors/executor-foldseek/requirements.in \
        ./

RUN chmod +x install-requirements.sh \
    && ./install-requirements.sh \
    && rm install-requirements.sh

COPY ./data-source-executors/data_format/ data_format/
RUN pip install -e data_format/

COPY --chown=user:user ./data-source-executors/executor-foldseek/. .
RUN chmod u+x celery_worker.py \
    && chown user:user /app

ENV PYTHONUNBUFFERED=1

USER ${UID}:${GID}

RUN mkdir -p uploads results