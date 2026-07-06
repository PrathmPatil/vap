import time
import logging
import requests
from requests.exceptions import HTTPError

logger = logging.getLogger(__name__)


def with_retries(fn, max_retries=5, initial_delay=1, backoff_factor=2, on_429_wait=30):
    """Call fn() with retries on HTTP 429 and other HTTP errors.

    fn should be a callable that performs the request and may raise HTTPError.
    """
    delay = initial_delay
    for attempt in range(1, max_retries + 1):
        try:
            return fn()
        except HTTPError as e:
            status = None
            if hasattr(e, 'response') and e.response is not None:
                status = getattr(e.response, 'status_code', None)

            if status == 429:
                logger.warning(f"HTTP 429 received, attempt {attempt}/{max_retries}. Waiting {on_429_wait}s before retry.")
                time.sleep(on_429_wait)
            else:
                logger.warning(f"HTTP error on attempt {attempt}/{max_retries}: {e}. Retrying in {delay}s.")
                time.sleep(delay)
                delay *= backoff_factor
        except Exception as e:
            logger.warning(f"Non-HTTP error on attempt {attempt}/{max_retries}: {e}. Retrying in {delay}s.")
            time.sleep(delay)
            delay *= backoff_factor

    raise RuntimeError(f"Failed after {max_retries} retries")
