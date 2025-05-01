FROM python:3.13-slim

# Create user
ARG UID
ARG GID
RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

WORKDIR /app 

# Copy Python source code and install needed modules
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user:user . .
RUN chmod u+x celery_worker.py

RUN chown -R user:user /app
USER ${UID}:${GID}