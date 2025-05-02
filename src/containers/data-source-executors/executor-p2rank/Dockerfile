FROM python:3.13-slim

# Create user
ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

# Install basic packages
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
      openjdk-17-jdk \
      wget \
  && rm -rf /var/lib/apt/lists/* 

WORKDIR /app

# Install p2rank
RUN wget https://github.com/rdk/p2rank/releases/download/2.5/p2rank_2.5.tar.gz \
    && tar -zxvf p2rank_2.5.tar.gz \
    && rm -rf p2rank_2.5.tar.gz

ENV PATH="/app/p2rank_2.5:${PATH}"

# Copy Python source code and install needed modules
COPY --chown=user:user \ 
        ./shared/install-requirements.sh \
        ./shared/tasks_logger.py \
        ./data-source-executors/executor-p2rank/requirements.in \
        ./

RUN chmod +x install-requirements.sh \
    && ./install-requirements.sh \
    && rm install-requirements.sh

COPY --chown=user:user ./data-source-executors/data_format/ data_format/
RUN pip install -e data_format/

COPY --chown=user:user ./data-source-executors/executor-p2rank/. .
RUN chmod u+x celery_worker.py \
    && chown user:user /app

ENV PYTHONUNBUFFERED=1

USER ${UID}:${GID}

RUN mkdir -p results