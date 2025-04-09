FROM rabbitmq:4.0.6-management

COPY --chown=rabbitmq:rabbitmq ./rabbitmq/ /etc/rabbitmq/

RUN rabbitmq-plugins enable rabbitmq_prometheus