FROM python:3.13-slim

# Create user
ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

RUN apt-get update

WORKDIR /app

# Copy Python source code and install needed modules
COPY --chown=user:user ./shared/install-requirements.sh ./id-provider/requirements.in ./
RUN chmod +x install-requirements.sh \
    && ./install-requirements.sh \
    && rm install-requirements.sh

COPY --chown=user:user ./id-provider/ .

RUN chown user:user /app
USER ${UID}:${GID}