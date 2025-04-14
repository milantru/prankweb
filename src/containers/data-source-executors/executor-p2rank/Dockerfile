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
COPY --chown=user:user executor-p2rank/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user:user data_format/ data_format/
RUN pip install -e data_format/

COPY --chown=user:user executor-p2rank/. .

RUN chown -R user:user /app
USER ${UID}:${GID}

RUN mkdir -p results