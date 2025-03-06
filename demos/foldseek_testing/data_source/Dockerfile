FROM python:3.10.7

RUN apt-get update \
  && apt-get -y --no-install-recommends install celery

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN wget https://mmseqs.com/foldseek/foldseek-linux-avx2.tar.gz && \
    tar xvzf foldseek-linux-avx2.tar.gz && \
    rm foldseek-linux-avx2.tar.gz

ENV PATH="/app/foldseek/bin/:$PATH"

RUN mkdir -p /app/uploads /app/results /app/foldseek_db

EXPOSE 8000

RUN foldseek databases PDB /app/foldseek_db/pdb /app/foldseek_db/tmp && \
    foldseek createindex /app/foldseek_db/pdb /app/foldseek_db/tmp
