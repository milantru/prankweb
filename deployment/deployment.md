# Nasadenie

## Odporúčané požiadavky

**Počet CPU**: 24 \
**Veľkosť RAM**: 32GB \
**Veľkosť disku**: 500GB \
**Operačný systém**: Linux (manuál je písaný pre distribúciu Ubuntu) \
**Doména a verejná IP adresa** (manuál počíta s doménou prankweb2.ksi.projekty.ms.mff.cuni.cz)

## Úvod

Nasadenie projektu **Plankweb** je založené primárne na správnej príprave prostredia. Samotné zostavenie a spustenie aplikácie potom prebieha pomocou príkazu `docker compose` a spustením serveru **Nginx**. Táto príručka obsahuje:

- [Naklonovanie repozitára](#naklonovanie-repozitára)
- [Manuálne nasadenie](#manuálne-nasadenie)
  1. [Príprava prostredia Docker](#príprava-prostredia-docker)
  2. [Tvorba docker volumes](#tvorba-docker-volumes)
  3. [Príprava Nginx a HTTPS](#príprava-nginx-a-https)
  4. [Tvorba .env súboru](#tvorba-env-súboru)
  5. [Spustenie aplikácie](#spustenie-aplikácie)
- [(Polo)automatizované nasadenie](#poloautomatizované-nasadenie)
- [Monitorovanie aplikácie](#monitorovanie-aplikácie)
  - [Príprava tabuliek a grafov na platforme grafana](#príprava-tabuliek-a-grafov-na-platforme-grafana)

## Naklonovanie repozitára

Prvým krokom k nasadeniu projektu je získanie repozitára pomocou nástroja **git**:

```sh
sudo apt-get update
sudo apt-get install -y git
git clone https://github.com/milantru/prankweb.git ~/plankweb
```

Tento skript nainštaluje nástroj **git** a naklonuje repozitár do domovského adresára, konkrétne do adresára *plankweb*.

## Manuálne nasadenie

### Príprava prostredia Docker

Projekt Plankweb je kontajnerizovaný pomocou nástroja **Docker**. Ten možno nainštalovať napríklad podľa oficiálneho [manuálu pre Ubuntu](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository):

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

### Tvorba docker volumes

Po úspešnej inštalácii Dockeru je možné vytvoriť Docker **volumes**, ktoré slúžia na perzistentné ukladanie dát z kontajnerov. Pre správne fungovanie Plankwebu je potrebné vytvoriť nasledujúce volumes:

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

### Príprava Nginx a HTTPS

Okrem Docker aplikácie je súčasťou nasadenia aj Nginx server, ktorý umožňuje šifrované pripojenie cez HTTPS:

```sh
sudo apt-get update
sudo apt-get install nginx
sudo systemctl restart nginx
```

Tento repozitár poskytuje konfiguračný súbor (`deployment/nginx.conf`), ktorý obsahuje nastavenie serveru. Tento súbor je nutné skopírovať do adresára */etc/nginx/*:

```sh
sudo cp ../nginx.conf /etc/nginx/nginx.conf
```

**Poznámka**: Ak je projekt nasadzovaný na doménu inú ako prankweb2.ksi.projekty.ms.mff.cuni.cz, je nutné tento konfiguračný súbor upraviť.


Na využitie HTTPS je nutné získať certifikát. Pre tento účel možno využiť nástroj **certbot**, ktorý využíva certifikáty od certifikačnej autority [*Let's Encrypt*](https://letsencrypt.org/):

```sh
sudo apt-get update
sudo apt-get install certbot
certbot certonly --nginx -d prankweb2.ksi.projekty.ms.mff.cuni.cz
```

Po získaní certifikátu by sa mal spustiť cron job, ktorý každý deň overí platnosť certifikátu. V prípade, že certifikátu skončila platnosť, certbot ho automaticky obnoví:

```sh
CRON_JOB="0 0 * * * certbot renew --nginx --quiet && systemctl restart nginx"
(crontab -l 2>/dev/null | grep -Fv "$CRON_JOB"; echo "$CRON_JOB") | crontab -
```

### Tvorba .env súboru

Do repozitára je nutné pridať `.env` súbor a umiestniť ho do rovnakého adresára ako `docker-compose-plankweb.yml`. Tento súbor by mal obsahovať nasledujúce premenné prostredia:

| Premenná prostredia   | Popis                                         |
|-----------------------|-----------------------------------------------|
| COMPOSE_PROJECT_NAME  | Meno projektu                                 |
| PLANKWEB_TIMEZONE     | Časové pásmo využívané v logovacích správach  |
| PLANKWEB_URL          | Doména projektu                               |
| PLANKWEB_DEFAULT_UID  | Identifikátor užívateľa (UID)                 |
| PLANKWEB_DEFAULT_GID  | Identifikátor skupiny (GID)                   |
| PLANKWEB_SERVICE_USER | Užívateľské meno                              |
| PLANKWEB_SERVICE_PASS | Heslo                                         |

Prvé dve menované premenné prostredia je možné vynechať, avšak v takomto prípade budú využité prednastavené hodnoty: `src` pre meno projektu a `Europe/Prague` pre časové pásmo. \
UID a GID určujú užívateľské a skupinové ID, ktoré sa použijú vo vnútri niekoľkých Docker kontajnerov.
Užívateľské meno a heslo sa využíva pri prístupe k **RabbitMQ** a **Redis** databázam, ako aj k platforme Grafana a iným monitorovacím nástrojom (Flower a Prometheus)

Vzorový príklad pre `.env` súbor s názvom `.env.example` je možné nájsť v rovnakom adresári ako tento dokument.

### Spustenie aplikácie

Po príprave prostredia je možné spustiť príkaz `docker compose`, ktorý zostaví a spustí **Plankweb**:

```sh
pushd ~/plankweb/src
docker compose -f docker-compose-plankweb.yml up -d
popd
```

Poslednou časťou manuálneho nasadenia je spustenie **Nginx** servera:

```sh
sudo systemctl restart nginx
```

## (Polo)automatizované nasadenie

Plankweb má vo svojom repozitári pripravené skripty, ktoré by mali uľahčiť nasadenie. Takéto poloautomatizované nasadenie spočíva v nasledujúcich krokoch:

1. Spustenie skriptu `prepare_environment.sh` (ako *sudo*)
2. [Vytvorenie `.env`](#tvorba-env-súboru)
3. Spustenie skriptu `plankweb_deploy.sh` (ako *sudo*)

## Monitorovanie aplikácie

Okrem samotnej aplikácie, projekt Plankweb ponúka aj monitorovanie metrík na nasledujúcich url:

- https://prankweb2.ksi.projekty.ms.mff.cuni.cz/service/flower (sledovanie **celery** taskov)
- https://prankweb2.ksi.projekty.ms.mff.cuni.cz/service/prometheus (sledovanie stavu exporterov)
- https://prankweb2.ksi.projekty.ms.mff.cuni.cz/service/grafana (vizualizácia metrík a logovacích správ)

Prístup k týmto url je chránený užívateľským menom a heslom špecifikovaným v časti [Tvorba `.env` súboru](#tvorba-env-súboru)
*Exporter* je malý docker kontajner, ktorý zbiera metriky z dôležitého kontajneru aplikácie.

### Príprava tabuliek a grafov na platforme Grafana

Na vizualizáciu metrík a logovacích správ na platforme **Grafana** je nutné pridať dátové zdroje:

- Prometheus pre metriky: http://prometheus:9090
- Loki pre logovacie správy: http://loki:3100

Po pridaní dátových zdrojov je možné importovať tzv. *dashboards*. Dashboard možno importovať napríklad pomocou číselného ID alebo napísaním/prilepením definície dashboardu vo formáte *JSON*. Nasledujúca tabuľka obsahuje zdroje metrík a ID/JSON súbory vhodných dashboardov:

| Zdroj metrík               | ID/JSON |
|----------------------------|---------|
| Celery Backend (Redis)     | 763     |
| Executor HTTP API (Apache) | 3894    |
| Gateway (Nginx)            | 12708   |
| ID Database (Redis)        | 763     |
| Message Broker (RabbitMQ)  | 10991   |
| Logging (Vector + Loki)    | 18042   | 
| Flower                     | <https://github.com/mher/flower/blob/master/examples/celery-monitoring-grafana-dashboard.json> |

Užitočné odkazy:
[Pridanie dátového zdroja](https://grafana.com/docs/grafana/latest/datasources/#add-a-data-source)
[Importovanie dashboardu](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/import-dashboards/)
