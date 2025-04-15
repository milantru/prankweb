import os
from celery import Celery
from conservation import compute_conservation

celery = Celery(
    os.getenv('CELERY_NAME'),
    broker=os.getenv('CELERY_BROKER_URL'),
    backend=os.getenv('CELERY_BACKEND_URL')
)

@celery.task(name='conservation')
def conservation(id):
    compute_conservation(id)
