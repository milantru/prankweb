FROM python:3.10.7

WORKDIR /app

RUN apt-get update \
    && wget http://eddylab.org/software/hmmer/hmmer-3.4.tar.gz \
    && tar -xvzf hmmer.tar.gz \
    && cd hmmer-3.4/ \
    && ./configure \
    && make \
    && make install \
    && cd easel/ \
    && make install \
    && cd ../../ \
    && rm -rf hmmer.tar.gz 

RUN wget https://ftp.expasy.org/databases/uniprot/current_release/knowledgebase/complete/uniprot_sprot.fasta.gz \
    && gunzip uniprot_sprot.fasta.gz