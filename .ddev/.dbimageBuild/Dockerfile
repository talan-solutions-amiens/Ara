
#ddev-generated - Do not modify this file; your modifications will be overwritten.
ARG BASE_IMAGE="scratch"

### DDEV-injected base Dockerfile contents
FROM $BASE_IMAGE
SHELL ["/bin/bash", "-c"]

ARG TARGETPLATFORM
ARG TARGETARCH
ARG TARGETOS
ARG username
ARG uid
ARG gid
ARG DDEV_PHP_VERSION
ARG DDEV_DATABASE
RUN getent group tty || groupadd tty
RUN (groupadd --gid "$gid" "$username" || groupadd "$username" || true) && \
    (useradd -G tty -l -m -s "/bin/bash" --gid "$username" --comment '' --uid "$uid" "$username" || \
    useradd -G tty -l -m -s "/bin/bash" --gid "$username" --comment '' "$username" || \
    useradd -G tty -l -m -s "/bin/bash" --gid "$gid" --comment '' "$username" || \
    useradd -G tty -l -m -s "/bin/bash" --comment '' "$username")

### DDEV-injected extra content

ENV PATH=$PATH:/usr/lib/postgresql/$PG_MAJOR/bin
ADD healthcheck.sh /

RUN <<EOF
set -eu -o pipefail
source /etc/os-release || true
if [ "${VERSION_CODENAME:-}" = "stretch" ] || [ "${VERSION_CODENAME:-}" = "buster" ]; then
    rm -f /etc/apt/sources.list.d/pgdg.list
    echo "deb http://archive.debian.org/debian/ ${VERSION_CODENAME} main contrib non-free" >/etc/apt/sources.list
    echo "deb http://archive.debian.org/debian-security/ ${VERSION_CODENAME}/updates main contrib non-free" >>/etc/apt/sources.list
    timeout 120 apt-get -qq update -o Acquire::AllowInsecureRepositories=true \
        -o Acquire::AllowDowngradeToInsecureRepositories=true -o APT::Get::AllowUnauthenticated=true || true
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends --no-install-suggests -o APT::Get::AllowUnauthenticated=true \
        debian-archive-keyring apt-transport-https ca-certificates
    echo "deb http://apt-archive.postgresql.org/pub/repos/apt/ ${VERSION_CODENAME}-pgdg-archive main" >/etc/apt/sources.list.d/pgdg.list
fi
EOF

USER "$username"
RUN echo "*:*:db:db:db" > ~/.pgpass && chmod 600 ~/.pgpass
USER root

RUN <<EOF
set -eu -o pipefail
chmod ugo+rx /healthcheck.sh
mkdir -p /etc/postgresql/conf.d
chmod 777 /etc/postgresql/conf.d
chmod 777 /var/tmp
ln -sf /mnt/ddev_config/postgres/postgresql.conf /etc/postgresql

echo "# TYPE DATABASE USER CIDR-ADDRESS  METHOD
host  all         all 0.0.0.0/0 md5
local all         all trust
host  replication db  0.0.0.0/0 trust
host  replication all 0.0.0.0/0 trust
local replication all trust
local replication all peer" >/etc/postgresql/pg_hba.conf

timeout 120 apt-get update || true
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    -o Dpkg::Options::="--force-confold" --no-install-recommends --no-install-suggests \
    apt-transport-https bzip2 ca-certificates less procps pv vim-tiny zstd
update-alternatives --install /usr/bin/vim vim /usr/bin/vim.tiny 10

# Install tzdata-legacy to avoid issues with deprecated timezones
if apt-cache show tzdata-legacy >/dev/null 2>&1; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y -o Dpkg::Options::="--force-confold" tzdata-legacy
fi

# Change directories owned by postgres (and everything inside them)
find / -type d \( -user postgres -o -group postgres \) -exec chown -Rh 1001:1001 {} + 2>/dev/null || true
# Change any remaining individual files owned by postgres
find / -type f \( -user postgres -o -group postgres \) -exec chown -h 1001:1001 {} + 2>/dev/null || true
EOF

