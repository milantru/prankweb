#!/usr/bin/env python3

import os
from celery import Celery
import executor

celery = Celery(
    os.getenv('CELERY_NAME'),
    broker=os.getenv('CELERY_BROKER_URL')
)

@celery.task(name='ds_plm')
def ds_plm(id):
    executor.run_plm(id)
    