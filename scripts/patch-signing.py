"""Point the generated Android release build at our own keystore (CI only).

Reads the keystore path and passwords from environment variables so no secret
lives in the repository. Run after `expo prebuild`.
"""
import os
import re
import sys

path = 'android/app/build.gradle'
src = open(path).read()

release_cfg = """        release {
            storeFile file(System.getenv('KEYSTORE_PATH'))
            storePassword System.getenv('KEYSTORE_PASSWORD')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEYSTORE_PASSWORD')
        }
"""

# 1. Add a release signing config inside signingConfigs { ... } after debug { ... }.
m = re.search(r"(signingConfigs \{\s*debug \{[^}]*\}\n)", src)
if not m:
    sys.exit('signingConfigs block not found')
src = src[: m.end()] + release_cfg + src[m.end():]

# 2. Make buildTypes.release use it.
m = re.search(r"(release \{\s*(?://[^\n]*\n\s*)*)signingConfig signingConfigs\.debug", src)
if not m:
    sys.exit('release buildType not found')
src = src[: m.start()] + m.group(1) + 'signingConfig signingConfigs.release' + src[m.end():]

open(path, 'w').write(src)
print('Release signing configured')
