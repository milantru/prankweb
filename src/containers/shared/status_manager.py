import json
from enum import Enum
from tasks_logger import create_logger

logger = create_logger('status-manager')

class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2


def update_status(status_file_path, id, status: StatusType, infoMessage = "", errorMessage=""):
    logger.info(f'{id} Changing status in {status_file_path} to: {status.name}')
    try:
        with open(status_file_path, "w") as f:
            json.dump({"status": status.value, "infoMessage": infoMessage, "errorMessage": errorMessage}, f)
        logger.info(f'{id} Status changed')
    except Exception as e:
        logger.error(f'{id} Status change failed: {str(e)}')
