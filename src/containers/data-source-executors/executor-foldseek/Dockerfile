FROM python:3.13-slim

ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

# Install basic packages
RUN apt-get update \
  && apt-get install -y --no-install-recommends wget \
  && rm -rf /var/lib/apt/lists/* 

WORKDIR /app

RUN wget https://mmseqs.com/foldseek/foldseek-linux-avx2.tar.gz && \
    tar xvzf foldseek-linux-avx2.tar.gz && \
    rm foldseek-linux-avx2.tar.gz

ENV PATH="/app/foldseek/bin/:$PATH"

RUN mkdir -p foldseek_db

RUN foldseek databases PDB /app/foldseek_db/pdb /app/foldseek_db/tmp && \
    foldseek createindex /app/foldseek_db/pdb /app/foldseek_db/tmp

COPY --chown=user:user executor-foldseek/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY data_format/ data_format/
RUN pip install -e data_format/

COPY --chown=user:user executor-foldseek/. .

RUN chown user:user /app
USER ${UID}:${GID}

RUN mkdir -p uploads results