import click
import frappe
import os
import subprocess
import sys
from frappe.commands import pass_context


def setup_firebase_worker_auto():
	"""
	Auto setup Firebase worker (được gọi từ after_install hook)
	"""
	try:
		print("🔥 Auto-setting up Firebase worker...")
		
		# Kiểm tra xem có cần setup worker không
		if not _should_setup_worker_silent():
			print("⚠️  Firebase worker setup skipped (not configured or not needed)")
			return
		
		# Setup worker cho production
		if _is_production():
			_setup_production_worker_silent()
		else:
			_setup_development_worker_silent()
			
		print("✅ Firebase worker auto-setup completed!")
		
	except Exception as e:
		print(f"⚠️  Firebase worker auto-setup warning: {str(e)}")
		# Không raise error để không làm fail quá trình install


@click.command('setup-firebase-worker')
@pass_context
def setup_firebase_worker(context):
	"""
	Thiết lập Firebase worker tự động khi bench build
	"""
	try:
		click.echo("🔥 Setting up Firebase worker...")
		
		# Kiểm tra xem có cần setup worker không
		if not _should_setup_worker():
			click.echo("⚠️  Firebase worker already configured or not needed")
			return
		
		# Setup worker cho production
		if _is_production():
			_setup_production_worker()
		else:
			_setup_development_worker()
			
		click.echo("✅ Firebase worker setup completed!")
		
	except Exception as e:
		click.echo(f"❌ Error setting up Firebase worker: {str(e)}")
		sys.exit(1)


def _should_setup_worker():
	"""Kiểm tra xem có cần setup worker không (with output)"""
	try:
		# Kiểm tra xem app raven có được cài đặt không
		if "raven" not in frappe.get_installed_apps():
			return False
			
		# Kiểm tra xem Firebase có được cấu hình không
		from raven.firebase_env import get_firebase_service_account
		firebase_config = get_firebase_service_account()
		
		if not firebase_config.get("project_id"):
			click.echo("⚠️  Firebase not configured. Skipping worker setup.")
			return False
			
		return True
		
	except Exception as e:
		click.echo(f"Warning: Error checking worker setup requirements: {str(e)}")
		return False


def _should_setup_worker_silent():
	"""Kiểm tra xem có cần setup worker không (silent version)"""
	try:
		# Kiểm tra xem app raven có được cài đặt không
		if "raven" not in frappe.get_installed_apps():
			return False
			
		# Kiểm tra xem Firebase có được cấu hình không
		from raven.firebase_env import get_firebase_service_account
		firebase_config = get_firebase_service_account()
		
		if not firebase_config.get("project_id"):
			return False
			
		return True
		
	except Exception as e:
		return False


def _is_production():
	"""Kiểm tra xem có phải production environment không"""
	# Kiểm tra các biến môi trường production
	return (
		os.getenv("FRAPPE_ENV") == "production" or
		os.getenv("DEPLOYMENT_ENV") == "production" or
		os.path.exists("/.dockerenv") or  # Docker container
		"supervisor" in str(subprocess.run(["which", "supervisorctl"], capture_output=True, text=True))
	)


def _setup_production_worker():
	"""Setup worker cho production sử dụng supervisor"""
	try:
		click.echo("🚀 Setting up production worker with supervisor...")
		
		# Tạo supervisor config cho Firebase worker
		supervisor_config = _generate_supervisor_config()
		
		# Ghi config file
		config_path = "/etc/supervisor/conf.d/frappe-firebase-worker.conf"
		try:
			with open(config_path, 'w') as f:
				f.write(supervisor_config)
			click.echo(f"✅ Supervisor config written to {config_path}")
		except PermissionError:
			# Fallback: ghi vào local directory
			local_config_path = "./frappe-firebase-worker.conf"
			with open(local_config_path, 'w') as f:
				f.write(supervisor_config)
			click.echo(f"⚠️  Wrote config to {local_config_path} (copy to /etc/supervisor/conf.d/ manually)")
		
		# Reload supervisor
		try:
			subprocess.run(["sudo", "supervisorctl", "reread"], check=True, capture_output=True)
			subprocess.run(["sudo", "supervisorctl", "update"], check=True, capture_output=True)
			click.echo("✅ Supervisor reloaded")
		except (subprocess.CalledProcessError, FileNotFoundError):
			click.echo("⚠️  Please reload supervisor manually: sudo supervisorctl reread && sudo supervisorctl update")
			
	except Exception as e:
		click.echo(f"❌ Error setting up production worker: {str(e)}")
		raise


