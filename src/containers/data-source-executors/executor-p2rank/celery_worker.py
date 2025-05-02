import os
from celery import Celery
import p2rank_executor

celery = Celery(
    os.getenv('CELERY_NAME'),
    broker=os.getenv('CELERY_BROKER_URL')
)

@celery.task(name='ds_p2rank')
def ds_p2rank(id, params):
    p2rank_executor.run_p2rank(id, params)
