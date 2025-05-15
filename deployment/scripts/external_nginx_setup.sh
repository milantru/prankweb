#!/bin/bash

if [[ $EUID -ne 0 ]]; then
  echo "Please run this script as root (use sudo)." >&2
  exit 1
fi

apt-get update

# get certificate
apt-get install certbot
certbot certonly --nginx -d prankweb2.ksi.projekty.ms.mff.cuni.cz

# set up cron job for automatized certificate renewal
CRON_JOB="0 0 * * * certbot renew --nginx --quiet"
(crontab -l 2>/dev/null | grep -Fv "$CRON_JOB"; echo "$CRON_JOB") | crontab -

# install and configure nginx
apt-get install nginx
cp ../nginx.conf /etc/nginx/nginx.conf
