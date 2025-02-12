FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN wget https://mmseqs.com/foldseek/foldseek-linux-avx2.tar.gz && \
    tar xvzf foldseek-linux-avx2.tar.gz && \
    rm foldseek-linux-avx2.tar.gz

ENV PATH="/app/foldseek/bin/:$PATH"

RUN mkdir -p /app/uploads /app/results /app/foldseek_db

EXPOSE 8000

CMD mkdir -p /app/uploads /app/results && \
    foldseek databases PDB /app/foldseek_db/pdb /app/foldseek_db/tmp && \
    foldseek createindex /app/foldseek_db/pdb /app/foldseek_db/tmp; \
    node server.js
