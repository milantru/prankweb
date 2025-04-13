FROM python:3.13-slim

# Create user
ARG UID=1453
ARG GID=1453
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

# Install basic packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install hmmer
RUN wget http://eddylab.org/software/hmmer/hmmer-3.4.tar.gz \
    && tar -xvzf hmmer-3.4.tar.gz \
    && cd hmmer-3.4/ \
    && ./configure \
    && make \
    && make install \
    && cd easel/ \
    && make install \
    && cd ../../ \
    && rm -rf hmmer-3.4.tar.gz

# Install conservation database
RUN wget https://ftp.expasy.org/databases/uniprot/current_release/knowledgebase/complete/uniprot_sprot.fasta.gz \
    && gunzip uniprot_sprot.fasta.gz

# Copy Python source code and install needed modules
COPY --chown=user:user requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

USER ${UID}:${GID}