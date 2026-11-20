import os
import re

file_path = 'src/App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# VoiceService occurs twice. Remove the second one.
voice_pattern = re.compile(r'// ── VOICE RECOGNITION SERVICE ─────────────────────────────────────────────────.*?}\n}', re.DOTALL)
matches = list(voice_pattern.finditer(content))
if len(matches) > 1:
    # Remove the second match
    m = matches[1]
    content = content[:m.start()] + content[m.end():]

# TeacherAttendView occurs twice. Remove the second one.
teacher_pattern = re.compile(r'function TeacherAttendView.*?return \(\n    <div style={{display:\'flex\',flexDirection:\'column\',gap:14}}>\n.*?</Card>\n            \)\n         }\)}\n      </div>\n    </div>\n  \)\n}\n', re.DOTALL)
matches2 = list(teacher_pattern.finditer(content))
if len(matches2) > 1:
    m = matches2[1]
    content = content[:m.start()] + content[m.end():]
    
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Duplicates removed")
