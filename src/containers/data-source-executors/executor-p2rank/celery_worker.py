from celery import Celery
import p2rank_executor

celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')

@celery.task(name='ds_p2rank')
def ds_p2rank(id, use_conservation):
    p2rank_executor.run_p2rank(id, use_conservation)
