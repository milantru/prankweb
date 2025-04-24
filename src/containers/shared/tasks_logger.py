import logging

def create_logger(task: str) -> logging.Logger:
    logger = logging.getLogger(task.upper())
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] [%(name)s:%(funcName)s] %(message)s',
        datefmt='%d.%m.%Y %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False  # Prevent duplicate logs from bubbling up
    return logger