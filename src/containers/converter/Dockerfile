FROM python:3.13-slim

# Create user
ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

WORKDIR /app

# Copy Python source code and install needed modules
COPY --chown=user:user . .
RUN pip install --no-cache-dir -r requirements.txt

USER ${UID}:${GID}