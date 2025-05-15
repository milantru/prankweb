# Nasadenie na virtuálny stroj

## Odporúčané požiadavky

**Počet CPU**: 24 \
**Veľkosť RAM**: 32GB \
**Veľkosť disku**: 500GB \
**Operačný systém**: Linux (manuál je písaný pre distribúciu Ubuntu) \
**Doména a verejná IP adresa** (manuál počíta s doménou prankweb2.ksi.projekty.ms.mff.cuni.cz)

Nasadenie projektu Plankweb je založené primárne na správnej príprave prostredia. Samotné zostavenie a spustenie aplikácie potom prebieha pomocou príkazu `docker compose` a spustením serveru Nginx.

- [Nasadenie na virtuálny stroj](#nasadenie-na-virtuálny-stroj)
  - [Odporúčané požiadavky](#odporúčané-požiadavky)
  - [Naklonovanie repozitára](#naklonovanie-repozitára)
  - [Príprava prostredia Docker](#príprava-prostredia-docker)
  - [Tvorba docker volumes](#tvorba-docker-volumes)
  - [Nginx, HTTPS](#nginx-https)
  - [Tvorba .env súboru](#tvorba-env-súboru)
  - [Samotné nasadenie](#samotné-nasadenie)
  - [(Polo)automatizovaný priebeh nasadenia](#poloautomatizovaný-priebeh-nasadenia)
  - [Príprava monitorovacích tabuliek na platforme Grafana](#príprava-monitorovacích-tabuliek-na-platforme-grafana)

## Naklonovanie repozitára

Prvým krokom k nasadeniu projektu je získanie repozitára pomocou nástroja **git**:

```sh
sudo apt-get update
sudo apt-get install git
git clone https://github.com/milantru/prankweb.git ~/plankweb
```

Tento script nainštaluje nástroj **git** a naklonuje repozitár do domovského adresára, konkrétne do folderu *plankweb*.

## Príprava prostredia Docker

Projekt Plankweb je kontajnerizovaný pomocou nástroja **Docker**. Ten je možné nainštalovať napríklad podľa oficiálneho [manuálu pre Ubuntu](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository):

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

## Tvorba docker volumes

Po úspešnej inštalácii Dockeru je možné vytvoriť Docker **volumes**, ktoré slúžia na perzistentné ukladanie dát z kontajnerov. Pre správne fungovanie Plankwebu je potrebné vytvoriť tieto volumes:

- *plankweb_rabbitmq*
- *plankweb_redis*
- *plankweb_celery*
- *plankweb_foldseek*
- *plankweb_p2rank*
- *plankweb_plm*
- *plankweb_inputs*
- *plankweb_conservation*
- *plankweb_grafana*
- *plankweb_tmp*

Volume je možné vytvoriť napríklad takto:

```sh
docker volume create \
--driver local \
--opt type=none \
--opt device=<path-to-directory> \
--opt o=bind \
plankweb_rabbitmq
```

**UPOZORNENIE**: V prípade nasadenia do OS **Windows** a použití drivera `local`, `docker volume create` nepodporuje možnosti `--opt`.

## Nginx, HTTPS

Inštalácia nginx serveru na VM:

```sh
sudo apt-get update
sudo apt-get install nginx
sudo cp ../nginx.conf /etc/nginx/nginx.conf
```

Na využitie HTTPS je nutné získať certifikát. Pre tento účel využijeme nástroj **certbot**, ktorý využíva certifikáty od certifikačnej autority [*Let's Encrypt*](https://letsencrypt.org/):

```sh
apt-get update
apt-get install certbot
certbot certonly --nginx -d prankweb2.ksi.projekty.ms.mff.cuni.cz
```

Po získaní certfikátu nastavíme cron job, ktorý každý deň overí platnosť certifikátu.
V prípade, že certifikátu skončila platnosť, certbot ho obnoví:

```sh
CRON_JOB="0 0 * * * certbot renew --nginx --quiet"
(crontab -l 2>/dev/null | grep -Fv "$CRON_JOB"; echo "$CRON_JOB") | crontab -
```

## Tvorba .env súboru

Do repozitára je nutné pridať `.env` súbor a umiestniť ho do
rovnakého folderu ako `docker-compose-plankweb.yml`. Tento súbor by mal
obsahovať tieto premenné prostredia:

| Premenná prostredia   | Popis |
|-----------------------|-------|
| COMPOSE_PROJECT_NAME  | Meno projektu                                 |
| PLANKWEB_URL          | Doména projektu                               |
| PLANKWEB_TIMEZONE     | Časové pásmo využívané v logovacích správach  |
| PLANKWEB_DEFAULT_UID  | Identifikátor užívateľa v docker kontajneroch |
| PLANKWEB_DEFAULT_GID  | Identifikátor skupiny v docker kontajneroch   |
| PLANKWEB_SERVICE_USER | Užívateľské meno pre  |
| PLANKWEB_SERVICE_PASS | Heslo pre |

Pre inšpiráciu je možné sa pozrieť na obsah súboru `.env.example`

## Samotné nasadenie

Teraz by malo byť možné spustiť docker compose:

```sh
docker compose -f docker-compose-plankweb.yml up -d
```

a aj server nginx:

```sh
sudo systemctl nginx restart
```

## (Polo)automatizovaný priebeh nasadenia

Plankweb má vo svojom repozitári pripravené scripty, ktoré by mali uľahčiť nasadenie.
Stačí spustiť script prepare_environment.sh, potom vytvoriť .env súbor a ásledne spustiť script plankweb_deploy.sh

## Príprava monitorovacích tabuliek na platforme Grafana

Poslednou, voliteľnou súčasťou nasadenia