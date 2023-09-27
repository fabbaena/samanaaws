FROM ubuntu:jammy
RUN <<EOF
apt update && apt upgrade -y
apt install -y python3-venv python3-pip apache2 libapache2-mod-wsgi-py3
cd /opt
python3 -m venv SamanaAws
. /opt/SamanaAws/bin/activate
python3 -m pip install boto3 flask
echo "export SAMANAAWS_PATH=/usr/src" >> /etc/apache2/envvars
echo "export AWS_SHARED_CREDENTIALS_FILE=/opt/SamanaAws/credentials" >> /etc/apache2/envvars
EOF
COPY support/apache2/samanaaws.conf /etc/apache2/sites-available
RUN a2ensite samanaaws
RUN a2dissite 000-default
