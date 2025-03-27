from celery import Celery
import converter_executor

celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')

@celery.task(name='converter_str_to_seq')
def structure_to_sequence(id):
    converter_executor.run_structure_to_sequence(id)

@celery.task(name='converter_seq_to_str')
def sequence_to_structure(id):
    converter_executor.run_sequence_to_structure(id)