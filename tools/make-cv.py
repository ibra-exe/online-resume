#!/usr/bin/env python3
"""Build files/Ibrahim-Shaheen-CV.pdf from the site's own pages.

Every word in the PDF is read out of experience.html, about.html and projects.html at
build time, so the CV cannot drift from the site: change a bullet on the site, run
this, and the PDF follows. Nothing in here is written fresh.

    python3 tools/make-cv.py

Renders with headless Chrome (already on the machine) rather than a PDF library, so the
output is real selectable text that an ATS can parse, set in the same IBM Plex Sans as
the site. Two A4 pages, single column, standard section names: the layout ATS parsers
and recruiters both expect.
"""
import html
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT_PDF = os.path.join(ROOT, "files", "Ibrahim-Shaheen-CV.pdf")
OUT_HTML = os.path.join(ROOT, "tools", "cv.html")


def read(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return f.read()


def text(fragment):
    """Visible text of an HTML fragment, entities decoded, whitespace collapsed."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def esc(s):
    return html.escape(s, quote=False)


# ---- Experience: employers in page order, each with its roles -------------------
exp = read("experience.html")
employers = []
for block in re.split(r'(?=<div class="company-row">)', exp)[1:]:
    company = text(re.search(r'class="company"[^>]*>(.*?)</h3>', block, re.S).group(1))
    roles = []
    for part in re.split(r'(?=<div class="position")', block)[1:]:
        lead = re.search(r'class="description-lead"[^>]*>(.*?)</p>', part, re.S)
        ul = re.search(r'<ul class="description">(.*?)</ul>', part, re.S)
        roles.append({
            "position": text(re.search(r'class="position"[^>]*>(.*?)</div>', part, re.S).group(1)),
            "period": text(re.search(r'class="period"[^>]*>(.*?)</div>', part, re.S).group(1)),
            "location": text(re.search(r'class="location"[^>]*>(.*?)</div>', part, re.S).group(1)),
            "lead": text(lead.group(1)) if lead else None,
            "bullets": [text(li) for li in re.findall(r"<li[^>]*>(.*?)</li>", ul.group(1), re.S)] if ul else [],
        })
    employers.append({"company": company, "roles": roles})

assert employers and employers[0]["company"] == "NEOM", "expected NEOM first"
assert sum(len(e["roles"]) for e in employers) == 8, "expected 8 roles in total"

# ---- About: credentials and skills ---------------------------------------------
about = read("about.html")


def skill_group(heading):
    """Items under an About heading, read up to the next heading."""
    i = about.index(">" + heading + "</h3>")
    nxt = about.find('<h3 class="skills-heading"', i + 1)
    chunk = about[i: nxt if nxt != -1 else len(about)]
    return [text(x) for x in re.findall(r'<div class="skill-item">(.*?)</div>', chunk, re.S)]


def credential(heading):
    """The two lines under an About credential (title, then detail), kept apart."""
    chunk = re.search(r">%s</h3>(.*?)<h3" % heading, about, re.S).group(1)
    lines = [text(x) for x in re.findall(r"<div[^>]*>([^<]+)</div>", chunk)]
    return [l for l in lines if l]


education = credential("Education")   # [degree, "Tokyo University of Technology · 2014 – 2019"]
award = credential("Awards")          # [award name, "SAP SuccessFactors · November 2024"]
assert len(education) == 2 and len(award) == 2, (education, award)
languages = skill_group("Languages")
capabilities = (skill_group("Digital Transformation &amp; Strategy")
                if ">Digital Transformation &amp; Strategy</h3>" in about
                else skill_group("Digital Transformation & Strategy"))
capabilities += skill_group("HRIS") + skill_group("AI &amp; Automation" if ">AI &amp; Automation</h3>" in about else "AI & Automation")
tools = skill_group("Tools &amp; Platforms" if ">Tools &amp; Platforms</h3>" in about else "Tools & Platforms")

# The About intro, minus its greeting, as the summary.
tw = read("typewriter.js")
about_text = re.search(r'const ABOUT_TEXT = "(.*?)";', tw, re.S).group(1)
summary_paras = [p for p in about_text.split("\\n\\n") if p]
summary = summary_paras[0].replace("Hello! I'm Ibrahim Shaheen (Ibra), a ", "")
summary = summary[0].upper() + summary[1:] + " " + summary_paras[1]

# ---- Projects: the professional section, one line each ------------------------
proj = read("projects.html")
pro = proj.split("Personal Projects")[0]
projects = []
for m in re.finditer(r'<h3 class="project-title"[^>]*>(.*?)</h3>.*?class="project-summary"[^>]*>(.*?)</p>', pro, re.S):
    title = text(m.group(1)).replace(" 🚧", "")
    projects.append((title, text(m.group(2))))

exp_text = " ".join(b for e in employers for r in e["roles"] for b in r["bullets"]).lower()
COVERED_BY = {                       # project -> phrase that proves Experience covers it
    "AI Assistants for HR": "peoplegpt",
    "Digital Transformation Strategy": "digitalization strategy aiming for a 70%",
    "SAP SuccessFactors Org Structure & Automation": "structure within sap successfactors",
    "Robotic Process Automation": "robotic process automation",
}
projects = [(t, d) for t, d in projects
            if not (t in COVERED_BY and COVERED_BY[t] in exp_text)]

# ---- Render --------------------------------------------------------------------
def role_html(r, show_company=None):
    parts = ['<div class="role">']
    parts.append('<div class="role-head"><span class="role-title">%s</span>'
                 '<span class="role-meta">%s · %s</span></div>'
                 % (esc(r["position"]), esc(r["period"]), esc(r["location"])))
    if r["lead"]:
        parts.append('<p class="lead">%s</p>' % esc(r["lead"]))
    if r["bullets"]:
        parts.append("<ul>%s</ul>" % "".join("<li>%s</li>" % esc(b) for b in r["bullets"]))
    parts.append("</div>")
    return "".join(parts)


exp_html = []
for e in employers:
    first = role_html(e["roles"][0]).replace('<div class="role">',
                                             '<div class="role"><h3>%s</h3>' % esc(e["company"]), 1)
    exp_html.append('<div class="employer">%s%s</div>'
                    % (first, "".join(role_html(r) for r in e["roles"][1:])))

doc = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Ibrahim Shaheen - CV</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 12mm 15mm 12mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 9.2pt; line-height: 1.36; color: #1b1b22; }
  .accent { color: #6b2fb3; }
  header { border-bottom: 2px solid #6b2fb3; padding-bottom: 8pt; margin-bottom: 10pt; }
  h1 { font-size: 22pt; font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; }
  .title { font-size: 11pt; font-weight: 500; margin-top: 2pt; }
  .contact { font-size: 8.6pt; color: #4a4a57; margin-top: 5pt; }
  .contact span + span::before { content: "  ·  "; color: #9a9aa8; }
  h2 { font-size: 10.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
       color: #6b2fb3; margin: 9pt 0 4pt; padding-bottom: 2pt; border-bottom: 1px solid #e3d7f3; }
  p.summary { font-size: 9.2pt; }
  .employer { margin-bottom: 5pt; break-inside: auto; }
  .employer h3 { font-size: 10.5pt; font-weight: 600; margin-bottom: 2pt; }
  .role { margin: 0 0 4pt 0; break-inside: avoid; }
  .role-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
  .role-title { font-weight: 600; }
  .role-meta { font-size: 8.6pt; color: #5a5a68; white-space: nowrap; }
  .lead { margin-top: 1pt; font-style: italic; color: #3a3a46; }
  ul { margin: 2pt 0 0 13pt; }
  li { margin-bottom: 1pt; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18pt; }
  .kv { margin-bottom: 4pt; }
  .kv b { font-weight: 600; }
  .proj { margin-bottom: 3pt; }
  .proj b { font-weight: 600; }
</style></head><body>
<header>
  <h1>Ibrahim Shaheen</h1>
  <div class="title">People Technology Senior Specialist, NEOM <span class="accent">·</span> Digital Transformation, AI &amp; HRIS</div>
  <div class="contact"><span>contact@ibra.technology</span><span>+966 50 550 2594</span><span>linkedin.com/in/ibrahim-shaheen</span><span>github.com/ibra-exe</span><span>ibra.technology</span></div>
</header>

<h2>Summary</h2>
<p class="summary">%(summary)s</p>

<h2>Experience</h2>
%(experience)s

<h2>Education &amp; Recognition</h2>
<div class="kv"><b>%(edu_title)s</b>, %(edu_detail)s</div>
<div class="kv"><b>%(award_title)s</b>, %(award_detail)s</div>

<h2>Skills</h2>
<div class="grid">
  <div class="kv"><b>Capabilities:</b> %(capabilities)s</div>
  <div class="kv"><b>Tools &amp; platforms:</b> %(tools)s</div>
</div>
<div class="kv"><b>Languages:</b> %(languages)s</div>

<h2>More Work at NEOM</h2>
%(projects)s
</body></html>
""" % {
    "summary": esc(summary),
    "experience": "".join(exp_html),
    "edu_title": esc(education[0]), "edu_detail": esc(education[1]),
    "award_title": esc(award[0]), "award_detail": esc(award[1]),
    "capabilities": esc(", ".join(capabilities)),
    "tools": esc(", ".join(tools)),
    "languages": esc(", ".join(languages)),
    "projects": "".join('<div class="proj"><b>%s.</b> %s</div>' % (esc(t), esc(s)) for t, s in projects),
}

with open(OUT_HTML, "w", encoding="utf-8") as f:
    f.write(doc)

subprocess.run([
    CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
    "--virtual-time-budget=8000",          # let the web font load before printing
    "--print-to-pdf=" + OUT_PDF,
    "file://" + OUT_HTML,
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print("roles: %d across %d employers" % (sum(len(e["roles"]) for e in employers), len(employers)))
print("capabilities %d, tools %d, languages %d, projects %d"
      % (len(capabilities), len(tools), len(languages), len(projects)))
print("wrote %s (%.1f KB)" % (OUT_PDF, os.path.getsize(OUT_PDF) / 1024))
