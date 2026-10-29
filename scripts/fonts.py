"""Self-host the Google Fonts our pages use, so no visitor's IP goes to Google (EU courts have ruled hotlinking leaks it).
Writes fonts/<name>.css plus the latin .woff2 files they point at (relative URLs, so a client site can load
https://plainlineops.com/fonts/voice-<voice>.css from its own domain; vercel.json allows that). Re-run after
changing a font: python3 scripts/fonts.py. The fonts are OFL-licensed, which allows self-hosting."""
import hashlib, os, re, urllib.request

SETS = {
    "plainline": "family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500",
    # Studio client sites: must match VOICES in studio-engine.js
    "voice-bold": "family=Big+Shoulders+Display:wght@800;900&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500",
    "voice-clean": "family=Schibsted+Grotesk:wght@700;800&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500",
    "voice-warm": "family=Young+Serif:wght@400&family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500",
}
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"}  # woff2
OUT = os.path.join(os.path.dirname(__file__), "..", "fonts")
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()

os.makedirs(OUT, exist_ok=True)
for name, q in SETS.items():
    css = get(f"https://fonts.googleapis.com/css2?{q}&display=swap").decode()
    blocks = re.findall(r"/\* latin \*/\s*(@font-face \{.*?\})", css, re.S)  # latin only: English sites
    assert blocks, f"no latin faces for {name}"
    def local(m):
        url = m.group(1)
        family = re.search(r"font-family: '([^']+)'", m.string).group(1)
        file = re.sub(r"\W+", "-", family.lower()) + "-" + hashlib.sha1(url.encode()).hexdigest()[:8] + ".woff2"
        path = os.path.join(OUT, file)
        if not os.path.exists(path):
            open(path, "wb").write(get(url))
        return f"url({file})"
    faces = [re.sub(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", local, b) for b in blocks]
    open(os.path.join(OUT, name + ".css"), "w").write("\n".join(faces) + "\n")
    print(name, len(faces), "faces")
