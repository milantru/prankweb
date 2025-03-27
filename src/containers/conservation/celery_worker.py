from celery import Celery
from conservation import compute_conservation

celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')

@celery.task(name='ds_p2rank')
def ds_p2rank(id):
    compute_conservation(id)
