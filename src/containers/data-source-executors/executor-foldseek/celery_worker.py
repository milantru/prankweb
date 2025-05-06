#!/usr/bin/env python3

import os
from celery import Celery
import foldseek_executor

celery = Celery(
    os.getenv('CELERY_NAME'),
    broker=os.getenv('CELERY_BROKER_URL')
)

@celery.task(name='ds_foldseek')
def ds_foldseek(id):
    foldseek_executor.run_foldseek(id)
