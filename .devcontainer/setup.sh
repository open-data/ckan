# Install CKAN locally
python setup.py develop --user

# Create ini file
ckan generate config ckan.ini

# Set up storage
mkdir /workspace/data
ckan config-tool ckan.ini ckan.storage_path=/workspace/data

# Set up site URL
ckan config-tool ckan.ini ckan.site_url=https://$CODESPACE_NAME-5000.$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN

# Set up DataStore + DataPusher
ckan config-tool ckan.ini \
    ckan.datastore.write_url=postgresql://ckan_default:pass@localhost/datastore_default \
    ckan.datastore.read_url=postgresql://datastore_default:pass@localhost/datastore_default \
    ckan.datapusher.url=http://localhost:8800 \
    ckan.plugins=activity datastore datapusher datatables_view
ckan datastore set-permissions | psql $(grep ckan.datastore.write_url ckan.ini | awk '{print $3}')

# Init DB
ckan db init

# Create sysadmin user
ckan user add ckan_admin email=admin@example.com password=test1234
ckan sysadmin add ckan_admin
