FROM httpd:2.4.63

# Create user
ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

# Install curl
RUN apt-get update \ 
    && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*

RUN chown -R user:user /usr/local/apache2/
RUN chmod 755 /usr/local/apache2/

COPY --chown=user:user httpd.conf /usr/local/apache2/conf/httpd.conf

USER ${UID}:${GID}

RUN mkdir -p /usr/local/apache2/htdocs/data

