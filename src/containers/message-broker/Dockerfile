FROM rabbitmq:4.1-management-alpine

COPY --chown=rabbitmq:rabbitmq ./rabbitmq/ /etc/rabbitmq/

RUN apk add --no-cache tzdata \
    && rabbitmq-plugins enable rabbitmq_prometheus

# USER rabbitmq