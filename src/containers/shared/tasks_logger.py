import logging
import os
from datetime import datetime

import pytz

class PlankwebLogFormatter(logging.Formatter):
    """override logging.Formatter to use correct timezone"""
    def converter(self, timestamp):
        dt = datetime.fromtimestamp(timestamp, tz=pytz.utc)
        tzinfo = pytz.timezone(os.getenv('LOGGING_TZ'))
        return dt.astimezone(tzinfo)
        
    def formatTime(self, record, datefmt=None):
        dt = self.converter(record.created)
        return dt.strftime(datefmt) if datefmt else dt.isoformat()

def create_logger(worker: str) -> logging.Logger:
    logger = logging.getLogger(worker.lower())
    
    if not logger.handlers:  # Prevent adding multiple handlers
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        formatter = PlankwebLogFormatter(
            '(%(name)s) %(asctime)s [%(levelname)s] [%(filename)s:%(funcName)s] %(message)s',
            datefmt='%d.%m.%Y %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    logger.propagate = False  # Prevent duplicate logs from bubbling up
    
    return logger