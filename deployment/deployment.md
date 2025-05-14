# Nasadenie

## HW požiadavky

**Počet CPU**: 24
**Veľkosť RAM**: 32GB
**Veľkosť disku**: ???
**Operačný systém**: Linux (manuál je písaný pre Ubuntu)

Pre úspešné nasadenie projektu Plankweb, nasledujte tieto kroky:

- [Nasadenie](#nasadenie)
  - [HW požiadavky](#hw-požiadavky)
  - [Naklonovanie repozitára](#naklonovanie-repozitára)
  - [Tvorba .env súboru](#tvorba-env-súboru)
  - [Príprava prostredia docker](#príprava-prostredia-docker)
  - [Create docker volumes](#create-docker-volumes)
  - [Nginx, Let's Encrypt, HTTPS](#nginx-lets-encrypt-https)
  - [Docker compose](#docker-compose)

## Naklonovanie repozitára

Prvým krokom k nasadeniu projektu Plankweb je získanie repozitára pomocou nástroja `git`:

```sh
sudo apt-get update
sudo apt-get install git

git clone https://github.com/milantru/prankweb.git plankweb
```

## Tvorba .env súboru

Po naklonovaní repozitára je nutné vytvoriť `.env` súbor a umiestniť ho do rovnakého
folderu ako `docker-compose-plnakweb.yml`. Tento súbor by mal obsahovať tieto premenné prostredia:

| Premenná prostredia   | Popis |
|-----------------------|-------|
| COMPOSE_PROJECT_NAME  | |
| PLANKWEB_URL          | |
| PLANKWEB_TIMEZONE     | |
| PLANKWEB_CELERY_NAME  | |
| PLANKWEB_DEFAULT_UID  | |
| PLANKWEB_DEFAULT_GID  | |
| PLANKWEB_SERVICE_USER | |
| PLANKWEB_SERVICE_PASS | |

`.env.example`

## Príprava prostredia docker

Plankweb používa Docker, takže ďalším krokom by mala byť insštalácia Dockeru, napr. podľa
tohto [manuálu](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository):

```sh
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Create docker volumes

[Manual](https://docs.docker.com/reference/cli/docker/volume/create/)

## Nginx, Let's Encrypt, HTTPS

Project plankweb

## Docker compose
