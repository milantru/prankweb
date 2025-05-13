# How to deploy Plankweb

## Requirements

**CPUs**: 24
**RAM**: 32GB
**Storage**: ???
**OS**: Linux distribution (this manual will assume it's Ubuntu)

To successfully deploy Plankweb project, please follow these steps:

- [How to deploy Plankweb](#how-to-deploy-plankweb)
  - [Requirements](#requirements)
  - [Prepare docker environment](#prepare-docker-environment)
  - [Create docker volumes](#create-docker-volumes)
  - [Nginx, Let's Encrypt, HTTPS](#nginx-lets-encrypt-https)
  - [Environment variables](#environment-variables)
  - [Docker compose](#docker-compose)

## Prepare docker environment

Plankweb project uses Docker, so installing docker should be the first step to deploy the project.
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
