# Commands module for Raven 
import click
from .setup_worker import setup_firebase_worker, test_firebase_worker

# Register với Frappe CLI
commands = [
    setup_firebase_worker,
    test_firebase_worker
] 