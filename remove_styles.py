import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Remove box-shadow
    content = re.sub(r'box-shadow:\s*[^;]+;', '', content, flags=re.MULTILINE)
    
    # Remove text-fill-color and background-clip for text gradients
    content = re.sub(r'-webkit-background-clip:\s*text;', '', content)
    content = re.sub(r'-webkit-text-fill-color:\s*transparent;', '', content)
    content = re.sub(r'background-clip:\s*text;', '', content)
    
    # Replace linear-gradient with the first color or a fallback color
    def gradient_replacer(match):
        grad_content = match.group(1)
        # find all hex colors or rgba/rgb
        colors = re.findall(r'(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))', grad_content)
        if colors:
            return f"background: {colors[0]};"
        return "background: #1a1535;"
        
    content = re.sub(r'background:\s*linear-gradient\(([^)]+)\);', gradient_replacer, content)

    # Some color adjustments for neon-like texts. Let's look for specific glowing colors if any.
    # The user asked to remove "aspecto neon". This also might include border colors like `rgba(144, 205, 244, 0.3)`.
    # I'll leave borders for now unless they are explicitly glowing (like in box-shadow). The box-shadow removal takes care of the glow.
    
    # Text gradients were using color like #a5b4fc. I'll make sure the text color is set if the gradient was removed.
    # Wait, if I remove `background-clip: text` and replace `background: linear-gradient(90deg, #a5b4fc, #e879f9)` with `background: #a5b4fc`, the text will have a background!
    # I should change `background: #a5b4fc;` to `color: #a5b4fc;` if it was previously a text gradient.
    # But since they were on the same block, let's just do a manual fix for CampaignSelector.vue .modal-title
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    src_dir = 'src'
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.vue') or file.endswith('.css'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
