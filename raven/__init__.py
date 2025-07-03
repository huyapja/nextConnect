__version__ = "2.5.0"

from raven.raven_integrations.doctype.raven_incoming_webhook.raven_incoming_webhook import (  # noqa
	handle_incoming_webhook as webhook,
)

# Firebase notifications được xử lý qua document hooks (xem hooks.py)
# Không cần auto-patch RavenMessage nữa
