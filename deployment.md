# How to deploy Plankweb

To successfully deploy Plankweb project, please follow these steps:

1. Create external docker volumes - TODO: How?
2. Create `.env` file and put it to the directory where `docker-compose.override.yml` is. Plankweb works also without the .env file but uses default usernames and passwords which is a big security threat. The `.env` file should contain:
   - COMPOSE_PROJECT_NAME
   - PLANKWEB_CELERY_NAME
   - PLANKWEB_DEFAULT_UID
   - PLANKWEB_DEFAULT_GID
   - PLANKWEB_SERVICE_USER
   - PLANKWEB_SERVICE_PASS
  
    The first two environment varibles are not that crucial but the rest should be defined. If you need an inspiration, you can check `.env.example` file located in this directory.
3. run `docker compose up -d` from the directory where `docker-compose.override.yml` is located
