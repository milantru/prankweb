FROM rabbitmq:4.0.8-management-alpine

COPY --chown=rabbitmq:rabbitmq ./rabbitmq/ /etc/rabbitmq/

RUN rabbitmq-plugins enable rabbitmq_prometheus