def _setup_production_worker_silent():
	"""Setup worker cho production sử dụng supervisor (silent version)"""
	try:
		print("🚀 Setting up production worker with supervisor...")
		
		# Tạo supervisor config cho Firebase worker
		supervisor_config = _generate_supervisor_config()
		
		# Ghi config file
		config_path = "/etc/supervisor/conf.d/frappe-firebase-worker.conf"
		try:
			with open(config_path, 'w') as f:
				f.write(supervisor_config)
			print(f"✅ Supervisor config written to {config_path}")
		except PermissionError:
			# Fallback: ghi vào local directory
			local_config_path = "./frappe-firebase-worker.conf"
			with open(local_config_path, 'w') as f:
				f.write(supervisor_config)
			print(f"⚠️  Wrote config to {local_config_path} (copy to /etc/supervisor/conf.d/ manually)")
		
		# Reload supervisor
		try:
			subprocess.run(["sudo", "supervisorctl", "reread"], check=True, capture_output=True)
			subprocess.run(["sudo", "supervisorctl", "update"], check=True, capture_output=True)
			print("✅ Supervisor reloaded")
		except (subprocess.CalledProcessError, FileNotFoundError):
			print("⚠️  Please reload supervisor manually: sudo supervisorctl reread && sudo supervisorctl update")
			
	except Exception as e:
		print(f"❌ Error setting up production worker: {str(e)}")
		raise


def _setup_development_worker():
	"""Setup worker cho development"""
	try:
		click.echo("💻 Setting up development worker...")
		
		# Kiểm tra Procfile
		procfile_path = "./Procfile"
		if os.path.exists(procfile_path):
			with open(procfile_path, 'r') as f:
				content = f.read()
			
			# Kiểm tra xem worker đã có chưa
			if "worker:" in content and "bench worker" in content:
				click.echo("✅ Worker already configured in Procfile")
			else:
				click.echo("⚠️  Please ensure Procfile has worker configuration:")
				click.echo("worker: bench worker 1>> logs/worker.log 2>> logs/worker.error.log")
		
		# Hướng dẫn chạy worker manual
		click.echo("\n🔧 To start Firebase worker in development:")
		click.echo("bench worker --queue default")
		click.echo("# OR")
		click.echo("honcho start worker  # if using Procfile")
		
	except Exception as e:
		click.echo(f"❌ Error setting up development worker: {str(e)}")
		raise


def _setup_development_worker_silent():
	"""Setup worker cho development (silent version)"""
	try:
		print("💻 Setting up development worker...")
		
		# Kiểm tra Procfile
		procfile_path = "./Procfile"
		if os.path.exists(procfile_path):
			with open(procfile_path, 'r') as f:
				content = f.read()
			
			# Kiểm tra xem worker đã có chưa
			if "worker:" in content and "bench worker" in content:
				print("✅ Worker already configured in Procfile")
			else:
				print("⚠️  Please ensure Procfile has worker configuration:")
				print("worker: bench worker 1>> logs/worker.log 2>> logs/worker.error.log")
		
		# Hướng dẫn chạy worker manual
		print("\n🔧 To start Firebase worker in development:")
		print("bench worker --queue default")
		print("# OR")
		print("honcho start worker  # if using Procfile")
		
	except Exception as e:
		print(f"❌ Error setting up development worker: {str(e)}")
		raise


def _generate_supervisor_config():
	"""Tạo supervisor config cho Firebase worker"""
	current_path = os.getcwd()
	bench_path = current_path if "frappe-bench" in current_path else os.path.dirname(current_path)
	
	config = f"""[program:frappe-firebase-worker]
command={bench_path}/env/bin/bench worker --queue default
directory={bench_path}
autostart=true
autorestart=true
stderr_logfile={bench_path}/logs/firebase-worker.error.log
stdout_logfile={bench_path}/logs/firebase-worker.log
user={os.getenv('USER', 'frappe')}
stopwaitsecs=300
killasgroup=true
stopasgroup=true

[program:frappe-firebase-worker-long]
command={bench_path}/env/bin/bench worker --queue long
directory={bench_path}
autostart=true
autorestart=true
stderr_logfile={bench_path}/logs/firebase-worker-long.error.log
stdout_logfile={bench_path}/logs/firebase-worker-long.log
user={os.getenv('USER', 'frappe')}
stopwaitsecs=600
killasgroup=true
stopasgroup=true
"""
	return config


@click.command('test-firebase-worker')
@pass_context
def test_firebase_worker(context):
	"""
	Test Firebase worker hoạt động
	"""
	try:
		click.echo("🧪 Testing Firebase worker...")
		
		# Import test function
		from raven.firebase_hooks import test_firebase_worker
		result = test_firebase_worker()
		
		if result.get("status") == "success":
			click.echo("✅ Firebase worker test job enqueued successfully!")
			click.echo("Check worker logs to verify execution.")
		else:
			click.echo(f"❌ Test failed: {result.get('message')}")
			
	except Exception as e:
		click.echo(f"❌ Error testing Firebase worker: {str(e)}")
		sys.exit(1)


# Register commands với Frappe
commands = [setup_firebase_worker, test_firebase_worker] 