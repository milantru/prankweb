from celery import Celery
from conservation import compute_conservation

celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')

@celery.task(name='conservation')
def conservation(id):
    compute_conservation(id)
