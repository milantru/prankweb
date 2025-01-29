FROM node:18

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN wget https://mmseqs.com/foldseek/foldseek-linux-avx2.tar.gz && \
    tar xvzf foldseek-linux-avx2.tar.gz && \
    mv foldseek /app/foldseek && \
    rm foldseek-linux-avx2.tar.gz

ENV PATH="/app/foldseek/bin/:$PATH"

EXPOSE 8000

CMD ["bash", "-c", "if [ ! -f /app/foldseek_db/pdb.dbtype ]; then foldseek databases PDB /app/foldseek_db/pdb /app/foldseek_db/tmp && foldseek createindex /app/foldseek_db/pdb /app/foldseek_db/tmp; fi && node server.js"]
