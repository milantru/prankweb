import os
from celery import Celery
import converter_executor

celery = Celery(
    os.getenv('CELERY_NAME'),
    broker=os.getenv('CELERY_BROKER_URL'),
    backend=os.getenv('CELERY_BACKEND_URL')
)

@celery.task(name='converter_str_to_seq')
def structure_to_sequence(id):
    return converter_executor.run_structure_to_sequence(id)

@celery.task(name='converter_seq_to_str')
def sequence_to_structure(id):
    return converter_executor.run_sequence_to_structure(id)