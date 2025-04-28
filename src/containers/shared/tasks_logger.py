import logging
import os
from datetime import datetime

import pytz

class PlankwebLogFormatter(logging.Formatter):
    """override logging.Formatter to use correct timezone"""
    def converter(self, timestamp):
        dt = datetime.fromtimestamp(timestamp)
        tzinfo = pytz.timezone(os.getenv('LOGGING_TZ'))
        return tzinfo.localize(dt)
        
    def formatTime(self, record, datefmt=None):
        dt = self.converter(record.created)
        return dt.strftime(datefmt) if datefmt else dt.isoformat()

def create_logger(worker: str) -> logging.Logger:
    logger = logging.getLogger(worker.lower())
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '(%(name)s) %(asctime)s [%(levelname)s] [%(filename)s:%(funcName)s] %(message)s',
        datefmt='%d.%m.%Y %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False  # Prevent duplicate logs from bubbling up
    return logger