# Nasadenie

## HW požiadavky

**Počet CPU**: 24
**Veľkosť RAM**: 32GB
**Veľkosť disku**: ???
**Operačný systém**: Linux (manuál je písaný pre Ubuntu)

To successfully deploy Plankweb project, please follow these steps:

- [Nasadenie](#nasadenie)
  - [HW požiadavky](#hw-požiadavky)
  - [Naklonovanie repozitára](#naklonovanie-repozitára)
  - [Tvorba .env súboru](#tvorba-env-súboru)
  - [Príprava prostredia docker](#príprava-prostredia-docker)
  - [Create docker volumes](#create-docker-volumes)
  - [Nginx, Let's Encrypt, HTTPS](#nginx-lets-encrypt-https)
  - [Environment variables](#environment-variables)
  - [Docker compose](#docker-compose)

## Naklonovanie repozitára

Prvým krokom k nasadeniu projektu Plankweb je získanie repozitára pomocou nástroja `git`.



## Tvorba .env súboru

Po naklonovaní repozitára odporúčame vytvoriť `.env` súbor a umiestniť ho do rovnakého
folderu ako `docker-compose.yml`. Projekt je navrhnutý tak, aby fungoval aj bez
`.env` súboru, **ALE** využívajú sa defaultné hodnoty.

## Príprava prostredia docker

Plankweb používa Docker, takže ďalším krokom by mala byť príprava Dockeru.
[Manual](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)

## Create docker volumes

[Manual](https://docs.docker.com/reference/cli/docker/volume/create/)

## Nginx, Let's Encrypt, HTTPS

Abc

## Environment variables

The project is designed to work without any environment variable. **BUT**, it is not recommended
since default values for username and password are used. The recommended way is to create `.env`
file and place it to the directory where `docker-compose.yml` is located.
The environment variables the project uses:

| Environment Variable  | Description | Default value  |
|-----------------------|-|----------------|
| COMPOSE_PROJECT_NAME  | | plankweb       |
| PLANKWEB_TIMEZONE     | | Europe/Prague  |
| PLANKWEB_CELERY_NAME  | | plankweb_tasks |
| PLANKWEB_DEFAULT_UID  | | 1453           |
| PLANKWEB_DEFAULT_GID  | | 1453           |
| PLANKWEB_SERVICE_USER | | guest          |
| PLANKWEB_SERVICE_PASS | | guest          |

If you need an inspiration, look at `.env.example`

## Docker compose
