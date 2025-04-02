FROM httpd:2.4.63

RUN apt-get update && apt-get install -y curl

RUN mkdir -p /usr/local/apache2/htdocs/data

COPY httpd.conf /usr/local/apache2/conf/httpd.conf