"""Inline sprite.html into every page between <!--SPRITE--> ... <!--/SPRITE--> markers."""
import re, pathlib
root = pathlib.Path(__file__).parent
sprite = (root / "sprite.html").read_text().split("\n", 1)[1].strip()
for page in root.glob("*.html"):
    if page.name == "sprite.html":
        continue
    text = page.read_text()
    new = re.sub(r"<!--SPRITE-->.*?<!--/SPRITE-->", lambda m: f"<!--SPRITE-->\n{sprite}\n<!--/SPRITE-->", text, flags=re.S)
    if new != text:
        page.write_text(new)
        print("sprite ->", page.name)
