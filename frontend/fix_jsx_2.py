import re

with open('src/components/LandingPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I want to extract the innerHTML of `styleId` (custom styles) and just render it using a <style> tag directly in JSX to be safe and clean.
style_content = """        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
        }
        .glass-card {
            background: rgba(15, 25, 48, 0.4);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(64, 72, 93, 0.15);
        }
        .text-gradient {
            background: linear-gradient(135deg, #69f6b8 0%, #06b77f 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .hero-bg {
            background: radial-gradient(circle at top right, rgba(105, 246, 184, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at bottom left, rgba(6, 183, 127, 0.05) 0%, transparent 50%);
        }"""

# Use regex to strip the useEffect
new_content = re.sub(r'useEffect\(\(\) => \{.+?\}, \[\]\);', '', content, flags=re.DOTALL)

# Add the style block right after the opening div
style_jsx = f"<style>{{`\n{style_content}\n`}}</style>"
new_content = new_content.replace(
    '<div className="bg-background text-on-background font-body selection:bg-primary selection:text-on-primary-container">',
    f'<div className="bg-background text-on-background font-body selection:bg-primary selection:text-on-primary-container">\n      {style_jsx}'
)

# remove the unused useEffect import
new_content = new_content.replace('import React, { useEffect } from \'react\';', 'import React from \'react\';')

with open('src/components/LandingPage.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated JSX!")
