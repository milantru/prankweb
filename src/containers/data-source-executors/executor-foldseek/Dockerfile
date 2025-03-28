FROM python:3.10.7

RUN apt-get update

WORKDIR /app

COPY executor-foldseek/. .
RUN pip install --no-cache-dir -r requirements.txt

COPY data_format/ data_format/
RUN pip install -e data_format/

RUN wget https://mmseqs.com/foldseek/foldseek-linux-avx2.tar.gz && \
    tar xvzf foldseek-linux-avx2.tar.gz && \
    rm foldseek-linux-avx2.tar.gz

ENV PATH="/app/foldseek/bin/:$PATH"

RUN mkdir -p uploads results foldseek_db

RUN foldseek databases PDB /app/foldseek_db/pdb /app/foldseek_db/tmp && \
    foldseek createindex /app/foldseek_db/pdb /app/foldseek_db/tmp
