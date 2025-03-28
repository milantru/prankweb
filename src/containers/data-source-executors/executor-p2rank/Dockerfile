FROM python:3.10.7

RUN apt-get update \
  && apt-get -y --no-install-recommends install celery \
  && apt-get -y --no-install-recommends install openjdk-17-jdk

WORKDIR /app

COPY executor-p2rank/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY data_format/ data_format/
RUN pip install -e data_format/

COPY executor-p2rank/. .

RUN wget https://github.com/rdk/p2rank/releases/download/2.5/p2rank_2.5.tar.gz && \
    tar -zxvf p2rank_2.5.tar.gz && \
    rm -rf p2rank_2.5.tar.gz

ENV PATH="/app/p2rank_2.5:${PATH}"

RUN mkdir -p results
