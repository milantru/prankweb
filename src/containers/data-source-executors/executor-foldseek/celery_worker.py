from celery import Celery
import foldseek_executor

celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')

@celery.task(name='ds_foldseek')
def ds_foldseek(id):
    foldseek_executor.run_foldseek(id)
