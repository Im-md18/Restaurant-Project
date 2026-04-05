import os, shutil

FIXES = {
    "menu.html": [
        (
            '<meta charset="UTF-8" />',
            '<meta charset="UTF-8" />\n  <link rel="icon" href="images/flyfire.png" type="image/png" />'
        ),
        (
            'class="openStatusBadge openNowBadge" aria-live="polite">Apent na<',
            'class="openStatusBadge" aria-live="polite">Laster...<'
        ),
        (
            'alt="QR-kode til FireFly nettsiden"',
            'alt="QR-kode til FireFly Restaurant"'
        ),
    ],
    "tilbud.html": [
        (
            '<meta charset="UTF-8" />',
            '<meta charset="UTF-8" />\n  <link rel="icon" href="images/flyfire.png" type="image/png" />'
        ),
        (
            'class="openStatusBadge openNowBadge" aria-live="polite">Apent na<',
            'class="openStatusBadge" aria-live="polite">Laster...<'
        ),
        (
            'alt="QR-kode til min github-profil"',
            'alt="QR-kode til FireFly Restaurant"'
        ),
    ],
}

for filename, patches in FIXES.items():
    if not os.path.exists(filename):
        print("Fant ikke: " + filename)
        continue

    shutil.copy(filename, filename + ".bak")

    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()

    for old, new in patches:
        if old in content:
            content = content.replace(old, new, 1)
            print("OK: " + filename + " - rettet")
        else:
            print("Ikke funnet (allerede rettet?): " + filename)

    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

print("Ferdig!")